'use client';

import React from 'react';

export const WhatsAppConcierge: React.FC = () => {
  const whatsappUrl = `https://wa.me/918498854323?text=${encodeURIComponent(
    'Namaste PALLUVO! I would like personal styling assistance and draping recommendations for an upcoming occasion.'
  )}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-concierge-float"
      aria-label="Connect with PALLUVO Saree Stylist Concierge on WhatsApp"
      title="Chat with PALLUVO Stylist"
    >
      <span className="concierge-tooltip">Stylist Online • Chat Now</span>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.004.577 1.764.787 2.806.787 3.18 0 5.767-2.587 5.767-5.768.002-3.181-2.583-5.768-5.768-5.768zm7.404 5.765c0 4.093-3.321 7.414-7.404 7.414-1.28 0-2.457-.34-3.551-.952l-3.98.995 1.054-3.864c-.732-1.168-1.127-2.493-1.127-3.593 0-4.092 3.321-7.413 7.404-7.413 4.093 0 7.404 3.321 7.404 7.413z" />
      </svg>
    </a>
  );
};
