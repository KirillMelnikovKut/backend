## Быстрый старт

### 1. Установить зависимости

```bash
npm install
```

### 2. Настроить `.env`

Создай (или отредактируй) файл `.env` в корне проекта. Минимальный набор:

```env
PORT=4000
DATABASE_URL="postgresql://app:app_password@localhost:5432/app_db?schema=public"
JWT_SECRET="замени_на_длинный_секрет"
```

При необходимости добавь SMTP‑переменные для отправки email с OTP.

### 3. Запустить Postgres в Docker

```bash
docker compose up -d
```

### 4. Применить миграции Prisma

```bash
npx prisma migrate dev
```

Это создаст все необходимые таблицы, включая модуль курсов.

### 5. Запустить сервер

```bash
npm run dev
```

Сервер будет доступен на `http://localhost:4000`. Для проверки можно открыть:

```bash
curl http://localhost:4000/health
```

## API Endpoints

### Аутентификация (`/auth`)
- `POST /auth/register/request-otp` - Запрос OTP для регистрации
- `POST /auth/register/verify-otp` - Подтверждение регистрации
- `POST /auth/login` - Вход по email/паролю
- `POST /auth/password/reset/request` - Запрос сброса пароля
- `POST /auth/password/reset/confirm` - Подтверждение сброса пароля
- `GET /auth/me` - Получить профиль текущего пользователя (требует авторизации)

### Курсы (`/courses`)
- `GET /courses` - Получить список всех активных курсов
- `GET /courses/:courseId` - Получить детальную информацию о курсе (требует авторизации)
- `GET /courses/:courseId/lessons/:lessonId` - Получить информацию об уроке (требует авторизации)
- `PUT /courses/:courseId/lessons/:lessonId/progress` - Обновить прогресс урока (требует авторизации)
- `POST /courses/assignments/:assignmentId/submit` - Отправить ответ на задание (требует авторизации)
- `GET /courses/my-progress` - Получить прогресс по всем курсам (требует авторизации)
- `GET /courses/:courseId/my-progress` - Получить прогресс по конкретному курсу (требует авторизации)

### Админские операции (`/admin`) - все требуют авторизации

#### Курсы
- `GET /admin/courses` - Получить все курсы (включая неактивные)
- `GET /admin/courses/:courseId` - Получить полную информацию о курсе
- `POST /admin/courses` - Создать новый курс
- `PUT /admin/courses/:courseId` - Обновить курс
- `DELETE /admin/courses/:courseId` - Удалить курс

#### Уроки
- `POST /admin/courses/:courseId/lessons` - Создать новый урок
- `PUT /admin/lessons/:lessonId` - Обновить урок
- `DELETE /admin/lessons/:lessonId` - Удалить урок

#### Контент уроков
- `POST /admin/lessons/:lessonId/content` - Создать или обновить контент урока
- `PUT /admin/lessons/:lessonId/content` - Обновить контент урока
- `DELETE /admin/lessons/:lessonId/content` - Удалить контент урока

#### Задания
- `POST /admin/lessons/:lessonId/assignment` - Создать или обновить задание
- `PUT /admin/assignments/:assignmentId` - Обновить задание
- `DELETE /admin/assignments/:assignmentId` - Удалить задание

### Профиль (`/profile`) - все требуют авторизации
- `GET /profile` - Получить профиль пользователя с прогрессом по курсам
- `PUT /profile` - Обновить профиль пользователя (телефон)
- `GET /profile/stats` - Получить статистику пользователя (прогресс, баллы, достижения)
- `GET /profile/courses` - Получить все курсы пользователя с детальным прогрессом
- `GET /profile/courses/:courseId` - Получить детальный прогресс по конкретному курсу
- `GET /profile/achievements` - Получить достижения пользователя

### Документация API
Swagger документация доступна по адресу: `http://localhost:4000/docs`


