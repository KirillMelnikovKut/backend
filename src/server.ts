import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import authRouter from './routes/auth';
import coursesRouter from './routes/courses';
import adminRouter from './routes/admin';
import profileRouter from './routes/profile';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/courses', coursesRouter);
app.use('/admin', adminRouter);
app.use('/profile', profileRouter);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = Number(env.PORT);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


