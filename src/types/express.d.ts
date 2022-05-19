import { User } from './index';

declare global {
  namespace Express {
    export interface Request {
      user: User;
    }
  }
}
