'use client';

import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';

/**
 * Custom hook to lock body scrolling when a modal or drawer is open.
 * Supports reference counting to prevent premature unlocking when multiple overlays are stacked.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow || '';
      }
    };
  }, [isLocked]);
}
