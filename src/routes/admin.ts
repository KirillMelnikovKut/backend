import { Router } from 'express';
import { z } from 'zod';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  createOrUpdateLessonContent,
  updateLessonContent,
  deleteLessonContent,
  createOrUpdateAssignment,
  updateAssignment,
  deleteAssignment,
  getCourseFullData,
  getAllCoursesAdmin,
} from '../services/courseAdminService';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { LessonType, AssignmentType } from '@prisma/client';

const router = Router();

// Все админские роуты требуют авторизации
router.use(authMiddleware);

/**
 * @openapi
 * /admin/courses:
 *   get:
 *     summary: Получить все курсы (включая неактивные) - для админа
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Список всех курсов
 */
router.get('/courses', async (_req, res) => {
  try {
    const courses = await getAllCoursesAdmin();
    res.json(courses);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unable to fetch courses' });
  }
});

/**
 * @openapi
 * /admin/courses/{courseId}:
 *   get:
 *     summary: Получить полную информацию о курсе - для админа
 *     tags:
 *       - Admin
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
 *         description: Полная информация о курсе
 *       404:
 *         description: Курс не найден
 */
router.get('/courses/:courseId', async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await getCourseFullData(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Unable to fetch course' });
  }
});

/**
 * @openapi
 * /admin/courses:
 *   post:
 *     summary: Создать новый курс
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               order:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Курс создан
 *       400:
 *         description: Ошибка валидации
 */
router.post('/courses', async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const course = await createCourse(parsed.data);
    res.status(201).json(course);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Unable to create course' });
  }
});

/**
 * @openapi
 * /admin/courses/{courseId}:
 *   put:
 *     summary: Обновить курс
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               order:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Курс обновлен
 *       404:
 *         description: Курс не найден
 */
router.put('/courses/:courseId', async (req, res) => {
  const { courseId } = req.params;

  const schema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const course = await updateCourse(courseId, parsed.data);
    res.json(course);
  } catch (e: any) {
    if (e.message === 'Course not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to update course' });
  }
});

/**
 * @openapi
 * /admin/courses/{courseId}:
 *   delete:
 *     summary: Удалить курс
 *     tags:
 *       - Admin
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
 *         description: Курс удален
 *       404:
 *         description: Курс не найден
 */
router.delete('/courses/:courseId', async (req, res) => {
  const { courseId } = req.params;

  try {
    await deleteCourse(courseId);
    res.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Course not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to delete course' });
  }
});

// ========== УРОКИ ==========

/**
 * @openapi
 * /admin/courses/{courseId}/lessons:
 *   post:
 *     summary: Создать новый урок
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *             required: [title, type]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [THEORY, VIDEO, ASSIGNMENT, MIXED]
 *               order:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Урок создан
 *       400:
 *         description: Ошибка валидации
 */
router.post('/courses/:courseId/lessons', async (req, res) => {
  const { courseId } = req.params;

  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.nativeEnum(LessonType),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const lesson = await createLesson({
      ...parsed.data,
      courseId,
    });
    res.status(201).json(lesson);
  } catch (e: any) {
    if (e.message === 'Course not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to create lesson' });
  }
});

/**
 * @openapi
 * /admin/lessons/{lessonId}:
 *   put:
 *     summary: Обновить урок
 *     tags:
 *       - Admin
 *     parameters:
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [THEORY, VIDEO, ASSIGNMENT, MIXED]
 *               order:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Урок обновлен
 *       404:
 *         description: Урок не найден
 */
router.put('/lessons/:lessonId', async (req, res) => {
  const { lessonId } = req.params;

  const schema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    type: z.nativeEnum(LessonType).optional(),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const lesson = await updateLesson(lessonId, parsed.data);
    res.json(lesson);
  } catch (e: any) {
    if (e.message === 'Lesson not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to update lesson' });
  }
});

/**
 * @openapi
 * /admin/lessons/{lessonId}:
 *   delete:
 *     summary: Удалить урок
 *     tags:
 *       - Admin
 *     parameters:
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
 *         description: Урок удален
 *       404:
 *         description: Урок не найден
 */
router.delete('/lessons/:lessonId', async (req, res) => {
  const { lessonId } = req.params;

  try {
    await deleteLesson(lessonId);
    res.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Lesson not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to delete lesson' });
  }
});

// ========== КОНТЕНТ УРОКОВ ==========

/**
 * @openapi
 * /admin/lessons/{lessonId}/content:
 *   post:
 *     summary: Создать или обновить контент урока
 *     tags:
 *       - Admin
 *     parameters:
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
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 description: HTML или Markdown контент
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Контент создан или обновлен
 *       400:
 *         description: Ошибка валидации
 */
