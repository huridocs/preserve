import { Request, Response } from 'express';
import logger from 'src/logger';

const errorMiddleware = async (error: Error, req: Request, res: Response) => {
  logger.error(error.message, { stacktrace: error.stack });
  res.status(500).json({ error: error.message });
};

export { errorMiddleware };
