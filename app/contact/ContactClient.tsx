'use client';
import { useState } from 'react';
import Link from 'next/link';
import InfoNav from '@/components/InfoNav';

const inputStyle = {
  background: '#2a2a2a',
  border: '1px solid #333',
  borderRadius: 8,
  color: '#f0f0f0',
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box' as const,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

export default function ContactClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  function fieldStyle(field: string) {
    return { ...inputStyle, border: `1px solid ${focused === field ? '#CC5500' : '#333'}` };
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1e1e1e', color: '#f0f0f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`input::placeholder, textarea::placeholder { color: #4a4a4a !important; }`}</style>
      <InfoNav />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '72px 24px 96px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#CC5500', letterSpacing: 3, marginBottom: 12 }}>CONTACT US</p>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: '#f0f0f0', margin: '0 0 8px', letterSpacing: -1, lineHeight: 1.15 }}>We&apos;d love to hear from you</h1>
        <p style={{ fontSize: 13, color: '#555', margin: '0 0 40px' }}>General enquiries, enterprise pricing, and support</p>

        {status === 'success' ? (
          <div style={{ background: '#232323', border: '1px solid #2f2f2f', borderRadius: 12, padding: '48px 32px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#0d2a18', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22, color: '#4ade80' }}>✓</div>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f0', margin: '0 0 10px' }}>Message sent</p>
            <p style={{ fontSize: 15, color: '#777', margin: 0, lineHeight: 1.6 }}>Thanks for reaching out — we&apos;ll get back to you within one business day.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit} style={{ background: '#232323', border: '1px solid #2f2f2f', borderRadius: 12, padding: '32px', marginBottom: 32 }}>
            <div className="contact-name-email-grid" style={{ marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Name <span style={{ color: '#CC5500' }}>*</span></label>
                <input
                  required
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  style={fieldStyle('name')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Email <span style={{ color: '#CC5500' }}>*</span></label>
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  style={fieldStyle('email')}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Subject <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Enterprise pricing, account question..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
                onFocus={() => setFocused('subject')}
                onBlur={() => setFocused(null)}
                style={fieldStyle('subject')}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Message <span style={{ color: '#CC5500' }}>*</span></label>
              <textarea
                required
                rows={6}
                placeholder="How can we help?"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onFocus={() => setFocused('message')}
                onBlur={() => setFocused(null)}
                style={{ ...fieldStyle('message'), resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{ background: status === 'loading' ? '#994000' : '#CC5500', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 24px', fontSize: 15, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', width: '100%' }}
            >
              {status === 'loading' ? 'Sending…' : 'Send message'}
            </button>
            {status === 'error' && (
              <p style={{ color: '#f87171', fontSize: 13, margin: '12px 0 0', textAlign: 'center' }}>
                Something went wrong. Please try emailing us directly at{' '}
                <a href="mailto:consult6testing@gmail.com" style={{ color: '#f87171' }}>consult6testing@gmail.com</a>
              </p>
            )}
          </form>
        )}

        {/* General enquiries */}
        <div style={{ background: '#232323', border: '1px solid #2f2f2f', borderRadius: 12, padding: '28px 32px', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', margin: '0 0 6px' }}>General enquiries &amp; support</p>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 14px' }}>For account issues, billing questions, or anything else, email us directly:</p>
          <p style={{ fontSize: 15, color: '#CC5500', fontWeight: 600, margin: 0 }}>consult6testing@gmail.com</p>
        </div>

        {/* Enterprise */}
        <div style={{ background: '#111f14', border: '1px solid #16a34a55', borderRadius: 12, padding: '28px 32px', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', margin: '0 0 6px' }}>Enterprise &amp; custom pricing</p>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 14px' }}>
            Looking for a team plan, custom usage limits, or a tailored pricing package? Email us and tell us about your organisation:
          </p>
          <p style={{ fontSize: 15, color: '#CC5500', fontWeight: 600, margin: 0 }}>consult6testing@gmail.com</p>
        </div>

        {/* Response time */}
        <div style={{ background: '#1e1e1e', border: '1px solid #2d2d2d', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.7 }}>
            We typically respond within one business day. For urgent account or billing issues, please include as much detail as possible so we can help quickly.
          </p>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid #272727', padding: '24px 40px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, background: '#CC5500', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff' }}>6</div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#888' }}>Consult6</span>
            </div>
            <span style={{ fontSize: 13, color: '#484848' }}>© {new Date().getFullYear()} Consult6. All rights reserved.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/about" style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>About</Link>
            <Link href="/privacy" style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>Terms</Link>
            <Link href="/contact" style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
