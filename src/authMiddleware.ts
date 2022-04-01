import { NextFunction, Request, Response } from 'express';
import { Document } from 'mongodb';
import { db } from './DB';

declare global {
  namespace Express {
    export interface Request {
      user: Document;
    }
  }
}

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const user = await db.collection('users').findOne({ token: req.get('Authorization') });
  if (!user) {
    res.status(401);
    res.json();
  } else {
    req.user = user;
    next();
  }
};

export { authMiddleware };
