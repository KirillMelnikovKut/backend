import { prisma } from '../lib/prisma';
import { LessonType, AssignmentType } from '@prisma/client';

// Получить все активные курсы
export async function getAllCourses() {
  return prisma.course.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          order: true,
        },
      },
      _count: {
        select: { lessons: true },
      },
    },
  });
}

// Получить курс по ID с уроками
export async function getCourseById(courseId: string, userId?: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId, isActive: true },
    include: {
      lessons: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: {
          content: true,
          assignment: {
            include: {
              _count: {
                select: { userAnswers: true },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  // Если передан userId, добавляем информацию о прогрессе
  if (userId) {
    const userProgress = await prisma.userCourseProgress.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    return {
      ...course,
      userProgress,
    };
  }

  return course;
}

// Получить урок по ID
export async function getLessonById(lessonId: string, userId?: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId, isActive: true },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      content: true,
      assignment: true,
    },
  });

  if (!lesson) {
    throw new Error('Lesson not found');
  }

  // Если передан userId, добавляем информацию о прогрессе
  if (userId) {
    const userProgress = await prisma.userLessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    const userAssignment = lesson.assignment
      ? await prisma.userAssignment.findUnique({
          where: {
            userId_assignmentId: {
              userId,
              assignmentId: lesson.assignment.id,
            },
          },
        })
      : null;

    return {
      ...lesson,
      userProgress,
      userAssignment,
    };
  }

  return lesson;
}

// Обновить прогресс урока
export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  progressPercent: number
) {
  if (progressPercent < 0 || progressPercent > 100) {
    throw new Error('Progress percent must be between 0 and 100');
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true },
  });

  if (!lesson) {
    throw new Error('Lesson not found');
  }

  const isCompleted = progressPercent === 100;

  // Обновляем или создаем прогресс урока
  const lessonProgress = await prisma.userLessonProgress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    create: {
      userId,
      lessonId,
      progressPercent,
      completedAt: isCompleted ? new Date() : null,
    },
    update: {
      progressPercent,
      completedAt: isCompleted ? new Date() : undefined,
    },
  });

  // Обновляем прогресс курса
  await updateCourseProgress(userId, lesson.courseId);

  return lessonProgress;
}

// Обновить прогресс курса (вычисляется на основе прогресса уроков)
async function updateCourseProgress(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: {
        where: { isActive: true },
      },
    },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  if (course.lessons.length === 0) {
    return;
  }

  // Получаем прогресс всех уроков пользователя
  const lessonsProgress = await prisma.userLessonProgress.findMany({
    where: {
      userId,
      lessonId: {
        in: course.lessons.map((l) => l.id),
      },
    },
  });

  // Вычисляем средний прогресс
  const totalProgress = lessonsProgress.reduce(
    (sum, lp) => sum + lp.progressPercent,
    0
  );
  const averageProgress = Math.round(totalProgress / course.lessons.length);

  const isCompleted = averageProgress === 100;

  await prisma.userCourseProgress.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    create: {
      userId,
      courseId,
      progressPercent: averageProgress,
      completedAt: isCompleted ? new Date() : null,
    },
    update: {
      progressPercent: averageProgress,
      completedAt: isCompleted ? new Date() : undefined,
    },
  });
}

// Сохранить ответ на задание
export async function submitAssignment(
  userId: string,
  assignmentId: string,
  answers: any,
  score: number
) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { lesson: true },
  });

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  if (score < 0 || score > assignment.maxScore) {
    throw new Error(`Score must be between 0 and ${assignment.maxScore}`);
  }

  const userAssignment = await prisma.userAssignment.upsert({
    where: {
      userId_assignmentId: {
        userId,
        assignmentId,
      },
    },
    create: {
      userId,
      assignmentId,
      score,
      answers,
      completedAt: new Date(),
    },
    update: {
      score,
      answers,
      completedAt: new Date(),
    },
  });

  // Обновляем прогресс урока (если задание выполнено, урок считается завершенным на 100%)
  if (assignment.lesson) {
    await updateLessonProgress(userId, assignment.lesson.id, 100);
  }

  return userAssignment;
}

// Получить прогресс пользователя по всем курсам
export async function getUserCoursesProgress(userId: string) {
  return prisma.userCourseProgress.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}

// Получить прогресс пользователя по конкретному курсу
export async function getUserCourseProgress(userId: string, courseId: string) {
  return prisma.userCourseProgress.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    include: {
      course: {
        include: {
          lessons: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: {
              _count: {
                select: { progress: true },
              },
            },
          },
        },
      },
    },
  });
}

