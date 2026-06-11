import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { SUPPORT_EMAIL } from '@/lib/constants';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim().slice(0, 200);
    const email = String(body.email ?? '').trim().slice(0, 320);
    const subject = String(body.subject ?? '').trim().slice(0, 300);
    const message = String(body.message ?? '').trim().slice(0, 5000);

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'Consult6 Contact Form <onboarding@resend.dev>',
      to: [process.env.CONTACT_EMAIL ?? SUPPORT_EMAIL],
      replyTo: email,
      subject: subject ? `[Consult6] ${subject}` : `[Consult6] New message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #CC5500; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 18px;">New Contact Form Submission</h2>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 8px;"><strong>Name:</strong> ${safeName}</p>
            <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
            ${subject ? `<p style="margin: 0 0 8px;"><strong>Subject:</strong> ${safeSubject}</p>` : ''}
            <p style="margin: 16px 0 8px;"><strong>Message:</strong></p>
            <div style="background: white; border: 1px solid #e5e5e5; border-radius: 6px; padding: 16px;">
              <p style="margin: 0; white-space: pre-wrap; color: #333;">${safeMessage}</p>
            </div>
            <p style="margin: 16px 0 0; font-size: 12px; color: #999;">Reply directly to this email to respond to ${safeName}.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
