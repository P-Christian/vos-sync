// src/lib/mail/transporter.ts
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const hostUrl = process.env.HOST_URL || "http://localhost:3010";

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: {
    user,
    pass,
  },
});

export const MAIL_FROM =
  process.env.SMTP_FROM || `"VOS Sync" <no-reply@vossync.com>`;
