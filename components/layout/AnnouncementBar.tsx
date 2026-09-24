'use client';

import React from 'react';
import Link from 'next/link';

export const AnnouncementBar: React.FC = () => {
  return (
    <div className="announcement-bar">
      <div className="announcement-content">
        <span>✨ Complimentary express insured delivery across India on orders above ₹2,999 • 100% Pure Silk Mark Certified</span>
        <span className="announcement-separator">•</span>
        <Link href="/sarees" className="announcement-link">
          Use code <strong>FESTIVE25</strong> for 25% off &rarr;
        </Link>
      </div>
    </div>
  );
};
