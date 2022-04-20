import { NextFunction, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { db } from './DB';

export type User = {
  _id: ObjectId;
  token: string;
};

declare global {
  namespace Express {
    export interface Request {
      user: User;
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
