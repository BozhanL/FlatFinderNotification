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

  await Promise.all(
    to
      .map((address) => ({
        from: process.env["SMTP_FROM"],
        to: address,
        bcc: process.env["SMTP_FROM"],
        subject,
        text: body,
      }))
      .map((email) => transporter.sendMail(email)),
  );
}
