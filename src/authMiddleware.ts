import { NextFunction, Request, Response } from 'express';
import { db } from 'src/DB';
import { User } from 'src/types';

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
