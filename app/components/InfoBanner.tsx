'use client';
import { useState } from 'react';

export default function InfoBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.35)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <p style={{ color: '#fbbf24', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{message}</p>
      <button onClick={() => { setDismissed(true); onDismiss?.(); }} style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
    </div>
  );
}
