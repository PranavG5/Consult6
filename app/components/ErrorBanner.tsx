'use client';
import { useState } from 'react';

export default function ErrorBanner({ title, message, onDismiss }: { title: string; message: string; onDismiss?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{ background: '#1a0a0a', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <div>
        <p style={{ color: '#f87171', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{title}</p>
        <p style={{ color: '#aaa', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{message}</p>
      </div>
      <button onClick={() => { setDismissed(true); onDismiss?.(); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
    </div>
  );
}
