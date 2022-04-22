import { NextFunction, Request, Response} from 'express';
import logger from 'src/logger';

const errorMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(error.message, { stacktrace: error.stack });
  res.status(500).json({ error: error.message });
  next();
};

export { errorMiddleware };
