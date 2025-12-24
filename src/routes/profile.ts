import { Router } from 'express';
import { z } from 'zod';
import {
  getUserProfile,
  getUserStats,
  getUserCoursesWithProgress,
  getUserCourseDetailedProgress,
  updateUserProfile,
  getUserAchievements,
} from '../services/profileService';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Все роуты требуют авторизации
router.use(authMiddleware);

/**
 * @openapi
 * /profile:
 *   get:
 *     summary: Получить профиль пользователя с прогрессом
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Профиль пользователя
 *       401:
 *         description: Неавторизован
 */
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    const profile = await getUserProfile(userId);
    res.json(profile);
  } catch (e: any) {
    if (e.message === 'User not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: e.message || 'Unable to fetch profile' });
  }
});

/**
 * @openapi
 * /profile:
 *   put:
 *     summary: Обновить профиль пользователя
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Профиль обновлен
 *       400:
 *         description: Ошибка валидации
 */
router.put('/', async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const schema = z.object({
    phone: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const profile = await updateUserProfile(userId, parsed.data);
    res.json(profile);
  } catch (e: any) {
    if (e.message === 'User not found') {
      return res.status(404).json({ error: e.message });
    }
    if (e.message === 'Phone number already in use') {
      return res.status(409).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to update profile' });
  }
});

/**
 * @openapi
 * /profile/stats:
 *   get:
 *     summary: Получить статистику пользователя
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Статистика пользователя
 */
router.get('/stats', async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    const stats = await getUserStats(userId);
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unable to fetch stats' });
  }
});

/**
 * @openapi
 * /profile/courses:
 *   get:
 *     summary: Получить все курсы пользователя с детальным прогрессом
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Список курсов с прогрессом
 */
router.get('/courses', async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    const courses = await getUserCoursesWithProgress(userId);
    res.json(courses);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unable to fetch courses' });
  }
});

/**
 * @openapi
 * /profile/courses/{courseId}:
 *   get:
 *     summary: Получить детальный прогресс по конкретному курсу
 *     tags:
 *       - Profile
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Детальный прогресс по курсу
 *       404:
 *         description: Прогресс не найден
 */
router.get('/courses/:courseId', async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { courseId } = req.params;

  try {
    const progress = await getUserCourseDetailedProgress(userId, courseId);
    if (!progress) {
      return res.status(404).json({ error: 'Course progress not found' });
    }
    res.json(progress);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unable to fetch course progress' });
  }
});

/**
 * @openapi
 * /profile/achievements:
 *   get:
 *     summary: Получить достижения пользователя
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Список достижений
 */
router.get('/achievements', async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    const achievements = await getUserAchievements(userId);
    res.json(achievements);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unable to fetch achievements' });
  }
});

export default router;

