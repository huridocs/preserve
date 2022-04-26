import { NextFunction, Request, Response } from 'express';
import { Logger } from 'winston';
import { ValidationError } from './validations';

const errorMiddleware =
  (logger: Logger) => (error: Error, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      next();
    } else {
      logger.error(error.message, { stacktrace: error.stack });
      res.status(500).json({ error: error.message });
      next();
    }
  };

export { errorMiddleware };
