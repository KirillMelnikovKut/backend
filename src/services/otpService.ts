import crypto from 'crypto';
import { addMinutes, isBefore } from 'date-fns';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

type OtpPurpose = 'REGISTER' | 'LOGIN' | 'PASSWORD_RESET';

export function generateOtpCode(length = 6): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export async function createOtpForUser(params: {
  userId: string;
  purpose: OtpPurpose;
  sentTo: string;
}) {
  const code = generateOtpCode();
  const expiresAt = addMinutes(new Date(), env.OTP_EXP_MINUTES);

  const otp = await prisma.otpCode.create({
    data: {
      userId: params.userId,
      purpose: params.purpose,
      code,
      expiresAt,
      sentTo: params.sentTo,
    },
  });

  return otp;
}

export async function verifyOtp(params: {
  userId: string;
  purpose: OtpPurpose;
  code: string;
}) {
  const otp = await prisma.otpCode.findFirst({
    where: {
      userId: params.userId,
      purpose: params.purpose,
      code: params.code,
      usedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return false;
  if (isBefore(otp.expiresAt, new Date())) {
    return false;
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  return true;
}

export function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}


