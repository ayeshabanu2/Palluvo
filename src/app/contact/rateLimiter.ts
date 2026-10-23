import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const CONTACT_FIELD_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  PHONE_MAX: 25,
  SUBJECT_MAX: 150,
  MESSAGE_MIN: 5,
  MESSAGE_MAX: 3000,
} as const;

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 10 * 60 * 1000, // 10 minutes sliding window
  MAX_PER_WINDOW: 5,
  COOLDOWN_MS: 5 * 1000, // 5 seconds minimum between consecutive requests
  MAX_STORE_SIZE: 1000, // Bounded capacity limit to prevent memory/storage exhaustion
} as const;

/**
 * Admission limit configuration for pre-RPC application-boundary filtering.
 *
 * NOTE ON DEPLOYMENT ARCHITECTURE:
 * - Single Persistent Host / Worker Cluster: When deployed on a single persistent VM, Docker
 *   container, or Node.js cluster, `CrossProcessAdmissionStore` uses atomic file locking in
 *   `os.tmpdir()` to share `MAX_GLOBAL_ADMISSIONS` (120/min) and IP quotas across worker threads
 *   and processes.
 * - Multi-Instance Serverless (e.g., Vercel Functions): Serverless function instances run in
 *   isolated containers where `os.tmpdir()` is instance-local. In serverless environments, this
 *   pre-RPC gate protects individual function instances from burst saturation, while authoritative
 *   global multi-instance flood protection across all instances is enforced downstream by the
 *   centralized Supabase database RPC (`consume_contact_rate_limit`) which shares the global
 *   120/min admission window across all instances via PostgreSQL row locks.
 */
export const ADMISSION_LIMIT_CONFIG = {
  WINDOW_MS: 60 * 1000, // 1 minute sliding window
  MAX_ADMISSIONS_PER_IP: 15, // Max 15 submissions per minute per IP admission limit
  MAX_GLOBAL_ADMISSIONS: 120, // Max 120 submissions per minute globally across all IPs (WAF/flood protection)
  MAX_MAP_SIZE: 1000, // Strict bound to prevent unbound memory growth from rotating IPs
} as const;

interface AdmissionRecord {
  timestamps: number[];
  lastUpdated: number;
}

interface SharedAdmissionData {
  epoch?: number;
  globalTimestamps: number[];
  ipRecords: Record<string, AdmissionRecord>;
}

/**
 * Checks if any open file descriptor in the current process (including worker threads)
 * currently holds an open file handle referencing the specified file path.
 */
