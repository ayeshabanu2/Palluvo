import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function NotFound(): React.JSX.Element {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-2xl border border-[#EDE3D5] shadow-sm">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#641C2D]/10 flex items-center justify-center text-[#641C2D]">
          <Sparkles className="w-8 h-8 text-[#B08D57]" />
        </div>
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-bold block">
            404 Error
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
            Saree Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[#6D625D] leading-relaxed">
            The requested drape or atelier collection page might have been archived, renamed, or moved.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sarees"
            className="bg-[#641C2D] hover:bg-[#4E1422] text-white px-6 py-3 rounded-full text-xs font-semibold tracking-wider uppercase transition shadow-md inline-flex items-center justify-center gap-2"
          >
            Explore All Sarees
          </Link>
          <Link
            href="/"
            className="border border-[#EDE3D5] hover:bg-[#F8F5EF] text-[#2B211D] px-6 py-3 rounded-full text-xs font-semibold tracking-wider uppercase transition inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
