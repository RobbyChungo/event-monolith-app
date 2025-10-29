// src/services/email.service.ts

// ✅ Minimal mock email sender
export function sendEmail(to: string, subject: string, html: string): boolean {
  console.log("[email.send]", { to, subject, html });
  return true;
}
