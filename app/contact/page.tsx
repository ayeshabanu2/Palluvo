'use client';

import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';

export default function ContactPage() {
  const { showToast } = useShop();

  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    email: '',
    inquiryType: 'Bridal Trousseau Consultation',
    date: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.phone.trim() || !formState.email.trim()) {
      showToast('Please fill out all required fields', 'error');
      return;
    }
    setSubmitted(true);
    showToast('Your consultation inquiry has been received. Our senior stylist will connect with you within 2 hours.', 'success');
  };

  return (
    <div className="contact-page">
      {/* 1. HERO HEADER */}
      <section className="contact-hero-section">
        <div className="container">
          <div className="contact-hero-content text-center">
            <span className="section-eyebrow">CLIENT CONCIERGE &amp; ATELIER</span>
            <h1 className="contact-hero-title">Connect with PALLUVO</h1>
            <p className="contact-hero-lead">
              Whether seeking personalized bridal trousseau guidance, custom blouse stitching, or regional handloom inquiries, our concierge is at your service.
            </p>
          </div>
        </div>
      </section>

      {/* 2. CHANNELS GRID */}
      <section className="contact-channels-section">
        <div className="container">
          <div className="contact-channels-grid">
            {/* Phone Support */}
            <div className="contact-channel-card">
              <span className="channel-icon">📞</span>
              <h3>Telephone Concierge</h3>
              <p>Speak directly with our senior styling team.</p>
              <div className="channel-links">
                <a href="tel:+918498854323" className="channel-highlight-link">
                  +91 84988 54323 (Direct Concierge)
                </a>
                <a href="tel:+918106789789" className="channel-sub-link">
                  +91 81067 89789 (Bridal Trousseau Desk)
                </a>
              </div>
              <span className="channel-hours">Mon–Sat: 10:00 AM – 7:00 PM IST</span>
            </div>

            {/* WhatsApp Concierge */}
            <div className="contact-channel-card highlight-card">
              <span className="channel-icon">💬</span>
              <h3>WhatsApp Stylist Desk</h3>
              <p>Instant video showcase &amp; fabric draping photos.</p>
              <div className="channel-links">
                <a
                  href="https://wa.me/918498854323?text=Namaste%20PALLUVO!%20I%20would%20like%20styling%20advice%20for%20an%20upcoming%20occasion."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-block whatsapp-cta-btn"
                >
                  START WHATSAPP CHAT &rarr;
                </a>
              </div>
              <span className="channel-hours">Available 7 Days &bull; 9:00 AM – 9:00 PM IST</span>
            </div>

            {/* Email Support */}
            <div className="contact-channel-card">
              <span className="channel-icon">✉️</span>
              <h3>Official Correspondence</h3>
              <p>For custom bridal orders, corporate gifting &amp; orders.</p>
              <div className="channel-links">
                <a href="mailto:contact@palluvo.com" className="channel-highlight-link">
                  contact@palluvo.com
                </a>
              </div>
              <span className="channel-hours">Guaranteed response within 4 hours</span>
            </div>

            {/* Flagship Atelier */}
            <div className="contact-channel-card">
              <span className="channel-icon">🏛️</span>
              <h3>Flagship Atelier</h3>
              <p>Experience museum-grade weaves in person.</p>
              <address className="atelier-address">
                Kavuri Hills Road, Madhapur, Hitech City,<br />
                Hyderabad, Telangana 500081, India
              </address>
              <span className="channel-hours">Boutique: Tue–Sun: 11:00 AM – 8:00 PM IST</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CONSULTATION FORM & FAQ */}
      <section className="contact-form-section">
        <div className="container">
          <div className="contact-split-grid">
            {/* Form Column */}
            <div className="contact-form-box">
              <div className="form-header">
                <span className="section-eyebrow">PERSONAL TROUSSEAU CONCIERGE</span>
                <h2 className="form-title">Book a Styling Appointment</h2>
                <p className="form-subtitle">
                  Fill in your details below and our handloom curator will reach out via WhatsApp or phone with tailored recommendations.
                </p>
              </div>

              {submitted ? (
                <div className="form-success-card" style={{ padding: '2rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '2.5rem' }}>✨</span>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: '#166534', marginTop: '0.8rem', marginBottom: '0.5rem' }}>
                    Thank You, {formState.name}
                  </h3>
                  <p style={{ color: '#15803D', lineHeight: 1.6 }}>
                    Your request for a <strong>{formState.inquiryType}</strong> has been logged. Our senior stylist will connect with you at <strong>{formState.phone}</strong> shortly.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: '1.5rem' }}
                    onClick={() => {
                      setSubmitted(false);
                      setFormState({
                        name: '',
                        phone: '',
                        email: '',
                        inquiryType: 'Bridal Trousseau Consultation',
                        date: '',
                        message: ''
                      });
                    }}
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="concierge-inquiry-form">
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Your Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Radhika Sharma"
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Mobile / WhatsApp Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +91 98765 43210"
                        value={formState.phone}
                        onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. radhika@example.com"
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Inquiry Nature</label>
                      <select
                        value={formState.inquiryType}
                        onChange={(e) => setFormState({ ...formState, inquiryType: e.target.value })}
                        className="form-control"
                      >
                        <option value="Bridal Trousseau Consultation">Bridal Trousseau Consultation</option>
                        <option value="Custom Blouse Tailoring & Sizing">Custom Blouse Tailoring &amp; Sizing</option>
                        <option value="Atelier Private Appointment (Hyderabad)">Atelier Private Appointment (Hyderabad)</option>
                        <option value="Handloom Heritage Inquiry">Handloom Heritage Inquiry</option>
                        <option value="Corporate / Bulk Gifting">Corporate / Bulk Gifting</option>
                        <option value="Order Tracking & Support">Order Tracking &amp; Support</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Approximate Wedding / Occasion Date (Optional)</label>
                    <input
                      type="date"
                      value={formState.date}
                      onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Tell us about your style preference or questions</label>
                    <textarea
                      rows={4}
                      placeholder="e.g. Looking for an authentic Kanjivaram in jewel tones for my sister's wedding reception, with a tailored deep sweetheart blouse..."
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      className="form-control"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block submit-inquiry-btn">
                    REQUEST PERSONAL STYLIST CONSULTATION &rarr;
                  </button>
                </form>
              )}
            </div>

            {/* FAQ Column */}
            <div className="contact-faq-box" id="faq">
              <span className="section-eyebrow">COMMON QUERIES</span>
              <h2 className="faq-title">Concierge FAQs</h2>

              <div className="faq-list">
                <div className="faq-item">
                  <h4>How do I know my saree is 100% pure silk?</h4>
                  <p>
                    Every silk saree from PALLUVO arrives with an authorized Silk Mark tag featuring a hologram and individual QR code that can be authenticated directly on the central Silk Mark Organisation of India portal.
                  </p>
                </div>

                <div className="faq-item">
                  <h4>What is included with my saree?</h4>
                  <p>
                    Every drape includes a standard full 5.5-meter body, an additional 0.8-meter matching or contrast unstitched pure silk blouse piece, complimentary fall and pico edging, and a breathable keepsake saree storage box.
                  </p>
                </div>

                <div className="faq-item">
                  <h4>How long does express shipping take?</h4>
                  <p>
                    Orders placed before 2:00 PM IST are dispatched on the same business day. Delivery via Blue Dart Air typically takes 24–48 hours for metros (Delhi, Mumbai, Bengaluru, Chennai, Kolkata) and 2–4 business days for other tier-1/tier-2 cities.
                  </p>
                </div>

                <div className="faq-item">
                  <h4>Can I book a private viewing in Hyderabad?</h4>
                  <p>
                    Yes! Our flagship atelier in Kavuri Hills, Madhapur offers private trousseau appointments with personalized champagne tea service, custom blouse measurements, and draping masterclasses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
