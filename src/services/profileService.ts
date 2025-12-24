import { prisma } from '../lib/prisma';

// Получить полный профиль пользователя с прогрессом
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Получаем прогресс по курсам
  const courseProgress = await prisma.userCourseProgress.findMany({
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

  // Получаем статистику
  const stats = await getUserStats(userId);

  return {
    ...user,
    courseProgress,
    stats,
  };
}

// Получить статистику пользователя
export async function getUserStats(userId: string) {
  // Общее количество курсов
  const totalCourses = await prisma.course.count({
    where: { isActive: true },
  });

  // Курсы пользователя
  const userCourses = await prisma.userCourseProgress.findMany({
    where: { userId },
    include: {
      course: true,
    },
  });

  // Количество начатых курсов
  const startedCourses = userCourses.length;

  // Количество завершенных курсов (прогресс = 100%)
  const completedCourses = userCourses.filter(
    (cp) => cp.progressPercent === 100
  ).length;

  // Общий прогресс по всем курсам (средний процент)
  const averageProgress =
    userCourses.length > 0
      ? Math.round(
          userCourses.reduce((sum, cp) => sum + cp.progressPercent, 0) /
            userCourses.length
        )
      : 0;

  // Количество пройденных уроков
  const completedLessons = await prisma.userLessonProgress.count({
    where: {
      userId,
      progressPercent: 100,
    },
  });

  // Общее количество уроков во всех активных курсах
  const totalLessons = await prisma.lesson.count({
    where: {
      course: {
        isActive: true,
      },
      isActive: true,
    },
  });

  // Количество выполненных заданий
  const completedAssignments = await prisma.userAssignment.count({
    where: {
      userId,
      completedAt: {
        not: null,
      },
    },
  });

  // Общее количество заданий
  const totalAssignments = await prisma.assignment.count({
    where: {
      lesson: {
        course: {
          isActive: true,
        },
        isActive: true,
      },
      isActive: true,
    },
  });

  // Общий балл за все задания
  const totalScore = await prisma.userAssignment.aggregate({
    where: { userId },
    _sum: {
      score: true,
    },
  });

  // Максимально возможный балл
  const maxPossibleScore = await prisma.userAssignment.findMany({
    where: { userId },
    include: {
      assignment: {
        select: {
          maxScore: true,
        },
      },
    },
  });

  const maxScore = maxPossibleScore.reduce(
    (sum, ua) => sum + ua.assignment.maxScore,
    0
  );

  return {
    totalCourses,
    startedCourses,
    completedCourses,
    averageProgress,
    completedLessons,
    totalLessons,
    completedAssignments,
    totalAssignments,
    totalScore: totalScore._sum.score || 0,
    maxScore,
    scorePercentage:
      maxScore > 0
        ? Math.round(((totalScore._sum.score || 0) / maxScore) * 100)
        : 0,
  };
}

// Получить все курсы пользователя с детальным прогрессом
export async function getUserCoursesWithProgress(userId: string) {
  const courseProgress = await prisma.userCourseProgress.findMany({
    where: { userId },
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
          _count: {
            select: { lessons: true },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Для каждого курса получаем детальный прогресс по урокам
  const coursesWithDetails = await Promise.all(
    courseProgress.map(async (cp) => {
      const lessonProgress = await prisma.userLessonProgress.findMany({
        where: {
          userId,
          lesson: {
            courseId: cp.courseId,
            isActive: true,
          },
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              type: true,
              order: true,
            },
          },
        },
        orderBy: {
          lesson: {
            order: 'asc',
          },
        },
      });

      const completedLessonsCount = lessonProgress.filter(
        (lp) => lp.progressPercent === 100
      ).length;

      return {
        ...cp,
        course: {
          ...cp.course,
          lessonProgress,
          completedLessonsCount,
          totalLessonsCount: cp.course.lessons.length,
        },
      };
    })
  );

  return coursesWithDetails;
}

// Получить детальный прогресс по конкретному курсу
export async function getUserCourseDetailedProgress(
  userId: string,
  courseId: string
) {
  const courseProgress = await prisma.userCourseProgress.findUnique({
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
              content: {
                select: {
                  id: true,
                  videoUrl: true,
                  images: true,
                },
              },
              assignment: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  maxScore: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!courseProgress) {
    return null;
  }

  // Получаем прогресс по каждому уроку
  const lessonProgress = await prisma.userLessonProgress.findMany({
    where: {
      userId,
      lesson: {
        courseId,
        isActive: true,
      },
    },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          type: true,
          order: true,
        },
      },
    },
    orderBy: {
      lesson: {
        order: 'asc',
      },
    },
  });

  // Получаем выполненные задания
  const assignments = await prisma.userAssignment.findMany({
    where: {
      userId,
      assignment: {
        lesson: {
          courseId,
        },
      },
    },
    include: {
      assignment: {
        select: {
          id: true,
          title: true,
          type: true,
          maxScore: true,
          lesson: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  const completedLessons = lessonProgress.filter(
    (lp) => lp.progressPercent === 100
  ).length;

  return {
    ...courseProgress,
    lessonProgress,
    assignments,
    completedLessons,
    totalLessons: courseProgress.course.lessons.length,
  };
}

// Обновить профиль пользователя
export interface UpdateProfileData {
  phone?: string;
}

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileData
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Если обновляется телефон, проверяем уникальность
  if (data.phone && data.phone !== user.phone) {
    const existing = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existing) {
      throw new Error('Phone number already in use');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      phone: data.phone,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Получить достижения пользователя (можно расширить в будущем)
export async function getUserAchievements(userId: string) {
  const stats = await getUserStats(userId);

  const achievements: Array<{
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
    unlockedAt?: Date;
  }> = [];

  // Первый курс начат
  if (stats.startedCourses >= 1) {
    achievements.push({
      id: 'first_course',
      title: 'Первый шаг',
      description: 'Начал прохождение первого курса',
      unlocked: true,
    });
  }

  // Первый курс завершен
  if (stats.completedCourses >= 1) {
    achievements.push({
      id: 'first_completed',
      title: 'Первый успех',
      description: 'Завершил первый курс',
      unlocked: true,
    });
  }

  // 5 курсов завершено
  if (stats.completedCourses >= 5) {
    achievements.push({
      id: 'five_courses',
      title: 'Опытный студент',
      description: 'Завершил 5 курсов',
      unlocked: true,
    });
  }

  // 10 курсов завершено
  if (stats.completedCourses >= 10) {
    achievements.push({
      id: 'ten_courses',
      title: 'Мастер обучения',
      description: 'Завершил 10 курсов',
      unlocked: true,
    });
  }

  // Все задания выполнены
  if (
    stats.completedAssignments > 0 &&
    stats.completedAssignments === stats.totalAssignments
  ) {
    achievements.push({
      id: 'all_assignments',
      title: 'Выполнил все задания',
      description: 'Завершил все доступные задания',
      unlocked: true,
    });
  }

  // 100% прогресс по всем курсам
  if (stats.averageProgress === 100 && stats.startedCourses > 0) {
    achievements.push({
      id: 'perfect_progress',
      title: 'Идеальный прогресс',
      description: 'Достиг 100% прогресса по всем курсам',
      unlocked: true,
    });
  }

  return achievements;
}

