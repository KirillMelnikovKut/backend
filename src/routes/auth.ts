import { Router } from 'express';
import { z } from 'zod';
import {
  registerRequestOtp,
  registerVerifyOtp,
  loginWithPassword,
  requestPasswordReset,
  confirmPasswordReset,
} from '../services/authService';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Проверка состояния сервера
 *     responses:
 *       200:
 *         description: Сервер работает
 */

/**
 * @openapi
 * /auth/register/request-otp:
 *   post:
 *     summary: Запрос OTP-кода для регистрации
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Код отправлен на email
 *       400:
 *         description: Ошибка валидации или бизнес-логики
 */

router.post('/register/request-otp', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    await registerRequestOtp(parsed.data.email, parsed.data.password);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Unable to request OTP' });
  }
});

/**
 * @openapi
 * /auth/register/verify-otp:
 *   post:
 *     summary: Подтверждение регистрации по OTP
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешная регистрация, возвращается JWT
 *       400:
 *         description: Неверный или истёкший код
 */
router.post('/register/verify-otp', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    code: z.string().min(4),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await registerVerifyOtp(parsed.data.email, parsed.data.code);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Unable to verify OTP' });
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Вход по email и паролю (без OTP)
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Успешный вход, возвращается JWT
 *       400:
 *         description: Неверные креденшелы или ошибка
 */
router.post('/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await loginWithPassword(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Unable to login' });
  }
});

/**
 * @openapi
 * /auth/password/reset/request:
 *   post:
 *     summary: Запрос OTP для восстановления пароля
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Всегда success, даже если пользователя нет
 */
router.post('/password/reset/request', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    await requestPasswordReset(parsed.data.email);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Unable to request password reset' });
  }
});

/**
 * @openapi
 * /auth/password/reset/confirm:
 *   post:
 *     summary: Подтверждение восстановления пароля по OTP
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Пароль успешно изменён
 *       400:
 *         description: Неверный код или ошибка
 */
router.post('/password/reset/confirm', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    code: z.string().min(4),
    newPassword: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    await confirmPasswordReset(parsed.data.email, parsed.data.code, parsed.data.newPassword);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Unable to reset password' });
  }
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Получить профиль текущего пользователя
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Профиль пользователя
 *       401:
 *         description: Неавторизован
 */
router.get('/me', authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string | undefined;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

export default router;


