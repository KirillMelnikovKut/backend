import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const headerToken = req.header('x-auth-token');
  const authHeader = req.header('authorization') || req.header('Authorization');

  let token: string | undefined;

  if (headerToken) {
    token = headerToken;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring('Bearer '.length);
  }

  if (!token) {
    return res.status(401).json({ error: 'No auth token provided' });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub?: string };
    if (!payload.sub) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.userId = payload.sub;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}