router.post('/lessons/:lessonId/content', async (req, res) => {
  const { lessonId } = req.params;

  const schema = z.object({
    content: z.string().min(1),
    videoUrl: z.string().url().optional().or(z.literal('')),
    images: z.array(z.string().url()).optional(),
    metadata: z.any().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const lessonContent = await createOrUpdateLessonContent({
      lessonId,
      ...parsed.data,
    });
    res.json(lessonContent);
  } catch (e: any) {
    if (e.message === 'Lesson not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to save lesson content' });
  }
});

/**
 * @openapi
 * /admin/lessons/{lessonId}/content:
 *   put:
 *     summary: Обновить контент урока
 *     tags:
 *       - Admin
 *     parameters:
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
 *             properties:
 *               content:
 *                 type: string
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Контент обновлен
 *       404:
 *         description: Контент не найден
 */
router.put('/lessons/:lessonId/content', async (req, res) => {
  const { lessonId } = req.params;

  const schema = z.object({
    content: z.string().optional(),
    videoUrl: z.string().url().optional().or(z.literal('')),
    images: z.array(z.string().url()).optional(),
    metadata: z.any().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const lessonContent = await updateLessonContent(lessonId, parsed.data);
    res.json(lessonContent);
  } catch (e: any) {
    if (e.message === 'Lesson content not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to update lesson content' });
  }
});

/**
 * @openapi
 * /admin/lessons/{lessonId}/content:
 *   delete:
 *     summary: Удалить контент урока
 *     tags:
 *       - Admin
 *     parameters:
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
 *         description: Контент удален
 *       404:
 *         description: Контент не найден
 */
router.delete('/lessons/:lessonId/content', async (req, res) => {
  const { lessonId } = req.params;

  try {
    await deleteLessonContent(lessonId);
    res.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Lesson content not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to delete lesson content' });
  }
});

// ========== ЗАДАНИЯ ==========

/**
 * @openapi
 * /admin/lessons/{lessonId}/assignment:
 *   post:
 *     summary: Создать или обновить задание для урока
 *     tags:
 *       - Admin
 *     parameters:
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
 *             required: [title, type]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [INTERACTIVE, QUIZ, TEST, PRACTICAL]
 *               maxScore:
 *                 type: integer
 *                 default: 100
 *               content:
 *                 type: object
 *                 description: JSON структура задания (вопросы, варианты ответов и т.д.)
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Задание создано или обновлено
 *       400:
 *         description: Ошибка валидации
 */
router.post('/lessons/:lessonId/assignment', async (req, res) => {
  const { lessonId } = req.params;

  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.nativeEnum(AssignmentType),
    maxScore: z.number().int().min(0).optional(),
    content: z.any().optional(),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const assignment = await createOrUpdateAssignment({
      lessonId,
      ...parsed.data,
    });
    res.json(assignment);
  } catch (e: any) {
    if (e.message === 'Lesson not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to save assignment' });
  }
});

/**
 * @openapi
 * /admin/assignments/{assignmentId}:
 *   put:
 *     summary: Обновить задание
 *     tags:
 *       - Admin
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [INTERACTIVE, QUIZ, TEST, PRACTICAL]
 *               maxScore:
 *                 type: integer
 *               content:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Задание обновлено
 *       404:
 *         description: Задание не найдено
 */
router.put('/assignments/:assignmentId', async (req, res) => {
  const { assignmentId } = req.params;

  const schema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    type: z.nativeEnum(AssignmentType).optional(),
    maxScore: z.number().int().min(0).optional(),
    content: z.any().optional(),
    isActive: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const assignment = await updateAssignment(assignmentId, parsed.data);
    res.json(assignment);
  } catch (e: any) {
    if (e.message === 'Assignment not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to update assignment' });
  }
});

/**
 * @openapi
 * /admin/assignments/{assignmentId}:
 *   delete:
 *     summary: Удалить задание
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - xAuthToken: []
 *     responses:
 *       200:
 *         description: Задание удалено
 *       404:
 *         description: Задание не найдено
 */
router.delete('/assignments/:assignmentId', async (req, res) => {
  const { assignmentId } = req.params;

  try {
    await deleteAssignment(assignmentId);
    res.json({ success: true });
  } catch (e: any) {
    if (e.message === 'Assignment not found') {
      return res.status(404).json({ error: e.message });
    }
    res.status(400).json({ error: e.message || 'Unable to delete assignment' });
  }
});

export default router;

