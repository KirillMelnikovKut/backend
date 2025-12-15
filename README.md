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
npx prisma migrate dev --name init
```

### 5. Запустить сервер

```bash
npm run dev
```

Сервер будет доступен на `http://localhost:4000`. Для проверки можно открыть:

```bash
curl http://localhost:4000/health
```


