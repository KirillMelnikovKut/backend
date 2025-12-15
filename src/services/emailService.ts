import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error('SMTP is not configured in environment variables');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function sendOtpEmail(params: { to: string; code: string; purpose: string }) {
  const tr = getTransporter();

  const subject = `Ваш код подтверждения (${params.purpose})`;
  const text = `Ваш одноразовый код: ${params.code}\n\nСрок действия ограничен по времени. Если вы не запрашивали этот код, просто проигнорируйте письмо.`;

  await tr.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: params.to,
    subject,
    text,
  });
}


