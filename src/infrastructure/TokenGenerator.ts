import crypto from 'crypto';

export class TokenGenerator {
  generate() {
    return crypto.randomBytes(24).toString('hex');
  }
}
