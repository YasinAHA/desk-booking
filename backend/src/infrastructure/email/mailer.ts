import nodemailer from "nodemailer";

import { env } from "../../config/env.js";

type SendEmailParams = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        }
        : undefined,
});

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
    return transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html,
        text,
    });
}
