import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { createOtpForUser, verifyOtp } from './otpService';
import { sendOtpEmail } from './emailService';

const SALT_ROUNDS = 10;

export async function registerRequestOtp(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      isActive: false,
    },
  });

  const otp = await createOtpForUser({
    userId: user.id,
    purpose: 'REGISTER',
    sentTo: email,
  });

  await sendOtpEmail({ to: email, code: otp.code, purpose: 'Регистрация' });
}

function signJwt(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
}

export async function registerVerifyOtp(email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  const ok = await verifyOtp({ userId: user.id, purpose: 'REGISTER', code });
  if (!ok) throw new Error('Invalid or expired code');

  if (!user.isActive) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true },
    });
  }

  const token = signJwt(user.id);
  return { token };
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const token = signJwt(user.id);
  return { token };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    // чтобы не палить существование email, отвечаем ок, но ничего не делаем
    return;
  }

  const otp = await createOtpForUser({
    userId: user.id,
    purpose: 'PASSWORD_RESET',
    sentTo: email,
  });

  await sendOtpEmail({ to: email, code: otp.code, purpose: 'Сброс пароля' });
}

export async function confirmPasswordReset(email: string, code: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  const ok = await verifyOtp({ userId: user.id, purpose: 'PASSWORD_RESET', code });
  if (!ok) throw new Error('Invalid or expired code');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
}


