// src/modules/school-admin/job-referrals/services/job-referrals.helpers.ts
import crypto from 'crypto';

export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateReferralToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user.charAt(0)}***@${domain}`;
  }
  return `${user.slice(0, 2)}***${user.charAt(user.length - 1)}@${domain}`;
}

export function formatSalary(min?: number | null, max?: number | null, currency: string = 'PHP'): string {
  if (!min && !max) return 'Competitive';
  const fmt = (val: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency || 'PHP',
      maximumFractionDigits: 0,
    }).format(val);

  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return 'Competitive';
}

export function getExpirationDate(days: number = 30): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function markdownToHtml(md: string): string {
  if (!md) return '';
  return md
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Bullet points
    .replace(/^\s*[-*]\s+(.*)$/gm, '<li style="margin-bottom: 4px;">$1</li>')
    // Linebreaks
    .replace(/\n\n+/g, '</p><p style="margin: 0 0 12px; line-height: 1.6; color: #334155;">')
    .replace(/\n/g, '<br/>');
}
