'use client';

import React from 'react';
import { useStore } from '@/context/StoreContext';
import { CheckCircle2 } from 'lucide-react';

export default function Toast() {
  const { toastMessage } = useStore();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-[#2B211D] text-white px-5 py-3.5 rounded-lg shadow-2xl border border-[#B08D57]/40 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#D6B878] flex-shrink-0" />
        <span className="text-xs font-medium tracking-wide">{toastMessage}</span>
      </div>
    </div>
  );
}
