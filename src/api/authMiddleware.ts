import { NextFunction, Request, Response } from 'express';
import { db } from '../infrastructure/DB';
import { TokenDB, User } from '../types';

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

const mainAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const mainToken = await db
    .collection<TokenDB>('authorization')
    .findOne({ token: req.get('Authorization') });
  if (!mainToken) {
    res.status(401);
    res.json();
  } else {
    next();
  }
};

export { authMiddleware, mainAuthMiddleware };