export function hasOpenFileDescriptor(filePath: string): boolean {
  try {
    const fileStat = fs.statSync(filePath);
    for (let fd = 3; fd < 1024; fd++) {
      try {
        const fdStat = fs.fstatSync(fd);
        if (fdStat.ino === fileStat.ino && fdStat.dev === fileStat.dev) {
          return true;
        }
      } catch (err: any) {
        if (err && err.code === 'EBADF') continue;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Checks whether an operating system process ID is still alive and running.
 */
export function isProcessAlive(pid: number): boolean {
  if (typeof pid !== 'number' || isNaN(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    return err && err.code === 'EPERM';
  }
}

/**
 * Checks whether the owner of a lock file is still actively alive.
 * Returns true if:
 * 1. An open file descriptor in the current process or any worker thread holds the file.
 * 2. Or the lock metadata records an active, running OS process PID.
 */
export function isLockOwnerAlive(lockFilePath: string): boolean {
  if (hasOpenFileDescriptor(lockFilePath)) {
    return true;
  }
  try {
    if (fs.existsSync(lockFilePath)) {
      const stat = fs.statSync(lockFilePath);
      const content = fs.readFileSync(lockFilePath, 'utf8').trim();
      if (content.length > 0) {
        let pid: number | null = null;
        try {
          const parsed = JSON.parse(content);
          if (typeof parsed?.pid === 'number') pid = parsed.pid;
        } catch {
          const match = content.match(/(\d+)/);
          if (match) pid = parseInt(match[1], 10);
        }
        if (pid !== null && isProcessAlive(pid)) {
          return true;
        }
        // If pid is not yet parseable but file was modified within the recent create-to-metadata gap (< 2000ms)
        if (pid === null && Date.now() - stat.mtimeMs < 2000) {
          return true;
        }
      } else {
        // Safe create-to-metadata gap:
        // A newly created (0-byte) lock file whose mtime is recent (within 2000ms) indicates
        // that another process is actively between openSync('wx') and writeFileSync.
        // It must NOT be treated as dead/abandoned while within this window.
        if (Date.now() - stat.mtimeMs < 2000) {
          return true;
        }
      }
    }
  } catch {}
  return false;
}

/**
 * Strictly fences a held takeover lock descriptor:
 * 1. Verifies that the file descriptor `takeoverFd` is still linked to the filesystem (nlink > 0).
 * 2. Verifies that `takeoverMutexPath` exists on disk.
 * 3. Inode/device fencing: verifies that the pathname on disk points to the exact inode and device created by takeoverFd.
 * 4. Ownership fencing: verifies that on-disk metadata matches `expectedOwnerId` and the current process PID.
 */
export function isTakeoverFenceValid(
  takeoverFd: number | null,
  takeoverMutexPath: string,
  expectedOwnerId: string
): boolean {
  if (takeoverFd === null || typeof takeoverFd !== 'number') return false;
  try {
    const tFdStat = fs.fstatSync(takeoverFd);
    if (typeof tFdStat.nlink === 'number' && tFdStat.nlink === 0) {
      return false;
    }
    if (!fs.existsSync(takeoverMutexPath)) {
      return false;
    }
    const tPathStat = fs.statSync(takeoverMutexPath);
    if (tFdStat.ino !== tPathStat.ino || tFdStat.dev !== tPathStat.dev) {
      return false;
    }
    const content = fs.readFileSync(takeoverMutexPath, 'utf8').trim();
    if (content.length === 0) {
      return false;
    }
    const meta = JSON.parse(content);
    if (meta?.ownerId !== expectedOwnerId || meta?.pid !== process.pid) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Unlinks a file ONLY if the directory entry at `filePath` matches the exact inode and device
 * of the open descriptor `fd`, and the descriptor has not already been unlinked (`nlink > 0`).
 * Does not inspect or require valid JSON metadata, allowing safe cleanup of partially-written
 * or corrupted files without leaving abandoned mutexes on disk.
 *
 * Employs a serialized/atomic cleanup strategy under `acquireStaleReclaimMutex` to guarantee
 * mutual exclusion against competing stale-mutex reclaimers, and strictly revalidates directory
 * entry inode equality at unlink time immediately prior to calling `unlinkSync`.
 * If a competing reclaimer or test interleaving replaces the file, the replacement is preserved.
 *
 * Must be executed before closing `fd`.
 */
export function unlinkDescriptorInode(
  filePath: string,
  fd: number | null,
  onBeforeUnlink?: () => void
): boolean {
  if (fd === null || typeof fd !== 'number') return false;
  try {
    const fdStat = fs.fstatSync(fd);
    if (typeof fdStat.nlink === 'number' && fdStat.nlink === 0) {
      return false;
    }
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const cleanupReclaimId = crypto.randomUUID();
    const reclaim = acquireStaleReclaimMutex(filePath, cleanupReclaimId);
    if (!reclaim.won) {
      return false;
    }

    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }
      const pathStat = fs.statSync(filePath);
      if (fdStat.ino !== pathStat.ino || fdStat.dev !== pathStat.dev) {
        return false;
      }

      // Optional hook for test interleaving / pause simulation immediately before unlink
      if (onBeforeUnlink) {
        try { onBeforeUnlink(); } catch {}
      }

      // Pre-unlink re-verification: strictly revalidate that directory entry matches
      // the verified descriptor inode at unlink time
      if (!fs.existsSync(filePath)) {
        return false;
      }
      const preUnlinkStat = fs.statSync(filePath);
      if (fdStat.ino !== preUnlinkStat.ino || fdStat.dev !== preUnlinkStat.dev) {
        return false;
      }

      fs.unlinkSync(filePath);
      return true;
    } finally {
      reclaim.cleanup();
    }
  } catch {
    return false;
  }
}

/**
 * Safely unlinks a lock or mutex file ONLY if the file currently on disk at `filePath`
 * matches the exact inode and device of the open file descriptor `fd` created by this call,
 * and (if metadata was written) matches `expectedOwnerId`.
 *
 * Runs under the takeover/reclaim serialization protocol (`${filePath}.takeover`) to ensure
 * that the inode verification and the unlink are completely serialized with respect to any
 * concurrent reclaimer attempting `atomicTakeoverStaleLock`.
 *
 * Strictly fences the takeover descriptor before touching `filePath` and re-verifies directory
 * entry inode immediately before calling `unlinkSync` so that the pathname unlink is strictly
 * conditional on the verified inode. If a competitor or test interleaving replaces the file,
 * the replacement lock is NEVER deleted.
 *
 * Must be invoked BEFORE closing `fd` so `fs.fstatSync(fd)` is valid.
 */
export function unlinkIfSameInode(
  filePath: string,
  fd: number | null,
  expectedOwnerId?: string,
  onBeforeUnlink?: () => void,
  onAfterTakeoverOpen?: () => void
): boolean {
  if (fd === null || typeof fd !== 'number') return false;
  try {
    const fdStat = fs.fstatSync(fd);
    // If nlink is 0, the file was already unlinked or replaced in the directory
    if (typeof fdStat.nlink === 'number' && fdStat.nlink === 0) {
      return false;
    }
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const isTakeoverProtected =
      !filePath.endsWith('.takeover') && !filePath.includes('.reclaim_dir');
    const takeoverMutexPath = `${filePath}.takeover`;
    const cleanupTakeoverId = expectedOwnerId || crypto.randomUUID();
    let takeoverFd: number | null = null;

    if (isTakeoverProtected) {
      const startAcquire = Date.now();
      while (takeoverFd === null && Date.now() - startAcquire < 2000) {
        try {
          takeoverFd = fs.openSync(takeoverMutexPath, 'wx');
          if (onAfterTakeoverOpen) {
            try { onAfterTakeoverOpen(); } catch {}
          }
          try {
            fs.writeFileSync(
              takeoverFd,
              JSON.stringify({ pid: process.pid, ownerId: cleanupTakeoverId, createdAt: Date.now() }),
              'utf8'
            );
          } catch (wErr) {
            try {
              unlinkDescriptorInode(takeoverMutexPath, takeoverFd);
            } catch {}
            try { fs.closeSync(takeoverFd); } catch {}
            takeoverFd = null;
            throw wErr;
          }

          // Strict descriptor/link/owner fencing check immediately after write
          if (!isTakeoverFenceValid(takeoverFd, takeoverMutexPath, cleanupTakeoverId)) {
            try { fs.closeSync(takeoverFd); } catch {}
            takeoverFd = null;
            // Active takeover was reclaimed or lost across the create-to-metadata gap;
            // abort immediately without touching target lock file
            return false;
          }
        } catch (err: any) {
          if (err && (err.code === 'EEXIST' || err.code === 'EPERM' || err.code === 'EBUSY')) {
            try {
              if (fs.existsSync(takeoverMutexPath)) {
                const tStat = fs.statSync(takeoverMutexPath);
                if (Date.now() - tStat.mtimeMs > 2000 && !isLockOwnerAlive(takeoverMutexPath)) {
                  const reclaim = acquireStaleReclaimMutex(takeoverMutexPath, cleanupTakeoverId);
                  if (reclaim.won) {
                    try {
                      if (fs.existsSync(takeoverMutexPath) && !isLockOwnerAlive(takeoverMutexPath)) {
                        fs.unlinkSync(takeoverMutexPath);
                      }
                    } finally {
                      reclaim.cleanup();
                    }
                  }
                }
              }
            } catch {}
            const pause = Date.now() + 5;
            while (Date.now() < pause) {}
          } else {
            break;
          }
        }
      }

      if (takeoverFd === null) {
        // Active takeover is held by another live process; do not unlink target lock
        return false;
      }
    }

    try {
      // Strict takeover fencing: verify takeover mutex descriptor and on-disk ownership before touching filePath
      if (isTakeoverProtected && !isTakeoverFenceValid(takeoverFd, takeoverMutexPath, cleanupTakeoverId)) {
        return false;
      }

      if (!fs.existsSync(filePath)) {
        return false;
      }
      const pathStat = fs.statSync(filePath);
      // Inode/device fencing: strictly verify the directory entry is the exact file created by fd
      if (fdStat.ino !== pathStat.ino || fdStat.dev !== pathStat.dev) {
        return false;
      }
      // Ownership fencing: if expectedOwnerId is provided and disk file contains readable metadata,
      // verify that ownerId matches
      if (expectedOwnerId) {
        try {
          const content = fs.readFileSync(filePath, 'utf8').trim();
          if (content.length > 0) {
            const meta = JSON.parse(content);
            if (meta?.ownerId && meta.ownerId !== expectedOwnerId) {
              return false;
            }
          }
        } catch {}
      }

      // Optional hook for multiprocess test interleaving / pause simulation
      if (onBeforeUnlink) {
        onBeforeUnlink();
      }

      // Pre-unlink re-verification: strictly ensure that directory entry still points
      // to the exact verified descriptor inode before invoking pathname unlink
      if (!fs.existsSync(filePath)) {
        return false;
      }
      const preUnlinkStat = fs.statSync(filePath);
      if (fdStat.ino !== preUnlinkStat.ino || fdStat.dev !== preUnlinkStat.dev) {
        return false;
      }

      // Re-verify takeover fence immediately before calling unlink
      if (isTakeoverProtected && !isTakeoverFenceValid(takeoverFd, takeoverMutexPath, cleanupTakeoverId)) {
        return false;
      }

      fs.unlinkSync(filePath);
      return true;
    } finally {
      if (takeoverFd !== null) {
        try {
          if (isTakeoverFenceValid(takeoverFd, takeoverMutexPath, cleanupTakeoverId)) {
            fs.unlinkSync(takeoverMutexPath);
          }
        } catch {}
        try { fs.closeSync(takeoverFd); } catch {}
        takeoverFd = null;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Atomically acquires exclusive reclamation rights for a stale lock file.
 * Uses a stable monotonic sequence with atomic OS-level sequence reservation (openSync 'wx')
 * and an exclusive winner token lease.
 * Even if timestamps tie, clocks move backward, or multiple calls execute concurrently,
 * exactly ONE caller is elected winner, ensuring strict linearizability and zero double-election.
 */
export function acquireStaleReclaimMutex(
  lockFilePath: string,
  ownerId: string
): { won: boolean; cleanup: () => void } {
  const reclaimDir = `${lockFilePath}.reclaim_dir`;
  try {
    if (!fs.existsSync(reclaimDir)) {
      fs.mkdirSync(reclaimDir, { recursive: true });
    }
  } catch {}

  // 1. Allocate a strictly unique, monotonically increasing sequence number using atomic openSync('wx')
  let mySeq = 1;
  let myTicketPath = '';
  let myTicketFd: number | null = null;

  try {
    const existing = fs.readdirSync(reclaimDir).filter((f) => f.startsWith('seq_') && f.endsWith('.ticket'));
    const seqs = existing
      .map((f) => {
        const match = f.match(/^seq_(\d+)_/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n) && n > 0);

    let candidate = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
    while (myTicketFd === null) {
      const ticketName = `seq_${String(candidate).padStart(12, '0')}_${ownerId}.ticket`;
      const ticketPath = path.join(reclaimDir, ticketName);
      try {
        myTicketFd = fs.openSync(ticketPath, 'wx');
        try {
          fs.writeFileSync(
            myTicketFd,
            JSON.stringify({ seq: candidate, pid: process.pid, ownerId, createdAt: Date.now() }),
            'utf8'
          );
          mySeq = candidate;
          myTicketPath = ticketPath;
        } catch (writeErr) {
          unlinkIfSameInode(ticketPath, myTicketFd, ownerId);
          try { fs.closeSync(myTicketFd); } catch {}
          myTicketFd = null;
          throw writeErr;
        }
      } catch (err: any) {
        if (myTicketFd !== null) {
          try { fs.closeSync(myTicketFd); } catch {}
          myTicketFd = null;
        }
        if (err && (err.code === 'EEXIST' || err.code === 'EPERM' || err.code === 'EBUSY')) {
          candidate++;
        } else {
          return { won: false, cleanup: () => {} };
        }
      }
    }
  } catch {
    return { won: false, cleanup: () => {} };
  }

  const cleanup = () => {
    if (myTicketFd !== null) {
      try { fs.closeSync(myTicketFd); } catch {}
      myTicketFd = null;
    }
    try {
      if (myTicketPath && fs.existsSync(myTicketPath)) {
        fs.unlinkSync(myTicketPath);
      }
    } catch {}
  };

  try {
    // 2. Linearizable Winner Election: Check earlier sequence tickets (< mySeq)
    const allFiles = fs.readdirSync(reclaimDir).filter((f) => f.startsWith('seq_') && f.endsWith('.ticket')).sort();

    for (const f of allFiles) {
      const match = f.match(/^seq_(\d+)_/);
      if (!match) continue;
      const fileSeq = parseInt(match[1], 10);
      if (fileSeq >= mySeq) break;

      const fPath = path.join(reclaimDir, f);
      try {
        if (fs.existsSync(fPath)) {
          const content = fs.readFileSync(fPath, 'utf8').trim();
          let meta: any = null;
          let isMalformed = false;
          try {
            meta = JSON.parse(content);
          } catch {
            isMalformed = true;
          }

          if (isMalformed || !meta || typeof meta.pid !== 'number') {
            // Malformed, empty, or unparseable ticket left by a crashed/failed process:
            // Safely recover and remove the orphan ticket so it does not block the queue
            try { fs.unlinkSync(fPath); } catch {}
          } else if (isProcessAlive(meta.pid)) {
            // An earlier ticket belongs to an active process: we did NOT win
            cleanup();
            return { won: false, cleanup: () => {} };
          } else {
            // Earlier ticket is dead: clean up only this specific dead ticket
            try { fs.unlinkSync(fPath); } catch {}
          }
        }
      } catch {
        try { if (fs.existsSync(fPath)) fs.unlinkSync(fPath); } catch {}
      }
    }

    // 3. Re-verify after purging dead and malformed earlier tickets that we are the lowest remaining active sequence
    const remaining = fs.readdirSync(reclaimDir).filter((f) => f.startsWith('seq_') && f.endsWith('.ticket')).sort();
    while (remaining.length > 0) {
      const firstFile = remaining[0];
      const matchFirst = firstFile.match(/^seq_(\d+)_/);
      const firstSeq = matchFirst ? parseInt(matchFirst[1], 10) : -1;
      if (firstSeq >= mySeq) break;

      const fPath = path.join(reclaimDir, firstFile);
      try {
        if (fs.existsSync(fPath)) {
          const content = fs.readFileSync(fPath, 'utf8').trim();
          let meta: any = null;
          try { meta = JSON.parse(content); } catch {}
          if (!meta || typeof meta.pid !== 'number' || !isProcessAlive(meta.pid)) {
            try { fs.unlinkSync(fPath); } catch {}
            remaining.shift();
            continue;
          }
        } else {
          remaining.shift();
          continue;
        }
      } catch {
        try { fs.unlinkSync(fPath); } catch {}
        remaining.shift();
        continue;
      }
      break;
    }

    if (remaining.length > 0) {
      const matchFirst = remaining[0].match(/^seq_(\d+)_/);
      const firstSeq = matchFirst ? parseInt(matchFirst[1], 10) : -1;
      if (firstSeq === mySeq) {
        // 4. Winner lock lease: atomically claim winner token in reclaimDir to make election OS-level exclusive
        const winnerTokenPath = path.join(reclaimDir, 'winner.lock');
        let winnerFd: number | null = null;
        try {
          winnerFd = fs.openSync(winnerTokenPath, 'wx');
          try {
            fs.writeFileSync(
              winnerFd,
              JSON.stringify({ seq: mySeq, pid: process.pid, ownerId, createdAt: Date.now() }),
              'utf8'
            );
          } catch (writeErr) {
            unlinkIfSameInode(winnerTokenPath, winnerFd, ownerId);
            try { fs.closeSync(winnerFd); } catch {}
            winnerFd = null;
            throw writeErr;
          }
        } catch {
          // Check if existing winner.lock belongs to a dead process (> 2s)
          try {
            if (fs.existsSync(winnerTokenPath)) {
              const wStat = fs.statSync(winnerTokenPath);
              if (Date.now() - wStat.mtimeMs > 2000 && !isLockOwnerAlive(winnerTokenPath)) {
                const newWPath = path.join(reclaimDir, `${ownerId}.winner.new`);
                try {
                  const nWfd = fs.openSync(newWPath, 'wx');
                  try {
                    fs.writeFileSync(
                      nWfd,
                      JSON.stringify({ seq: mySeq, pid: process.pid, ownerId, createdAt: Date.now() }),
                      'utf8'
                    );
                    fs.renameSync(newWPath, winnerTokenPath);
                    winnerFd = nWfd;
                  } catch (wErr) {
                    unlinkIfSameInode(newWPath, nWfd, ownerId);
                    try { fs.closeSync(nWfd); } catch {}
                  }
                } catch {
                  try { if (fs.existsSync(newWPath)) fs.unlinkSync(newWPath); } catch {}
                }
              }
            }
          } catch {}
        }

        if (winnerFd !== null) {
          const finalCleanup = () => {
            if (winnerFd !== null) {
              unlinkIfSameInode(winnerTokenPath, winnerFd, ownerId);
              try { fs.closeSync(winnerFd); } catch {}
              winnerFd = null;
            }
            try {
              if (fs.existsSync(winnerTokenPath)) {
                const content = fs.readFileSync(winnerTokenPath, 'utf8');
                try {
                  const meta = JSON.parse(content);
                  if (meta?.ownerId === ownerId) {
                    fs.unlinkSync(winnerTokenPath);
                  }
                } catch {}
              }
            } catch {}
            cleanup();
          };

          return { won: true, cleanup: finalCleanup };
        }
      }
    }

    cleanup();
    return { won: false, cleanup: () => {} };
  } catch {
    cleanup();
    return { won: false, cleanup: () => {} };
  }
}

/**
 * Atomically takes over a stale lock file against competing recoverers.
 * Guarantees that even if two recoverers both validated a dead lock and paused after their stale check,
 * exactly one recoverer can execute the takeover, and the delayed recoverer is strictly prevented
 * from overwriting the newly live lock.
 *
 * Takeover operations are serialized under an exclusive takeover mutex (${lockFilePath}.takeover).
 * The takeover mutex records owner/PID metadata immediately upon creation so separate OS processes
 * do not falsely identify an active held takeover mutex as stale. Stale takeover mutexes are reclaimed
 * exclusively using a ticketed election protocol rather than un-fenced unlinks, and takeover holders
 * verify ownership fencing before performing the commit rename.
 */
export function atomicTakeoverStaleLock(
  lockFilePath: string,
  newFd: number,
  newLockPath: string,
  expectedDeadOwnerId?: string,
  onTakeoverAcquired?: () => void,
  onAfterTakeoverOpen?: () => void
): boolean {
  const takeoverLockPath = `${lockFilePath}.takeover`;
  let takeoverFd: number | null = null;
  const takeoverOwnerId = crypto.randomUUID();
  const startWait = Date.now();

  while (takeoverFd === null && Date.now() - startWait < 3000) {
    try {
      takeoverFd = fs.openSync(takeoverLockPath, 'wx');
      if (onAfterTakeoverOpen) {
        try { onAfterTakeoverOpen(); } catch {}
      }
      // CRITICAL: Write owner and PID metadata immediately so that other processes
      // checking isLockOwnerAlive do not treat an active held takeover mutex as stale
      try {
        fs.writeFileSync(
          takeoverFd,
          JSON.stringify({ pid: process.pid, ownerId: takeoverOwnerId, createdAt: Date.now() }),
          'utf8'
        );
      } catch (writeErr) {
        try {
          unlinkDescriptorInode(takeoverLockPath, takeoverFd);
        } catch {}
        try { fs.closeSync(takeoverFd); } catch {}
        takeoverFd = null;
        throw writeErr;
      }

      // Descriptor/link/owner fencing check immediately after write
      if (!isTakeoverFenceValid(takeoverFd, takeoverLockPath, takeoverOwnerId)) {
        try { fs.closeSync(takeoverFd); } catch {}
        takeoverFd = null;
        return false;
      }
    } catch (err: any) {
      try {
        if (fs.existsSync(takeoverLockPath)) {
          const tStat = fs.statSync(takeoverLockPath);
          // Only attempt recovery if the takeover mutex is older than 2s AND owner process is demonstrably dead
          if (Date.now() - tStat.mtimeMs > 2000 && !isLockOwnerAlive(takeoverLockPath)) {
            // Reclaim only with an owner-fenced atomic ticketed protocol
            const reclaim = acquireStaleReclaimMutex(takeoverLockPath, takeoverOwnerId);
            if (reclaim.won) {
              try {
                if (fs.existsSync(takeoverLockPath)) {
                  const curTStat = fs.statSync(takeoverLockPath);
                  if (Date.now() - curTStat.mtimeMs > 2000 && !isLockOwnerAlive(takeoverLockPath)) {
                    const newTakeoverPath = `${takeoverLockPath}.${takeoverOwnerId}.new`;
                    let nTfd: number | null = null;
                    try {
                      nTfd = fs.openSync(newTakeoverPath, 'wx');
                      fs.writeFileSync(
                        nTfd,
                        JSON.stringify({ pid: process.pid, ownerId: takeoverOwnerId, createdAt: Date.now() }),
                        'utf8'
                      );
                      if (!isLockOwnerAlive(takeoverLockPath)) {
                        fs.renameSync(newTakeoverPath, takeoverLockPath);
                        takeoverFd = nTfd;
                        nTfd = null;
                      } else {
                        try { fs.closeSync(nTfd); } catch {}
                        nTfd = null;
                        try { if (fs.existsSync(newTakeoverPath)) fs.unlinkSync(newTakeoverPath); } catch {}
                      }
                    } catch {
                      if (nTfd !== null) {
                        try { fs.closeSync(nTfd); } catch {}
                        nTfd = null;
                      }
                      try { if (fs.existsSync(newTakeoverPath)) fs.unlinkSync(newTakeoverPath); } catch {}
                    }
                  }
                }
              } finally {
                reclaim.cleanup();
              }
            }
          }
        }
      } catch {}
      if (takeoverFd !== null) break;
      const pauseUntil = Date.now() + 10;
      while (Date.now() < pauseUntil) {}
    }
  }

  if (takeoverFd === null) {
    return false;
  }

  try {
    // Optional testing hook invoked while holding the takeover lock
    if (onTakeoverAcquired) {
      onTakeoverAcquired();
    }

    // Owner-fenced check: Verify that our takeover mutex descriptor is still valid
    // and that our takeover ownership is recorded on disk before touching lockFilePath
    if (!isTakeoverFenceValid(takeoverFd, takeoverLockPath, takeoverOwnerId)) {
      return false;
    }

    // Under exclusive takeover serialization:
    // If lock file does not exist, rename immediately
    if (!fs.existsSync(lockFilePath)) {
      fs.renameSync(newLockPath, lockFilePath);
      return true;
    }

    // If lock file exists and owner is alive, another recoverer ALREADY took over!
    if (isLockOwnerAlive(lockFilePath)) {
      return false;
    }

    // If expectedDeadOwnerId was specified, verify the on-disk file still belongs to that dead owner
    if (expectedDeadOwnerId) {
      try {
        const content = fs.readFileSync(lockFilePath, 'utf8');
        const meta = JSON.parse(content);
        if (meta?.ownerId && meta.ownerId !== expectedDeadOwnerId) {
          return false;
        }
      } catch {}
    }

    // Final fence check before modifying target lock file:
    // Ensure our takeoverFd is still linked and we are still the takeover owner
    if (!isTakeoverFenceValid(takeoverFd, takeoverLockPath, takeoverOwnerId)) {
      return false;
    }

    // Still demonstrably dead and unchanged: atomically rename over the stale lock
    fs.renameSync(newLockPath, lockFilePath);
    return true;
  } catch {
    return false;
  } finally {
    if (takeoverFd !== null) {
      unlinkIfSameInode(takeoverLockPath, takeoverFd, takeoverOwnerId);
      try { fs.closeSync(takeoverFd); } catch {}
      takeoverFd = null;
    }
  }
}

/**
 * Single-Host Cross-Process File-Backed Atomic Admission Store.
 * Coordinates local pre-RPC admission tracking and abuse throttling across worker
 * processes and threads on a single persistent host or container environment via atomic file locking.
 *
 * SCOPE & SERVERLESS ARCHITECTURE NOTICE:
 * On serverless platforms such as Vercel Functions or AWS Lambda, `os.tmpdir()` is instance-local
 * rather than distributed across function instances. In such environments, this store acts as a
 * per-instance pre-RPC flood gate. Authoritative global distributed admission control and multi-instance
 * rate limiting across all running serverless instances is enforced downstream by the centralized
 * database RPC (`consume_contact_rate_limit`) in Supabase.
 */
export class CrossProcessAdmissionStore {
  readonly filePath: string;
  readonly lockFilePath: string;

  constructor(baseDir?: string) {
    const dir = baseDir || path.join(os.tmpdir(), 'palluvo_rate_limits');
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    this.filePath = path.join(dir, 'admission_store.json');
    this.lockFilePath = path.join(dir, 'admission_store.lock');
  }

  private withLock<T>(
    fn: (fencingToken?: string, lockFd?: number | null) => T,
    customWaitMs?: number
  ): T {
    const maxWaitMs = customWaitMs ?? 5000;
    const staleThresholdMs = 10000;
    const start = Date.now();
    const ownerId = crypto.randomUUID();
    let fd: number | null = null;

    while (fd === null) {
      try {
        fd = fs.openSync(this.lockFilePath, 'wx');
        try {
          fs.writeFileSync(
            fd,
            JSON.stringify({ pid: process.pid, ownerId, createdAt: Date.now() }),
            'utf8'
          );
        } catch (writeErr) {
          unlinkIfSameInode(this.lockFilePath, fd, ownerId);
          try { fs.closeSync(fd); } catch {}
          fd = null;
          throw writeErr;
        }
      } catch (err: any) {
        if (
          err &&
          (err.code === 'EEXIST' ||
            err.code === 'EPERM' ||
            err.code === 'EBUSY' ||
            err.code === 'EACCES')
        ) {
          // Reclaim ONLY if the owner is provably dead/closed AND mtime exceeds stale threshold.
          // Never steal or unlink if the owner process or an open file descriptor is still active!
          try {
            if (fs.existsSync(this.lockFilePath)) {
              const stat = fs.statSync(this.lockFilePath);
              if (Date.now() - stat.mtimeMs > staleThresholdMs) {
                if (!isLockOwnerAlive(this.lockFilePath)) {
                  let deadOwnerId: string | undefined;
                  try {
                    const c = fs.readFileSync(this.lockFilePath, 'utf8');
                    const parsed = JSON.parse(c);
                    if (parsed?.ownerId) deadOwnerId = parsed.ownerId;
                  } catch {}

                  // Atomically claim reclamation rights via linearizable sequence ticket to prevent check-then-unlink race
                  const reclaim = acquireStaleReclaimMutex(this.lockFilePath, ownerId);
                  if (reclaim.won) {
                    try {
                      // Exclusive atomic takeover:
                      // Write new lock state to a distinct temp file and atomically takeover over the stale lock.
                      const newLockPath = `${this.lockFilePath}.${ownerId}.new`;
                      try {
                        const newFd = fs.openSync(newLockPath, 'wx');
                        try {
                          fs.writeFileSync(
                            newFd,
                            JSON.stringify({ pid: process.pid, ownerId, createdAt: Date.now() }),
                            'utf8'
                          );
                          if (atomicTakeoverStaleLock(this.lockFilePath, newFd, newLockPath, deadOwnerId)) {
                            fd = newFd;
                          } else {
                            try { fs.closeSync(newFd); } catch {}
                            try { if (fs.existsSync(newLockPath)) fs.unlinkSync(newLockPath); } catch {}
                          }
                        } catch (nTwriteErr) {
                          try { fs.closeSync(newFd); } catch {}
                          try { if (fs.existsSync(newLockPath)) fs.unlinkSync(newLockPath); } catch {}
                        }
                      } catch {
                        try { if (fs.existsSync(newLockPath)) fs.unlinkSync(newLockPath); } catch {}
                      }
                    } finally {
                      reclaim.cleanup();
                    }
                  }
                }
              }
            }
          } catch {}

          if (fd !== null) break;

          // On waiter timeout, DO NOT unlink the live lock file! Fail closed to prevent racing critical sections.
          if (Date.now() - start > maxWaitMs) {
            throw new Error('LockTimeout: Timeout waiting for cross-process admission lock');
          }

          const pauseUntil = Date.now() + 10 + Math.floor(Math.random() * 10);
          while (Date.now() < pauseUntil) {}
        } else {
          throw err;
        }
      }
    }

    if (fd === null) {
      throw new Error('LockTimeout: Timeout waiting for cross-process admission lock');
    }

    // Owner fencing: verify descriptor remains linked and on-disk ownerId matches before entering fn
    try {
      const fdStat = fs.fstatSync(fd);
      if (fdStat.nlink === 0) {
        throw new Error('LockFenced: Lock file descriptor was unlinked on disk before critical section');
      }
      if (!fs.existsSync(this.lockFilePath)) {
        throw new Error('LockFenced: Lock file is missing on disk before critical section');
      }
      const lockContent = fs.readFileSync(this.lockFilePath, 'utf8');
      const lockMeta = JSON.parse(lockContent);
      if (lockMeta?.ownerId !== ownerId || lockMeta?.pid !== process.pid) {
        throw new Error('LockFenced: Lock ownership reassigned before critical section');
      }
    } catch (fenceErr: any) {
      try { fs.closeSync(fd); } catch {}
      fd = null;
      throw fenceErr;
    }

    try {
      return fn(ownerId, fd);
    } finally {
      if (fd !== null) {
        unlinkIfSameInode(this.lockFilePath, fd, ownerId);
        try { fs.closeSync(fd); } catch {}
        fd = null;
      }
    }
  }

  private readData(): { data: SharedAdmissionData; epoch: number } {
    if (!fs.existsSync(this.filePath)) {
      return { data: { globalTimestamps: [], ipRecords: {} }, epoch: 0 };
    }
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(content);
      const epoch = typeof parsed?.epoch === 'number' ? parsed.epoch : 0;
      return {
        data: {
          epoch,
          globalTimestamps: Array.isArray(parsed?.globalTimestamps) ? parsed.globalTimestamps : [],
          ipRecords: parsed?.ipRecords && typeof parsed.ipRecords === 'object' ? parsed.ipRecords : {},
        },
        epoch,
      };
    } catch {
      return { data: { globalTimestamps: [], ipRecords: {} }, epoch: 0 };
    }
  }

  private writeData(
    data: SharedAdmissionData,
    initialEpoch: number,
    fencingToken?: string,
    lockFd?: number | null
  ): void {
    const newEpoch = initialEpoch + 1;
    data.epoch = newEpoch;

    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data), 'utf8');

    // Atomic CAS commit transaction:
    // Guarantees that validation and swap are completely inseparable under commitMutexPath.
    // If a writer is paused after validation and a newer writer commits,
    // the on-disk epoch compare inside the commit transaction catches it and rejects the stale commit.
    const commitMutexPath = `${this.filePath}.commit_lock`;
    const startCommit = Date.now();
    let commitFd: number | null = null;
    const commitOwnerId = crypto.randomUUID();

    while (commitFd === null) {
      try {
        commitFd = fs.openSync(commitMutexPath, 'wx');
        try {
          fs.writeFileSync(
            commitFd,
            JSON.stringify({ pid: process.pid, ownerId: commitOwnerId, createdAt: Date.now() }),
            'utf8'
          );
        } catch (writeErr) {
          unlinkIfSameInode(commitMutexPath, commitFd, commitOwnerId);
          try { fs.closeSync(commitFd); } catch {}
          commitFd = null;
          throw writeErr;
        }
      } catch (err: any) {
        if (Date.now() - startCommit > 5000) {
          try { fs.unlinkSync(tempPath); } catch {}
          throw new Error('LockTimeout: Timeout acquiring commit lock');
        }
        try {
          if (fs.existsSync(commitMutexPath)) {
            const cStat = fs.statSync(commitMutexPath);
            if (Date.now() - cStat.mtimeMs > 2000 && !isLockOwnerAlive(commitMutexPath)) {
              let deadCommitOwnerId: string | undefined;
              try {
                const c = fs.readFileSync(commitMutexPath, 'utf8');
                const parsed = JSON.parse(c);
                if (parsed?.ownerId) deadCommitOwnerId = parsed.ownerId;
              } catch {}

              const reclaim = acquireStaleReclaimMutex(commitMutexPath, commitOwnerId);
              if (reclaim.won) {
                try {
                  const newCommitPath = `${commitMutexPath}.${commitOwnerId}.new`;
                  try {
                    const newFd = fs.openSync(newCommitPath, 'wx');
                    try {
                      fs.writeFileSync(
                        newFd,
                        JSON.stringify({ pid: process.pid, ownerId: commitOwnerId, createdAt: Date.now() }),
                        'utf8'
                      );
                      if (atomicTakeoverStaleLock(commitMutexPath, newFd, newCommitPath, deadCommitOwnerId)) {
                        commitFd = newFd;
                      } else {
                        try { fs.closeSync(newFd); } catch {}
                        try { if (fs.existsSync(newCommitPath)) fs.unlinkSync(newCommitPath); } catch {}
                      }
                    } catch (nTwriteErr) {
                      try { fs.closeSync(newFd); } catch {}
                      try { if (fs.existsSync(newCommitPath)) fs.unlinkSync(newCommitPath); } catch {}
                    }
                  } catch {
                    try { if (fs.existsSync(newCommitPath)) fs.unlinkSync(newCommitPath); } catch {}
                  }
                } finally {
                  reclaim.cleanup();
                }
              }
            }
          }
        } catch {}

        if (commitFd !== null) break;

        const pauseUntil = Date.now() + 5;
        while (Date.now() < pauseUntil) {}
      }
    }

    try {
      // 1. Commit mutex descriptor check
      if (commitFd !== null) {
        try {
          const cStat = fs.fstatSync(commitFd);
          if (cStat.nlink === 0) {
            throw new Error('LockFenced: Commit mutex was unlinked; commit aborted');
          }
          if (!fs.existsSync(commitMutexPath)) {
            throw new Error('LockFenced: Commit mutex file missing; commit aborted');
          }
          const cContent = fs.readFileSync(commitMutexPath, 'utf8');
          const cMeta = JSON.parse(cContent);
          if (cMeta?.ownerId !== commitOwnerId || cMeta?.pid !== process.pid) {
            throw new Error('LockFenced: Commit mutex ownership reassigned; commit aborted');
          }
        } catch (err: any) {
          if (err?.message?.includes('LockFenced')) throw err;
          throw new Error('LockFenced: Commit mutex invalid; commit aborted');
        }
      }

      // 2. Lock descriptor check
      if (lockFd !== null && lockFd !== undefined) {
        try {
          const fdStat = fs.fstatSync(lockFd);
          if (fdStat.nlink === 0) {
            throw new Error('LockFenced: Lock file descriptor was unlinked on disk; stale commit rejected');
          }
        } catch (err: any) {
          throw new Error('LockFenced: Lock descriptor invalid; stale commit rejected');
        }
      }

      // 3. Lock ownership check
      if (fencingToken) {
        if (!fs.existsSync(this.lockFilePath)) {
          throw new Error('LockFenced: Lock file missing; stale commit rejected');
        }
        const lockContent = fs.readFileSync(this.lockFilePath, 'utf8');
        const meta = JSON.parse(lockContent);
        if (meta?.ownerId && meta.ownerId !== fencingToken) {
          throw new Error('LockFenced: Lock ownership reassigned; stale commit rejected');
        }
      }

      // 4. Atomic CAS: Compare on-disk epoch
      if (fs.existsSync(this.filePath)) {
        const diskContent = fs.readFileSync(this.filePath, 'utf8');
        const diskParsed = JSON.parse(diskContent);
        const diskEpoch = typeof diskParsed?.epoch === 'number' ? diskParsed.epoch : 0;
        if (diskEpoch !== initialEpoch || diskEpoch >= newEpoch) {
          throw new Error(
            `LockFenced: Storage epoch on disk has advanced (${diskEpoch} !== ${initialEpoch}); stale commit rejected`
          );
        }
      } else if (initialEpoch !== 0) {
        throw new Error(
          `LockFenced: Initial epoch was ${initialEpoch} but storage file is missing; stale commit rejected`
        );
      }

      // 5. Atomic Swap
      fs.renameSync(tempPath, this.filePath);
    } finally {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
      if (commitFd !== null) {
        unlinkIfSameInode(commitMutexPath, commitFd, commitOwnerId);
        try { fs.closeSync(commitFd); } catch {}
        commitFd = null;
      }
    }
  }

  checkAdmission(
    { ip, maxWaitMs }: { ip?: string; maxWaitMs?: number },
    now: number = Date.now()
  ): RateLimitResult {
    try {
      return this.withLock((fencingToken, lockFd) => {
        const { data, epoch } = this.readData();
        const windowStart = now - ADMISSION_LIMIT_CONFIG.WINDOW_MS;

        // 1. Shared global WAF admission window across all instances/workers
        data.globalTimestamps = data.globalTimestamps.filter((ts) => ts > windowStart);
        if (data.globalTimestamps.length >= ADMISSION_LIMIT_CONFIG.MAX_GLOBAL_ADMISSIONS) {
          const retryAfter = Math.ceil(
            (data.globalTimestamps[0] + ADMISSION_LIMIT_CONFIG.WINDOW_MS - now) / 1000
          );
          return {
            allowed: false,
            retryAfterSeconds: retryAfter,
            error:
              'Inquiry service is receiving unusually high traffic. Please wait a moment or contact our atelier directly via phone or WhatsApp.',
          };
        }

        if (!ip || ip === 'unknown') {
          data.globalTimestamps.push(now);
          this.writeData(data, epoch, fencingToken, lockFd);
          return { allowed: true };
        }

        // Hash IP key using required server secret before persisting state to prevent storing plaintext PII
        const ipKey = hashRateLimitIdentifier(`ip:${ip}`);

        // 2. Per-IP admission limit
        let record: AdmissionRecord | undefined = data.ipRecords[ipKey];
        if (record) {
          record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
          if (record.timestamps.length === 0) {
            delete data.ipRecords[ipKey];
            record = undefined;
          }
        }

        // Memory/capacity bounding on ipRecords
        const currentKeys = Object.keys(data.ipRecords);
        if (!record && currentKeys.length >= ADMISSION_LIMIT_CONFIG.MAX_MAP_SIZE) {
          // Sweep expired
          for (const [k, rec] of Object.entries(data.ipRecords)) {
            rec.timestamps = rec.timestamps.filter((ts) => ts > windowStart);
            if (rec.timestamps.length === 0) {
              delete data.ipRecords[k];
            }
          }
          const remainingKeys = Object.keys(data.ipRecords);
          if (remainingKeys.length >= ADMISSION_LIMIT_CONFIG.MAX_MAP_SIZE) {
            const needed = remainingKeys.length + 1 - ADMISSION_LIMIT_CONFIG.MAX_MAP_SIZE;
            const oldest = Object.entries(data.ipRecords)
              .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated)
              .slice(0, needed)
              .map(([k]) => k);
            for (const k of oldest) {
              delete data.ipRecords[k];
            }
          }
        }

        if (record && record.timestamps.length >= ADMISSION_LIMIT_CONFIG.MAX_ADMISSIONS_PER_IP) {
          const oldest = record.timestamps[0];
          const retryAfter = Math.ceil((oldest + ADMISSION_LIMIT_CONFIG.WINDOW_MS - now) / 1000);
          data.globalTimestamps.push(now);
          this.writeData(data, epoch, fencingToken, lockFd);
          return {
            allowed: false,
            retryAfterSeconds: retryAfter,
            error:
              'Too many inquiries received from your connection. Please wait a moment before trying again.',
          };
        }

        if (!record) {
          record = { timestamps: [now], lastUpdated: now };
          data.ipRecords[ipKey] = record;
        } else {
          record.timestamps.push(now);
          record.lastUpdated = now;
        }

        data.globalTimestamps.push(now);
        this.writeData(data, epoch, fencingToken, lockFd);
        return { allowed: true };
      }, maxWaitMs);
    } catch (err: any) {
      if (err?.message?.includes('LockTimeout')) {
        return {
          allowed: false,
          retryAfterSeconds: 5,
          error:
            'Inquiry service is momentarily busy processing concurrent requests. Please wait a moment.',
        };
      }
      throw err;
    }
  }

  pruneExpired(now: number = Date.now()): number {
    try {
      return this.withLock((fencingToken, lockFd) => {
        const { data, epoch } = this.readData();
        const windowStart = now - ADMISSION_LIMIT_CONFIG.WINDOW_MS;
        data.globalTimestamps = data.globalTimestamps.filter((ts) => ts > windowStart);
        let pruned = 0;
        for (const [ipKey, record] of Object.entries(data.ipRecords)) {
          record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
          if (record.timestamps.length === 0) {
            delete data.ipRecords[ipKey];
            pruned++;
          }
        }
        this.writeData(data, epoch, fencingToken, lockFd);
        return pruned;
      });
    } catch {
      return 0;
    }
  }

  getTrackerSize(): number {
    try {
      return this.withLock(() => {
        const { data } = this.readData();
        return Object.keys(data.ipRecords).length;
      });
    } catch {
      return 0;
    }
  }

  getGlobalCount(): number {
    try {
      return this.withLock(() => {
        const { data } = this.readData();
        return data.globalTimestamps.length;
      });
    } catch {
      return 0;
    }
  }

  clear(): void {
    try {
      this.withLock(() => {
        try {
          if (fs.existsSync(this.filePath)) {
            fs.unlinkSync(this.filePath);
          }
        } catch {}
      });
    } catch {
      try {
        if (fs.existsSync(this.filePath)) {
          fs.unlinkSync(this.filePath);
        }
      } catch {}
    }
  }
}

// Active singleton cross-process admission store
export const defaultAdmissionStore = new CrossProcessAdmissionStore();

/**
 * Periodically or on-demand sweeps and deletes stale IP entries and global timestamps older than the sliding window.
 * Ensures the shared admission store does not accumulate stale client addresses indefinitely.
 */
export function pruneExpiredAdmissions(now: number = Date.now()): number {
  return defaultAdmissionStore.pruneExpired(now);
}

// Background sweep in warm Node process environments
if (typeof setInterval !== 'undefined') {
  const sweepTimer = setInterval(() => {
    pruneExpiredAdmissions();
  }, ADMISSION_LIMIT_CONFIG.WINDOW_MS);
  if (typeof sweepTimer.unref === 'function') {
    sweepTimer.unref();
  }
}

/**
 * Pre-RPC abuse/WAF admission limit at the application boundary.
 * Throttles rapid bursts from a single source connection as well as volumetric floods
 * before calling database RPCs.
 *
 * Scoped to worker processes on a single persistent host via `CrossProcessAdmissionStore`.
 * In multi-instance serverless deployments (Vercel Functions), global distributed admission control
 * across instances is enforced by the downstream Supabase RPC (`consume_contact_rate_limit`).
 */
export function checkAdmissionLimit(
  { ip, maxWaitMs }: { ip?: string; maxWaitMs?: number },
  now: number = Date.now()
): RateLimitResult {
  return defaultAdmissionStore.checkAdmission({ ip, maxWaitMs }, now);
}

export function getAdmissionTrackerSize(): number {
  return defaultAdmissionStore.getTrackerSize();
}

export function getGlobalAdmissionCount(): number {
  return defaultAdmissionStore.getGlobalCount();
}

export function resetAdmissionTracker(): void {
  defaultAdmissionStore.clear();
}

export interface RateLimitRecord {
  timestamps: number[];
  lastUpdated: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  error?: string;
}

export interface RateLimiterOptions {
  windowMs?: number;
  maxPerWindow?: number;
  cooldownMs?: number;
  maxStoreSize?: number;
  WINDOW_MS?: number;
  MAX_PER_WINDOW?: number;
  COOLDOWN_MS?: number;
  MAX_STORE_SIZE?: number;
}

export interface RateLimitStore {
  consumeKeys(keys: string[], now?: number): Promise<RateLimitResult>;
  getStoreSize?(): Promise<number> | number;
  pruneExpiredEntries?(now?: number): Promise<number> | number;
  clear?(): Promise<void> | void;
}

export function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.npm_lifecycle_event === 'test' ||
    (Array.isArray(process.execArgv) && process.execArgv.includes('--test')) ||
    (Array.isArray(process.argv) && process.argv.includes('--test'))
  );
}

/**
 * Resolves the high-entropy server secret for HMAC keying.
 * Consistently supports RATE_LIMIT_PEPPER, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_SECRET_KEY.
 * Never falls back to a public or guessable constant.
 * Fails closed (throws) if high-entropy server credential is absent in production or when Supabase is configured.
 */
export function getRateLimitPepper(): string {
  const secret =
    process.env.RATE_LIMIT_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (secret && typeof secret === 'string') {
    const trimmed = secret.trim();
    if (
      trimmed.length >= 16 &&
      !trimmed.includes('placeholder') &&
      !trimmed.includes('your_supabase_service_role_key')
    ) {
      return trimmed;
    }
  }

  // In test environments without explicit secrets, provide an isolated test key unless simulating absent secret
  if (isTestEnvironment() && !process.env.TEST_SIMULATE_NO_SECRET) {
    return 'isolated_test_suite_pepper_key_1234567890abcdef';
  }

  // In local development fallback only when Supabase is completely unconfigured
  if (
    !checkSupabaseConfigured() &&
    process.env.NODE_ENV !== 'production' &&
    !process.env.TEST_SIMULATE_NO_SECRET
  ) {
    return 'local_dev_rate_limit_pepper_unconfigured_supabase';
  }

  throw new Error(
    'Missing required high-entropy rate limit secret: RATE_LIMIT_PEPPER, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_SECRET_KEY must be configured.'
  );
}

/**
 * Creates a non-reversible HMAC-SHA256 keyed digest of identifier keys (IP/email)
 * using a high-entropy server secret. Prevents storing or exposing raw personal identifiers.
 */
export function hashRateLimitIdentifier(identifier: string): string {
  if (typeof identifier !== 'string' || identifier.length === 0) {
    return '';
  }
  if (identifier.startsWith('digest:sha256:')) {
    return identifier;
  }
  const pepper = getRateLimitPepper();
  const hmac = crypto
    .createHmac('sha256', pepper)
    .update(identifier.trim().toLowerCase())
    .digest('hex');
  return `digest:sha256:${hmac}`;
}

export function checkSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return false;
  if (url.includes('placeholder') || key.includes('placeholder')) return false;
  if (url.includes('your_supabase_project_url') || key.includes('your_supabase_anon_key')) return false;

  return (
    url.startsWith('https://') ||
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://localhost')
  );
}

export function checkSupabaseServiceRoleConfigured(): boolean {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!serviceKey) return false;
  if (serviceKey.includes('placeholder') || serviceKey.includes('your_supabase_service_role_key')) return false;
  return serviceKey.trim().length > 10;
}

/**
 * Checks whether the deployment requires and enforces confirmed email verification in Supabase Auth.
 * Supabase allows projects to have "Confirm email" disabled, where any caller can register an address
 * and immediately receive a session without proving mailbox access.
 * To prevent quota poisoning on public forms, shared email rate limits are strictly gated behind this deployment requirement.
 */
export function isEmailConfirmationEnforced(): boolean {
  const env =
    process.env.REQUIRE_EMAIL_CONFIRMATION ||
    process.env.SUPABASE_AUTH_CONFIRM_EMAIL;
  if (!env) return false;
  const val = env.trim().toLowerCase();
  return val === 'true' || val === '1';
}

/**
 * Verifies whether the submitted email address has proven mailbox access.
 * If the deployment does not enforce email confirmation (e.g. Supabase project with "Confirm Email" disabled,
 * where signups are immediately issued sessions without email delivery), authenticated sessions do NOT
 * prove mailbox access and must not be used to apply shared email quotas (which would allow an attacker
 * to register an unused victim address and poison their quota).
 *
 * Strict mailbox verification requires:
 * 1. Confirmed-email configuration is enforced as a deployment requirement (`isEmailConfirmationEnforced() === true`).
 * 2. Authenticated user object exists with a valid email.
 * 3. The user's `email_confirmed_at` timestamp is present and verified.
 * 4. The user's email matches the submitted email.
 */
export function isMailboxVerified(
  user: { email?: string; email_confirmed_at?: string | null } | null | undefined,
  submittedEmail: string
): boolean {
  if (!isEmailConfirmationEnforced()) {
    return false;
  }
  if (!user || !user.email) {
    return false;
  }
  if (
    !user.email_confirmed_at ||
    typeof user.email_confirmed_at !== 'string' ||
    user.email_confirmed_at.trim().length === 0
  ) {
    return false;
  }
  return (user.email || '').toLowerCase().trim() === (submittedEmail || '').toLowerCase().trim();
}


/**
 * Fail-closed store used when production environment is misconfigured
 * (e.g., Supabase is active but SUPABASE_SERVICE_ROLE_KEY is absent).
 */
export class MisconfiguredRateLimitStore implements RateLimitStore {
  async consumeKeys(): Promise<RateLimitResult> {
    console.error(
      '[RateLimiter] Configuration error: Supabase is configured in production but SUPABASE_SERVICE_ROLE_KEY is absent. Failing closed to avoid per-instance storage leak.'
    );
    return {
      allowed: false,
      error: 'Inquiry service is temporarily unavailable due to a server configuration issue. Please connect with our concierge directly.',
    };
  }

  getStoreSize(): number {
    return 0;
  }

  pruneExpiredEntries(): number {
    return 0;
  }

  clear(): void {}
}

/**
 * Production Database RPC Rate Limit Store.
 * Calls PostgreSQL function `consume_contact_rate_limit` via trusted server service_role credential.
 * Enforces atomic multi-key row locking, sliding window, burst cooldown,
 * TTL pruning, capacity protection, and fails closed on query failure.
 */
export class DatabaseRpcRateLimitStore implements RateLimitStore {
  private clientFactory?: () => Promise<any> | any;

  constructor(clientFactory?: () => Promise<any> | any) {
    this.clientFactory = clientFactory;
    // Guaranteed background cleanup interval in warm processes
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => {
        this.pruneExpiredEntries().catch(() => {});
      }, RATE_LIMIT_CONFIG.WINDOW_MS);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    }
  }

  private async getClient(): Promise<any> {
    if (this.clientFactory) {
      return await this.clientFactory();
    }
    try {
      const { createAdminClient } = await import('@/utils/supabase/server');
      return await createAdminClient();
    } catch {
      return null;
    }
  }

  async consumeKeys(keys: string[], now: number = Date.now()): Promise<RateLimitResult> {
    const validKeys = [
      ...new Set(
        keys
          .filter((k) => typeof k === 'string' && k.trim().length > 0)
          .map(hashRateLimitIdentifier)
      ),
    ];
    if (validKeys.length === 0) {
      return { allowed: true };
    }

    try {
      const supabase = await this.getClient();
      if (!supabase) {
        return {
          allowed: false,
          error: 'Rate limiter unavailable. Please connect with our concierge directly.',
        };
      }

      const { data, error } = await supabase.rpc('consume_contact_rate_limit', {
        p_keys: validKeys,
      });

      if (error) {
        console.error('[DatabaseRpcRateLimitStore] RPC error:', error);
        // Fail closed on query errors - do not permit unverified submissions
        return {
          allowed: false,
          error: 'Unable to verify request rate at this moment. Please connect with our concierge directly.',
        };
      }

      if (data && typeof data === 'object') {
        return {
          allowed: Boolean(data.allowed),
          retryAfterSeconds: data.retryAfterSeconds,
          error: data.error,
        };
      }

      return {
        allowed: false,
        error: 'Unable to process inquiry rate check. Please try again shortly.',
      };
    } catch (err) {
      console.error('[DatabaseRpcRateLimitStore] Unexpected exception:', err);
      return {
        allowed: false,
        error: 'Unable to verify request rate at this moment. Please connect with our concierge directly.',
      };
    }
  }

  async pruneExpiredEntries(): Promise<number> {
    try {
      const supabase = await this.getClient();
      if (!supabase) return 0;
      const { data, error } = await supabase.rpc('prune_expired_contact_rate_limits');
      if (error) {
        console.error('[DatabaseRpcRateLimitStore] prune error:', error);
        return 0;
      }
      return typeof data === 'number' ? data : 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Cross-Process File-Backed Atomic Rate Limit Store.
 * Backs production rate limits across independent Node worker processes/threads
 * without relying on process-local memory. Uses atomic file locking and updates.
 */
export class CrossProcessRateLimitStore implements RateLimitStore {
  readonly windowMs: number;
  readonly maxPerWindow: number;
  readonly cooldownMs: number;
  readonly maxStoreSize: number;
  readonly storeFilePath: string;
  readonly lockFilePath: string;

  constructor(options: RateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? options.WINDOW_MS ?? RATE_LIMIT_CONFIG.WINDOW_MS;
    this.maxPerWindow = options.maxPerWindow ?? options.MAX_PER_WINDOW ?? RATE_LIMIT_CONFIG.MAX_PER_WINDOW;
    this.cooldownMs = options.cooldownMs ?? options.COOLDOWN_MS ?? RATE_LIMIT_CONFIG.COOLDOWN_MS;
    this.maxStoreSize = options.maxStoreSize ?? options.MAX_STORE_SIZE ?? RATE_LIMIT_CONFIG.MAX_STORE_SIZE;

    const baseDir = path.join(os.tmpdir(), 'palluvo_rate_limits');
    if (!fs.existsSync(/*turbopackIgnore: true*/ baseDir)) {
      try {
        fs.mkdirSync(baseDir, { recursive: true });
      } catch {}
    }
    this.storeFilePath = path.join(baseDir, 'contact_limits.json');
    this.lockFilePath = path.join(baseDir, 'contact_limits.lock');
  }

  private withLock<T>(
    fn: (fencingToken?: string, lockFd?: number | null) => T,
    customWaitMs?: number
  ): T {
    const maxWaitMs = customWaitMs ?? 5000;
    const staleThresholdMs = 10000;
    const start = Date.now();
    const ownerId = crypto.randomUUID();
    let fd: number | null = null;

    while (fd === null) {
      try {
        fd = fs.openSync(this.lockFilePath, 'wx');
        try {
          fs.writeFileSync(
            fd,
            JSON.stringify({ pid: process.pid, ownerId, createdAt: Date.now() }),
            'utf8'
          );
        } catch (writeErr) {
          unlinkIfSameInode(this.lockFilePath, fd, ownerId);
          try { fs.closeSync(fd); } catch {}
          fd = null;
          throw writeErr;
        }
      } catch (err: any) {
        if (
          err &&
          (err.code === 'EEXIST' ||
            err.code === 'EPERM' ||
            err.code === 'EBUSY' ||
            err.code === 'EACCES')
        ) {
          // Reclaim ONLY if the owner is provably dead/closed AND mtime exceeds stale threshold.
          // Never steal or unlink if the owner process or an open file descriptor is still active!
          try {
            if (fs.existsSync(this.lockFilePath)) {
              const stat = fs.statSync(this.lockFilePath);
              if (Date.now() - stat.mtimeMs > staleThresholdMs) {
                if (!isLockOwnerAlive(this.lockFilePath)) {
                  let deadOwnerId: string | undefined;
                  try {
                    const c = fs.readFileSync(this.lockFilePath, 'utf8');
                    const parsed = JSON.parse(c);
                    if (parsed?.ownerId) deadOwnerId = parsed.ownerId;
                  } catch {}

                  // Atomically claim reclamation rights via linearizable sequence ticket to prevent check-then-unlink race
                  const reclaim = acquireStaleReclaimMutex(this.lockFilePath, ownerId);
                  if (reclaim.won) {
                    try {
                      // Exclusive atomic takeover:
                      const newLockPath = `${this.lockFilePath}.${ownerId}.new`;
                      try {
                        const newFd = fs.openSync(newLockPath, 'wx');
                        try {
                          fs.writeFileSync(
                            newFd,
                            JSON.stringify({ pid: process.pid, ownerId, createdAt: Date.now() }),
                            'utf8'
                          );
                          if (atomicTakeoverStaleLock(this.lockFilePath, newFd, newLockPath, deadOwnerId)) {
                            fd = newFd;
                          } else {
                            try { fs.closeSync(newFd); } catch {}
                            try { if (fs.existsSync(newLockPath)) fs.unlinkSync(newLockPath); } catch {}
                          }
                        } catch (nTwriteErr) {
                          try { fs.closeSync(newFd); } catch {}
                          try { if (fs.existsSync(newLockPath)) fs.unlinkSync(newLockPath); } catch {}
                        }
                      } catch {
                        try { if (fs.existsSync(newLockPath)) fs.unlinkSync(newLockPath); } catch {}
                      }
                    } finally {
                      reclaim.cleanup();
                    }
                  }
                }
              }
            }
          } catch {}

          if (fd !== null) break;

          // On waiter timeout, DO NOT unlink the live lock file! Fail closed.
          if (Date.now() - start > maxWaitMs) {
            throw new Error('LockTimeout: Timeout waiting for cross-process rate limit lock');
          }

          const pauseUntil = Date.now() + 10 + Math.floor(Math.random() * 10);
          while (Date.now() < pauseUntil) {}
        } else {
          throw err;
        }
      }
    }

    if (fd === null) {
      throw new Error('LockTimeout: Timeout waiting for cross-process rate limit lock');
    }

    // Owner fencing: verify descriptor remains linked and on-disk ownerId matches before entering fn
    try {
      const fdStat = fs.fstatSync(fd);
      if (fdStat.nlink === 0) {
        throw new Error('LockFenced: Lock file descriptor was unlinked on disk before critical section');
      }
      if (!fs.existsSync(this.lockFilePath)) {
        throw new Error('LockFenced: Lock file is missing on disk before critical section');
      }
      const lockContent = fs.readFileSync(this.lockFilePath, 'utf8');
      const lockMeta = JSON.parse(lockContent);
      if (lockMeta?.ownerId !== ownerId || lockMeta?.pid !== process.pid) {
        throw new Error('LockFenced: Lock ownership reassigned before critical section');
      }
    } catch (fenceErr: any) {
      try { fs.closeSync(fd); } catch {}
      fd = null;
      throw fenceErr;
    }

    try {
      return fn(ownerId, fd);
    } finally {
      if (fd !== null) {
        unlinkIfSameInode(this.lockFilePath, fd, ownerId);
        try { fs.closeSync(fd); } catch {}
        fd = null;
      }
    }
  }

  private writeData(
    data: Record<string, RateLimitRecord>,
    initialEpoch: number,
    fencingToken?: string,
    lockFd?: number | null
  ): void {
    const newEpoch = initialEpoch + 1;
    const toCommit = { ...data, __epoch: newEpoch };

    const tempPath = `${this.storeFilePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(toCommit), 'utf8');

    // Atomic CAS commit transaction:
    // Guarantees that validation and swap are completely broadcast-safe and inseparable under commitMutexPath.
    // If a writer is paused after validation and a newer writer commits,
    // the on-disk epoch compare inside the commit transaction catches it and rejects the stale commit.
    const commitMutexPath = `${this.storeFilePath}.commit_lock`;
    const startCommit = Date.now();
    let commitFd: number | null = null;
    const commitOwnerId = crypto.randomUUID();

    while (commitFd === null) {
      try {
        commitFd = fs.openSync(commitMutexPath, 'wx');
        try {
          fs.writeFileSync(
            commitFd,
            JSON.stringify({ pid: process.pid, ownerId: commitOwnerId, createdAt: Date.now() }),
            'utf8'
          );
        } catch (writeErr) {
          unlinkIfSameInode(commitMutexPath, commitFd, commitOwnerId);
          try { fs.closeSync(commitFd); } catch {}
          commitFd = null;
          throw writeErr;
        }
      } catch (err: any) {
        if (Date.now() - startCommit > 5000) {
          try { fs.unlinkSync(tempPath); } catch {}
          throw new Error('LockTimeout: Timeout acquiring commit lock');
        }
        try {
          if (fs.existsSync(commitMutexPath)) {
            const cStat = fs.statSync(commitMutexPath);
            if (Date.now() - cStat.mtimeMs > 2000 && !isLockOwnerAlive(commitMutexPath)) {
              let deadCommitOwnerId: string | undefined;
              try {
                const c = fs.readFileSync(commitMutexPath, 'utf8');
                const parsed = JSON.parse(c);
                if (parsed?.ownerId) deadCommitOwnerId = parsed.ownerId;
              } catch {}

              const reclaim = acquireStaleReclaimMutex(commitMutexPath, commitOwnerId);
              if (reclaim.won) {
                try {
                  const newCommitPath = `${commitMutexPath}.${commitOwnerId}.new`;
                  try {
                    const newFd = fs.openSync(newCommitPath, 'wx');
                    try {
                      fs.writeFileSync(
                        newFd,
                        JSON.stringify({ pid: process.pid, ownerId: commitOwnerId, createdAt: Date.now() }),
                        'utf8'
                      );
                      if (atomicTakeoverStaleLock(commitMutexPath, newFd, newCommitPath, deadCommitOwnerId)) {
                        commitFd = newFd;
                      } else {
                        try { fs.closeSync(newFd); } catch {}
                        try { if (fs.existsSync(newCommitPath)) fs.unlinkSync(newCommitPath); } catch {}
                      }
                    } catch (nTwriteErr) {
                      try { fs.closeSync(newFd); } catch {}
                      try { if (fs.existsSync(newCommitPath)) fs.unlinkSync(newCommitPath); } catch {}
                    }
                  } catch {
                    try { if (fs.existsSync(newCommitPath)) fs.unlinkSync(newCommitPath); } catch {}
                  }
                } finally {
                  reclaim.cleanup();
                }
              }
            }
          }
        } catch {}

        if (commitFd !== null) break;

        const pauseUntil = Date.now() + 5;
        while (Date.now() < pauseUntil) {}
      }
    }

    try {
      // 1. Commit mutex descriptor check
      if (commitFd !== null) {
        try {
          const cStat = fs.fstatSync(commitFd);
          if (cStat.nlink === 0) {
            throw new Error('LockFenced: Commit mutex was unlinked; commit aborted');
          }
          if (!fs.existsSync(commitMutexPath)) {
            throw new Error('LockFenced: Commit mutex file missing; commit aborted');
          }
          const cContent = fs.readFileSync(commitMutexPath, 'utf8');
          const cMeta = JSON.parse(cContent);
          if (cMeta?.ownerId !== commitOwnerId || cMeta?.pid !== process.pid) {
            throw new Error('LockFenced: Commit mutex ownership reassigned; commit aborted');
          }
        } catch (err: any) {
          if (err?.message?.includes('LockFenced')) throw err;
          throw new Error('LockFenced: Commit mutex invalid; commit aborted');
        }
      }

      // 2. Lock descriptor check
      if (lockFd !== null && lockFd !== undefined) {
        try {
          const fdStat = fs.fstatSync(lockFd);
          if (fdStat.nlink === 0) {
            throw new Error('LockFenced: Lock file descriptor was unlinked on disk; stale commit rejected');
          }
        } catch (err: any) {
          throw new Error('LockFenced: Lock descriptor invalid; stale commit rejected');
        }
      }

      // 3. Lock ownership check
      if (fencingToken) {
        if (!fs.existsSync(this.lockFilePath)) {
          throw new Error('LockFenced: Lock file missing; stale commit rejected');
        }
        const lockContent = fs.readFileSync(this.lockFilePath, 'utf8');
        const meta = JSON.parse(lockContent);
        if (meta?.ownerId && meta.ownerId !== fencingToken) {
          throw new Error('LockFenced: Lock ownership reassigned; stale commit rejected');
        }
      }

      // 4. Atomic CAS: Compare on-disk epoch
      if (fs.existsSync(this.storeFilePath)) {
        const diskContent = fs.readFileSync(this.storeFilePath, 'utf8');
        const diskParsed = JSON.parse(diskContent);
        const diskEpoch = typeof diskParsed?.__epoch === 'number' ? diskParsed.__epoch : 0;
        if (diskEpoch !== initialEpoch || diskEpoch >= newEpoch) {
          throw new Error(
            `LockFenced: Storage epoch on disk has advanced (${diskEpoch} !== ${initialEpoch}); stale commit rejected`
          );
        }
      } else if (initialEpoch !== 0) {
        throw new Error(
          `LockFenced: Initial epoch was ${initialEpoch} but storage file is missing; stale commit rejected`
        );
      }

      // 5. Atomic Swap
      fs.renameSync(tempPath, this.storeFilePath);
    } finally {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
      if (commitFd !== null) {
        unlinkIfSameInode(commitMutexPath, commitFd, commitOwnerId);
        try { fs.closeSync(commitFd); } catch {}
        commitFd = null;
      }
    }
  }

  async consumeKeys(
    keys: string[],
    now: number = Date.now(),
    maxWaitMs?: number
  ): Promise<RateLimitResult> {
    const validKeys = [...new Set(keys.filter((k) => typeof k === 'string' && k.trim().length > 0))];
    if (validKeys.length === 0) {
      return { allowed: true };
    }

    try {
      return this.withLock((fencingToken, lockFd) => {
        let initialEpoch = 0;
        let data: Record<string, RateLimitRecord> = {};
        if (fs.existsSync(this.storeFilePath)) {
          try {
            const content = fs.readFileSync(this.storeFilePath, 'utf8');
            const parsed = JSON.parse(content) || {};
            if (typeof parsed.__epoch === 'number') {
              initialEpoch = parsed.__epoch;
              delete parsed.__epoch;
            }
            data = parsed;
          } catch {
            data = {};
          }
        }

        const windowStart = now - this.windowMs;

        // 1. Prune expired timestamps across all keys
        for (const [key, record] of Object.entries(data)) {
          record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
          if (record.timestamps.length === 0) {
            delete data[key];
          }
        }

        // 2. Multi-key evaluation for burst cooldown and window quota
        for (const key of validKeys) {
          const record = data[key];
          if (record && record.timestamps.length > 0) {
            const lastTs = record.timestamps[record.timestamps.length - 1];
            if (now - lastTs < this.cooldownMs) {
              const retryAfter = Math.ceil((this.cooldownMs - (now - lastTs)) / 1000);
              return {
                allowed: false,
                retryAfterSeconds: retryAfter,
                error: 'Please wait a moment before sending another message.',
              };
            }

            if (record.timestamps.length >= this.maxPerWindow) {
              const oldest = record.timestamps[0];
              const retryAfter = Math.ceil((oldest + this.windowMs - now) / 1000);
              return {
                allowed: false,
                retryAfterSeconds: retryAfter,
                error: 'Too many inquiries submitted. Please wait a few minutes before trying again or reach out to our concierge directly.',
              };
            }
          }
        }

        // 3. Resilient capacity strategy for new keys:
        // Prevent untrusted public submissions from globally exhausting the shared key budget
        const currentKeys = Object.keys(data);
        const newKeys = validKeys.filter((k) => !data[k]);
        if (currentKeys.length + newKeys.length > this.maxStoreSize) {
          const needed = currentKeys.length + newKeys.length - this.maxStoreSize;
          const keysToEvict: string[] = [];
          const eligibleEntries = Object.entries(data).filter(([k]) => !validKeys.includes(k));

          // Phase 1: Evict un-throttled entries (single-use or low-frequency synthetic keys from rotated submissions)
          // Strictly protects active throttled quotas (keys with >= maxPerWindow or within burst cooldown)
          const unthrottledEntries = eligibleEntries
            .filter(([, rec]) => {
              const isThrottled = rec.timestamps.length >= this.maxPerWindow;
              const inCooldown =
                rec.timestamps.length > 0 &&
                now - rec.timestamps[rec.timestamps.length - 1] < this.cooldownMs;
              return !isThrottled && !inCooldown;
            })
            .sort((a, b) => {
              if (a[1].timestamps.length !== b[1].timestamps.length) {
                return a[1].timestamps.length - b[1].timestamps.length;
              }
              return a[1].lastUpdated - b[1].lastUpdated;
            });

          for (const [k] of unthrottledEntries) {
            if (keysToEvict.length >= needed) break;
            keysToEvict.push(k);
          }

          for (const k of keysToEvict) {
            delete data[k];
          }

          // Enforce hard storage capacity bound: if store remains full because remaining entries are actively throttled,
          // do NOT insert new keys. Reject while strictly preserving all active throttled quotas intact.
          if (Object.keys(data).length + newKeys.length > this.maxStoreSize) {
            return {
              allowed: false,
              retryAfterSeconds: 60,
              error: 'Service is currently experiencing high inquiry volume. Please try again in a few moments or reach out to our concierge directly.',
            };
          }
        }

        // 4. Commit timestamps atomically for all keys
        for (const key of validKeys) {
          let record = data[key];
          if (!record) {
            record = { timestamps: [], lastUpdated: now };
            data[key] = record;
          }
          record.timestamps.push(now);
          record.lastUpdated = now;
        }

        // 5. Commit with atomic CAS transaction
        this.writeData(data, initialEpoch, fencingToken, lockFd);

        return { allowed: true };
      }, maxWaitMs);
    } catch (err: any) {
      if (err?.message?.includes('LockTimeout')) {
        return {
          allowed: false,
          retryAfterSeconds: 5,
          error:
            'Inquiry service is momentarily busy processing concurrent requests. Please wait a moment.',
        };
      }
      throw err;
    }
  }

  getStoreSize(): number {
    return this.withLock(() => {
      if (!fs.existsSync(this.storeFilePath)) return 0;
      try {
        const content = fs.readFileSync(this.storeFilePath, 'utf8');
        const data = JSON.parse(content) || {};
        delete data.__epoch;
        return Object.keys(data).length;
      } catch {
        return 0;
      }
    });
  }

  pruneExpiredEntries(now: number = Date.now()): number {
    return this.withLock((fencingToken, lockFd) => {
      if (!fs.existsSync(this.storeFilePath)) return 0;
      try {
        const content = fs.readFileSync(this.storeFilePath, 'utf8');
        const parsed = JSON.parse(content) || {};
        let initialEpoch = 0;
        if (typeof parsed.__epoch === 'number') {
          initialEpoch = parsed.__epoch;
          delete parsed.__epoch;
        }
        const data: Record<string, RateLimitRecord> = parsed;
        const windowStart = now - this.windowMs;
        let pruned = 0;
        for (const [key, record] of Object.entries(data)) {
          record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
          if (record.timestamps.length === 0) {
            delete data[key];
            pruned++;
          }
        }
        this.writeData(data, initialEpoch, fencingToken, lockFd);
        return pruned;
      } catch {
        return 0;
      }
    });
  }

  clear(): void {
    this.withLock(() => {
      try {
        if (fs.existsSync(this.storeFilePath)) {
          fs.unlinkSync(this.storeFilePath);
        }
      } catch {}
    });
  }
}

/**
 * In-memory atomic rate limiter with sorted multi-key locking.
 */
export class SharedRateLimiter implements RateLimitStore {
  private store: Map<string, RateLimitRecord>;
  private locks: Map<string, Promise<void>>;
  readonly windowMs: number;
  readonly maxPerWindow: number;
  readonly cooldownMs: number;
  readonly maxStoreSize: number;

  constructor(options: RateLimiterOptions = {}, sharedStore?: Map<string, RateLimitRecord>) {
    this.windowMs = options.windowMs ?? options.WINDOW_MS ?? RATE_LIMIT_CONFIG.WINDOW_MS;
    this.maxPerWindow = options.maxPerWindow ?? options.MAX_PER_WINDOW ?? RATE_LIMIT_CONFIG.MAX_PER_WINDOW;
    this.cooldownMs = options.cooldownMs ?? options.COOLDOWN_MS ?? RATE_LIMIT_CONFIG.COOLDOWN_MS;
    this.maxStoreSize = options.maxStoreSize ?? options.MAX_STORE_SIZE ?? RATE_LIMIT_CONFIG.MAX_STORE_SIZE;
    this.store = sharedStore ?? new Map<string, RateLimitRecord>();
    this.locks = new Map<string, Promise<void>>();
  }

  getStoreSize(): number {
    return this.store.size;
  }

  getRecord(key: string): RateLimitRecord | undefined {
    return this.store.get(key);
  }

  clear(): void {
    this.store.clear();
    this.locks.clear();
  }

  pruneExpiredEntries(now: number = Date.now()): number {
    const windowStart = now - this.windowMs;
    let prunedCount = 0;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
        prunedCount++;
      }
    }
    return prunedCount;
  }

  private async withMultiLock<T>(keys: string[], fn: () => T | Promise<T>): Promise<T> {
    const sortedKeys = [...new Set(keys)].sort();
    sortedKeys.unshift('__global_capacity_reservation_lock__');

    for (const key of sortedKeys) {
      while (this.locks.has(key)) {
        try {
          await this.locks.get(key);
        } catch {
          // ignore
        }
      }
    }

    let resolveLocks!: () => void;
    const lockPromise = new Promise<void>((res) => {
      resolveLocks = res;
    });

    for (const key of sortedKeys) {
      this.locks.set(key, lockPromise);
    }

    try {
      return await fn();
    } finally {
      for (const key of sortedKeys) {
        this.locks.delete(key);
      }
      resolveLocks();
    }
  }

  async consumeKeys(keys: string[], now: number = Date.now()): Promise<RateLimitResult> {
    const validKeys = [...new Set(keys.filter((k) => typeof k === 'string' && k.trim().length > 0))];
    if (validKeys.length === 0) {
      return { allowed: true };
    }

    return this.withMultiLock(validKeys, () => {
      return this.atomicEvaluateSync(validKeys, now);
    });
  }

  atomicEvaluateSync(keys: string[], now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs;

    for (const key of keys) {
      const record = this.store.get(key);
      if (record) {
        record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
        if (record.timestamps.length === 0) {
          this.store.delete(key);
        }
      }
    }

    // 2. Multi-key quota and cooldown evaluation
    for (const key of keys) {
      const record = this.store.get(key);
      if (record && record.timestamps.length > 0) {
        const lastTs = record.timestamps[record.timestamps.length - 1];
        if (now - lastTs < this.cooldownMs) {
          const retryAfter = Math.ceil((this.cooldownMs - (now - lastTs)) / 1000);
          return {
            allowed: false,
            retryAfterSeconds: retryAfter,
            error: 'Please wait a moment before sending another message.',
          };
        }

        if (record.timestamps.length >= this.maxPerWindow) {
          const oldest = record.timestamps[0];
          const retryAfter = Math.ceil((oldest + this.windowMs - now) / 1000);
          return {
            allowed: false,
            retryAfterSeconds: retryAfter,
            error: 'Too many inquiries submitted. Please wait a few minutes before trying again or reach out to our concierge directly.',
          };
        }
      }
    }

    // 3. Resilient capacity strategy for new keys:
    // Prevent untrusted public submissions from globally exhausting the shared key budget
    const newKeys = keys.filter((k) => !this.store.has(k));
    if (newKeys.length > 0 && this.store.size + newKeys.length > this.maxStoreSize) {
      this.pruneExpiredEntries(now);
      if (this.store.size + newKeys.length > this.maxStoreSize) {
        const needed = this.store.size + newKeys.length - this.maxStoreSize;
        const keysToEvict: string[] = [];
        const eligibleEntries = Array.from(this.store.entries()).filter(([k]) => !keys.includes(k));

        // Phase 1: Evict un-throttled entries (single-use or low-frequency synthetic keys from rotated submissions)
        // Strictly protects actively throttled quotas (keys with >= maxPerWindow or within burst cooldown)
        const unthrottledEntries = eligibleEntries
          .filter(([, rec]) => {
            const isThrottled = rec.timestamps.length >= this.maxPerWindow;
            const inCooldown =
              rec.timestamps.length > 0 &&
              now - rec.timestamps[rec.timestamps.length - 1] < this.cooldownMs;
            return !isThrottled && !inCooldown;
          })
          .sort((a, b) => {
            if (a[1].timestamps.length !== b[1].timestamps.length) {
              return a[1].timestamps.length - b[1].timestamps.length;
            }
            return a[1].lastUpdated - b[1].lastUpdated;
          });

        for (const [k] of unthrottledEntries) {
          if (keysToEvict.length >= needed) break;
          keysToEvict.push(k);
        }

        for (const k of keysToEvict) {
          this.store.delete(k);
        }

        // Enforce hard storage capacity bound: if store remains full because remaining entries are actively throttled,
        // do NOT insert new keys. Reject while strictly preserving all active throttled quotas intact.
        if (this.store.size + newKeys.length > this.maxStoreSize) {
          return {
            allowed: false,
            retryAfterSeconds: 60,
            error: 'Service is currently experiencing high inquiry volume. Please try again in a few moments or reach out to our concierge directly.',
          };
        }
      }
    }

    for (const key of keys) {
      let record = this.store.get(key);
      if (!record) {
        record = { timestamps: [], lastUpdated: now };
        this.store.set(key, record);
      }
      record.timestamps.push(now);
      record.lastUpdated = now;
    }

    return { allowed: true };
  }
}

/**
 * Factory creating the production rate limit store.
 * Prefers Database RPC store if Supabase is active; otherwise uses cross-process atomic file store.
 */
export function createProductionRateLimitStore(options: RateLimiterOptions = {}): RateLimitStore {
  const isSupabase = checkSupabaseConfigured();
  const hasServiceRole = checkSupabaseServiceRoleConfigured();

  if (isSupabase) {
    if (!hasServiceRole) {
      // Fail closed in production when the service-role key is missing instead of silently using per-instance storage
      return new MisconfiguredRateLimitStore();
    }
    return new DatabaseRpcRateLimitStore();
  }

  // Local development fallback only (when Supabase is completely unconfigured)
  return new CrossProcessRateLimitStore(options);
}

// Active singleton production store
let activeProductionStore: RateLimitStore | null = null;

export function getProductionStore(): RateLimitStore {
  if (!activeProductionStore) {
    activeProductionStore = createProductionRateLimitStore();
  }
  return activeProductionStore;
}

export function setProductionStore(store: RateLimitStore): void {
  activeProductionStore = store;
}

export const defaultContactRateLimiter = new SharedRateLimiter();

/**
 * Convenient helper for single identifier checks through the production store boundary.
 */
export async function checkContactRateLimit(
  identifier: string,
  now: number = Date.now()
): Promise<RateLimitResult> {
  try {
    const hashed = hashRateLimitIdentifier(identifier);
    return await getProductionStore().consumeKeys([hashed], now);
  } catch (error) {
    console.error('[RateLimiter] Configuration error in checkContactRateLimit:', error);
    return {
      allowed: false,
      error: 'Inquiry service is temporarily unavailable due to a server configuration issue. Please connect with our concierge directly.',
    };
  }
}

/**
 * Multi-key atomic helper checking IP and verified email through the production store boundary.
 * Identifiers are mapped to non-reversible keyed HMAC digests before consumption.
 * To prevent quota poisoning (where malicious callers submit victim email addresses to lock them out),
 * caller-chosen form emails are only hard rate-limited if mailbox ownership is verified (isEmailVerified = true).
 */
export async function checkContactRateLimitMulti(
  {
    ip,
    email,
    isEmailVerified = false,
  }: {
    ip?: string;
    email?: string;
    isEmailVerified?: boolean;
  },
  now: number = Date.now()
): Promise<RateLimitResult> {
  try {
    const keys: string[] = [];
    if (ip && ip !== 'unknown') {
      keys.push(hashRateLimitIdentifier(`ip:${ip}`));
    }
    // Only enforce shared hard rate-limiting on email if ownership is verified.
    // Prevents unverified public submissions from poisoning a victim's quota.
    if (email && isEmailVerified) {
      keys.push(hashRateLimitIdentifier(`email:${email}`));
    }
    if (keys.length === 0) {
      return { allowed: true };
    }
    return await getProductionStore().consumeKeys(keys, now);
  } catch (error) {
    console.error('[RateLimiter] Configuration error in checkContactRateLimitMulti:', error);
    return {
      allowed: false,
      error: 'Inquiry service is temporarily unavailable due to a server configuration issue. Please connect with our concierge directly.',
    };
  }
}

export async function resetRateLimitStore(): Promise<void> {
  const store = getProductionStore();
  if (store.clear) {
    await store.clear();
  }
}

export async function pruneExpiredEntries(now: number = Date.now()): Promise<number> {
  const store = getProductionStore();
  if (store.pruneExpiredEntries) {
    return await store.pruneExpiredEntries(now);
  }
  return 0;
}

export async function getRateLimitStoreSize(): Promise<number> {
  const store = getProductionStore();
  if (store.getStoreSize) {
    return await store.getStoreSize();
  }
  return 0;
}

/**
 * Durable scheduled cleanup handler for serverless and cron environments.
 * Authenticates via CRON_SECRET or service credentials and enforces bounded retention.
 */
export async function handlePruneRateLimits(req: Request): Promise<Response> {
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  // Verify authorization
  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) ||
    (!cronSecret && !serviceRoleKey && process.env.NODE_ENV !== 'production');

  if (!isAuthorized) {
    return Response.json(
      { error: 'Unauthorized: Invalid or missing cron secret authorization header.' },
      { status: 401 }
    );
  }

  try {
    let deletedCount = 0;
    try {
      const { createAdminClient } = await import('@/utils/supabase/admin');
      const admin = await createAdminClient();
      if (admin) {
        const { data, error } = await admin.rpc('prune_expired_contact_rate_limits');
        if (error) {
          console.error('[Cron Prune] RPC error:', error);
          return Response.json({ error: error.message }, { status: 500 });
        }
        deletedCount = typeof data === 'number' ? data : 0;
      } else {
        deletedCount = await pruneExpiredEntries();
      }
    } catch {
      deletedCount = await pruneExpiredEntries();
    }

    return Response.json({
      success: true,
      pruned: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron Prune] Unexpected failure during rate limit pruning:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Pruning failed' },
      { status: 500 }
    );
  }
}

