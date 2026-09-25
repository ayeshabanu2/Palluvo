'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export default function ContactPage() {
  const { showToast } = useStore();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Styling Assistance',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    showToast('Your inquiry has been received. Our atelier stylist will reach out promptly.');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      <div className="text-center max-w-xl mx-auto">
        <span className="text-xs uppercase tracking-[0.25em] text-[#B08D57] font-semibold block mb-2">
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
          <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] flex items-start gap-4 shadow-xs">
            <Phone className="w-5 h-5 text-[#641C2D] flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-serif text-base font-bold text-[#2B211D]">Phone & WhatsApp Concierge</h3>
              <p className="text-xs text-[#8E857B] mt-1">+91 84988 54323 / +91 81067 89789</p>
              <p className="text-[11px] text-[#641C2D] mt-1 font-semibold">Available Mon–Sat: 10 AM – 7 PM IST</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] flex items-start gap-4 shadow-xs">
            <Mail className="w-5 h-5 text-[#641C2D] flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-serif text-base font-bold text-[#2B211D]">Email Concierge</h3>
              <p className="text-xs text-[#8E857B] mt-1">contact@palluvo.com</p>
              <p className="text-xs text-[#8E857B]">concierge@palluvo.com</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#EDE3D5] flex items-start gap-4 shadow-xs">
            <MapPin className="w-5 h-5 text-[#641C2D] flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-serif text-base font-bold text-[#2B211D]">Flagship Atelier</h3>
              <p className="text-xs text-[#8E857B] mt-1">
                PALLUVO Couture Atelier<br />
                Kavuri Hills Road, Madhapur, Hitech City<br />
                Hyderabad, Telangana 500081, India
              </p>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-[#EDE3D5] shadow-xs">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#2B211D]">Inquiry Dispatched</h3>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Mobile / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91..."
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                    Inquiry Topic
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-2.5 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2B211D] mb-1">
                  How may we assist you? *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Share your wedding theme, date, preference of weave or any specific questions..."
                  className="w-full bg-[#F8F5EF] border border-[#EDE3D5] rounded-lg p-3 text-xs text-[#2B211D] focus:outline-none focus:border-[#641C2D]"
                />
              </div>

              <button
                type="submit"
                className="bg-[#641C2D] hover:bg-[#4E1422] text-white px-8 py-3.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-md transition"
              >
                <Send className="w-3.5 h-3.5" /> Submit Inquiry
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
