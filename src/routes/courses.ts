import { Router } from 'express';
import { z } from 'zod';
import {
  getAllCourses,
  getCourseById,
  getLessonById,
  updateLessonProgress,
  submitAssignment,
  getUserCoursesProgress,
  getUserCourseProgress,
} from '../services/courseService';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /courses:
 *   get:
 *     summary: Получить список всех активных курсов
 *     tags:
 *       - Courses
 *     responses:
 *       200:
 *         description: Список курсов
 */
router.get('/', async (_req, res) => {
  try {
    const courses = await getAllCourses();
    res.json(courses);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unable to fetch courses' });
  }
});

/**
 * @openapi
 * /courses/{courseId}:
 *   get:
 *     summary: Получить детальную информацию о курсе
 *     tags:
 *       - Courses
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
 *         description: Информация о курсе
 *       404:
 *         description: Курс не найден
 */
router.get('/:courseId', authMiddleware, async (req: AuthRequest, res) => {
  const { courseId } = req.params;
  const userId = req.userId;

  try {
    const course = await getCourseById(courseId, userId);
    res.json(course);
  } catch (e: any) {
    if (e.message === 'Course not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: e.message || 'Unable to fetch course' });
  }
});

/**
 * @openapi
 * /courses/{courseId}/lessons/{lessonId}:
 *   get:
 *     summary: Получить детальную информацию об уроке
 *     tags:
 *       - Courses
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Информация об уроке
 *       404:
 *         description: Урок не найден
 */
router.get(
  '/:courseId/lessons/:lessonId',
  authMiddleware,
  async (req: AuthRequest, res) => {
    const { lessonId } = req.params;
    const userId = req.userId;

    try {
      const lesson = await getLessonById(lessonId, userId);
      res.json(lesson);
    } catch (e: any) {
      if (e.message === 'Lesson not found') {
        return res.status(404).json({ error: e.message });
      }
      res.status(500).json({ error: e.message || 'Unable to fetch lesson' });
    }
  }
);

/**
 * @openapi
 * /courses/{courseId}/lessons/{lessonId}/progress:
 *   put:
 *     summary: Обновить прогресс прохождения урока
 *     tags:
 *       - Courses
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [progressPercent]
 *             properties:
 *               progressPercent:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Прогресс обновлен
 *       400:
 *         description: Ошибка валидации
 */
router.put(
  '/:courseId/lessons/:lessonId/progress',
  authMiddleware,
  async (req: AuthRequest, res) => {
    const { lessonId } = req.params;
    const userId = req.userId!;

    const schema = z.object({
      progressPercent: z.number().int().min(0).max(100),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const progress = await updateLessonProgress(
        userId,
        lessonId,
        parsed.data.progressPercent
      );
      res.json(progress);
    } catch (e: any) {
      if (e.message === 'Lesson not found') {
        return res.status(404).json({ error: e.message });
      }
      res.status(400).json({ error: e.message || 'Unable to update progress' });
    }
  }
);

/**
 * @openapi
 * /courses/assignments/{assignmentId}/submit:
 *   post:
 *     summary: Отправить ответ на задание
 *     tags:
 *       - Courses
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers, score]
 *             properties:
 *               answers:
 *                 type: object
 *                 description: Ответы пользователя (JSON объект)
 *               score:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Ответ сохранен
 *       400:
 *         description: Ошибка валидации
 */
router.post(
  '/assignments/:assignmentId/submit',
  authMiddleware,
  async (req: AuthRequest, res) => {
    const { assignmentId } = req.params;
    const userId = req.userId!;

    const schema = z.object({
      answers: z.any(),
      score: z.number().int().min(0),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    try {
      const result = await submitAssignment(
        userId,
        assignmentId,
        parsed.data.answers,
        parsed.data.score
      );
      res.json(result);
    } catch (e: any) {
      if (e.message === 'Assignment not found') {
        return res.status(404).json({ error: e.message });
      }
      res.status(400).json({ error: e.message || 'Unable to submit assignment' });
    }
  }
);

/**
 * @openapi
 * /courses/my-progress:
 *   get:
 *     summary: Получить прогресс пользователя по всем курсам
 *     tags:
 *       - Courses
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Прогресс по всем курсам
 */
router.get('/my-progress', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    const progress = await getUserCoursesProgress(userId);
    res.json(progress);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unable to fetch progress' });
  }
});

/**
 * @openapi
 * /courses/{courseId}/my-progress:
 *   get:
 *     summary: Получить прогресс пользователя по конкретному курсу
 *     tags:
 *       - Courses
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
 *         description: Прогресс по курсу
 */
router.get(
  '/:courseId/my-progress',
  authMiddleware,
  async (req: AuthRequest, res) => {
    const { courseId } = req.params;
    const userId = req.userId!;

    try {
      const progress = await getUserCourseProgress(userId, courseId);
      if (!progress) {
        return res.status(404).json({ error: 'Progress not found' });
      }
      res.json(progress);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Unable to fetch progress' });
    }
  }
);

export default router;

