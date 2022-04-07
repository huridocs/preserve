import { NextFunction, Request, Response } from 'express';
import { WithId } from 'mongodb';
import { db } from './DB';

export type User = {
  token: string;
};

declare global {
  namespace Express {
    export interface Request {
      user: WithId<User>;
    }
  }
}

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const user = await db.collection<User>('users').findOne({ token: req.get('Authorization') });
  if (!user) {
    res.status(401);
    res.json();
  } else {
    req.user = user;
    next();
  }
};

export { authMiddleware };
