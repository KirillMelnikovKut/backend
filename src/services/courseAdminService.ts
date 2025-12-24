import { prisma } from '../lib/prisma';
import { LessonType, AssignmentType } from '@prisma/client';

// ========== КУРСЫ ==========

export interface CreateCourseData {
  title: string;
  description?: string;
  imageUrl?: string;
  order?: number;
  isActive?: boolean;
}

export async function createCourse(data: CreateCourseData) {
  return prisma.course.create({
    data: {
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      order: data.order ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  imageUrl?: string;
  order?: number;
  isActive?: boolean;
}

export async function updateCourse(courseId: string, data: UpdateCourseData) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  return prisma.course.update({
    where: { id: courseId },
    data,
  });
}

export async function deleteCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  // Удаление каскадное благодаря onDelete: Cascade
  return prisma.course.delete({
    where: { id: courseId },
  });
}

// ========== УРОКИ ==========

export interface CreateLessonData {
  courseId: string;
  title: string;
  description?: string;
  type: LessonType;
  order?: number;
  isActive?: boolean;
}

export async function createLesson(data: CreateLessonData) {
  // Проверяем существование курса
  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  return prisma.lesson.create({
    data: {
      courseId: data.courseId,
      title: data.title,
      description: data.description,
      type: data.type,
      order: data.order ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

export interface UpdateLessonData {
  title?: string;
  description?: string;
  type?: LessonType;
  order?: number;
  isActive?: boolean;
}

export async function updateLesson(lessonId: string, data: UpdateLessonData) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    throw new Error('Lesson not found');
  }

  return prisma.lesson.update({
    where: { id: lessonId },
    data,
  });
}

export async function deleteLesson(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    throw new Error('Lesson not found');
  }

  return prisma.lesson.delete({
    where: { id: lessonId },
  });
}

// ========== КОНТЕНТ УРОКОВ ==========

export interface CreateLessonContentData {
  lessonId: string;
  content: string;
  videoUrl?: string;
  images?: string[];
  metadata?: any;
}

export async function createOrUpdateLessonContent(data: CreateLessonContentData) {
  // Проверяем существование урока
  const lesson = await prisma.lesson.findUnique({
    where: { id: data.lessonId },
  });

  if (!lesson) {
    throw new Error('Lesson not found');
  }

  return prisma.lessonContent.upsert({
    where: { lessonId: data.lessonId },
    create: {
      lessonId: data.lessonId,
      content: data.content,
      videoUrl: data.videoUrl,
      images: data.images ?? [],
      metadata: data.metadata,
    },
    update: {
      content: data.content,
      videoUrl: data.videoUrl,
      images: data.images ?? [],
      metadata: data.metadata,
    },
  });
}

export interface UpdateLessonContentData {
  content?: string;
  videoUrl?: string;
  images?: string[];
  metadata?: any;
}

export async function updateLessonContent(
  lessonId: string,
  data: UpdateLessonContentData
) {
  const lessonContent = await prisma.lessonContent.findUnique({
    where: { lessonId },
  });

  if (!lessonContent) {
    throw new Error('Lesson content not found');
  }

  return prisma.lessonContent.update({
    where: { lessonId },
    data: {
      content: data.content,
      videoUrl: data.videoUrl,
      images: data.images,
      metadata: data.metadata,
    },
  });
}

export async function deleteLessonContent(lessonId: string) {
  const lessonContent = await prisma.lessonContent.findUnique({
    where: { lessonId },
  });

  if (!lessonContent) {
    throw new Error('Lesson content not found');
  }

  return prisma.lessonContent.delete({
    where: { lessonId },
  });
}

// ========== ЗАДАНИЯ ==========

export interface CreateAssignmentData {
  lessonId: string;
  title: string;
  description?: string;
  type: AssignmentType;
  maxScore?: number;
  content?: any; // JSON структура задания
  isActive?: boolean;
}

export async function createOrUpdateAssignment(data: CreateAssignmentData) {
  // Проверяем существование урока
  const lesson = await prisma.lesson.findUnique({
    where: { id: data.lessonId },
  });

  if (!lesson) {
    throw new Error('Lesson not found');
  }

  return prisma.assignment.upsert({
    where: { lessonId: data.lessonId },
    create: {
      lessonId: data.lessonId,
      title: data.title,
      description: data.description,
      type: data.type,
      maxScore: data.maxScore ?? 100,
      content: data.content,
      isActive: data.isActive ?? true,
    },
    update: {
      title: data.title,
      description: data.description,
      type: data.type,
      maxScore: data.maxScore ?? 100,
      content: data.content,
      isActive: data.isActive ?? true,
    },
  });
}

export interface UpdateAssignmentData {
  title?: string;
  description?: string;
  type?: AssignmentType;
  maxScore?: number;
  content?: any;
  isActive?: boolean;
}

export async function updateAssignment(
  assignmentId: string,
  data: UpdateAssignmentData
) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  return prisma.assignment.update({
    where: { id: assignmentId },
    data,
  });
}

export async function deleteAssignment(assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  return prisma.assignment.delete({
    where: { id: assignmentId },
  });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Получить полную информацию о курсе со всеми уроками (для админа)
export async function getCourseFullData(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          content: true,
          assignment: true,
        },
      },
    },
  });
}

// Получить все курсы (включая неактивные, для админа)
export async function getAllCoursesAdmin() {
  return prisma.course.findMany({
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          content: true,
          assignment: true,
        },
      },
      _count: {
        select: { lessons: true, progress: true },
      },
    },
  });
}

