'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mail, Phone, MapPin, CheckCircle2, ExternalLink, MessageSquare } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { submitContactInquiry } from './actions';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export default function ContactClient(): React.JSX.Element {
  const { showToast } = useStore();
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: 'Styling Assistance',
    message: ''
  });
  const confirmationRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (submitted && confirmationRef.current) {
      confirmationRef.current.focus();
    }
  }, [submitted]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await submitContactInquiry(formData);
      if (res.success) {
        setSubmitted(true);
        showToast('Your inquiry has been received. Our atelier stylist will reach out promptly.');
      } else {
        showToast(res.error || 'Failed to record inquiry. Please reach out to our concierge directly.');
      }
    } catch {
      showToast('A network error occurred. Please try again or reach out via WhatsApp/phone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      <div className="text-center max-w-xl mx-auto">
        <span className="text-xs uppercase tracking-[0.25em] text-[#641C2D] font-semibold block mb-2">
          Concierge & Client Care
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2B211D]">
          Connect With Our Atelier
        </h1>
        <div className="w-16 h-0.5 bg-[#B08D57] mx-auto mt-4 mb-4" />
        <p className="text-xs sm:text-sm text-[#6D625D]">
          Our personal stylists and master weavers are here to assist with custom draping recommendations, bridal trousseau curation, and bespoke orders.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Contact Info Cards */}
        <div className="space-y-4">
          {/* Phone & WhatsApp Concierge */}
          <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] flex items-start gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#641C2D]/10 text-[#641C2D] flex items-center justify-center shrink-0 mt-0.5">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-base font-bold text-[#2B211D]">Phone & WhatsApp Concierge</h3>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <a href="tel:+918897776984" className="font-medium text-[#2B211D] hover:text-[#641C2D] transition">
                    +91 88977 76984
                  </a>
                  <a 
                    href="https://wa.me/918897776984" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                  >
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <a href="tel:+918498854323" className="font-medium text-[#2B211D] hover:text-[#641C2D] transition">
                    +91 84988 54323
                  </a>
                  <a 
                    href="https://wa.me/918498854323" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                  >
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <a href="tel:+918106789789" className="font-medium text-[#2B211D] hover:text-[#641C2D] transition">
                    +91 81067 89789
                  </a>
                  <a 
                    href="https://wa.me/918106789789" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                  >
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-[#641C2D] mt-2 font-semibold">Available Mon to Sat: 10 AM to 7 PM IST</p>
            </div>
          </div>

          {/* Email Concierge */}
          <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] flex items-start gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#641C2D]/10 text-[#641C2D] flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#2B211D]">Email Concierge</h3>
              <p className="text-xs text-[#665E57] mt-1">
                <a href="mailto:info@palluvo.store" className="font-semibold text-[#641C2D] hover:underline">
                  info@palluvo.store
                </a>
              </p>
              <p className="text-[11px] text-[#6D625D] mt-1">
                For order status, bespoke draping advice, and bulk trousseau inquiries.
              </p>
            </div>
          </div>

          {/* Flagship Atelier & Location Map */}
          <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] flex items-start gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#641C2D]/10 text-[#641C2D] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-base font-bold text-[#2B211D]">Flagship Boutique & Atelier</h3>
              <p className="text-xs text-[#665E57] mt-1 leading-relaxed">
                PALLUVO Couture Atelier<br />
                Hyderabad, Telangana, India
              </p>
              <a
                href="https://maps.app.goo.gl/wkcLwsNgHp39z4pe7"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#641C2D] font-bold mt-2.5 hover:text-[#4E1422] transition underline underline-offset-4"
              >
                <span>View on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-[#EDE3D5] shadow-xs">
          {submitted ? (
            <div className="text-center py-12 space-y-4" role="status" aria-live="polite">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 
                ref={confirmationRef} 
                tabIndex={-1} 
                className="font-serif text-2xl font-bold text-[#2B211D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D] rounded"
              >
                Inquiry Dispatched
              </h3>
              <p className="text-xs text-[#6D625D] max-w-md mx-auto">
                Thank you for contacting PALLUVO. Our dedicated saree stylist will review your request and get back to you within 4 business hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="bg-[#641C2D] text-white px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider"
              >
                Send Another Note
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Your Name *
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:border-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Email Address *
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:border-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Mobile / WhatsApp
                  </label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91"
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:border-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Inquiry Topic
                  </label>
                  <select
                    id="contact-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:border-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                  >
                    <option value="Styling Assistance">Styling & Draping Advice</option>
                    <option value="Bridal Trousseau">Bridal Trousseau Curation</option>
                    <option value="Order Tracking">Order & Shipping Status</option>
                    <option value="Custom Blouse Stitching">Custom Blouse Consultation</option>
                    <option value="Weave Authenticity">Silk Mark & Weave Inquiry</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                  How may we assist you? *
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Share your wedding theme, date, preference of weave or any specific questions"
                  className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-3 text-xs text-[#2B211D] focus:border-[#641C2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#641C2D]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#641C2D] hover:bg-[#4E1422] disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase transition shadow-md inline-flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
