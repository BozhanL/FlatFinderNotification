import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer/index.js";

const transporter = nodemailer.createTransport({
  host: process.env["SMTP_HOST"],
  port: 465,
  secure: true,
  auth: {
    user: process.env["SMTP_USER"],
    pass: process.env["SMTP_PASS"],
  },
});

export async function sendEmail(
  to: (Mail.Address | string)[],
  subject: string,
  body: string,
) {
  try {
    await transporter.verify();
  } catch (e) {
    console.error("Email transporter verification failed:", e);
    return;
  }

  await transporter.sendMail({
    from: process.env["SMTP_FROM"],
    to: process.env["SMTP_FROM"],
    bcc: to,
    subject,
    text: body,
  });
}
