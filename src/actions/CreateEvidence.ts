import { Logger } from 'winston';
import { Vault } from 'src/Vault';
import { User } from 'src/authMiddleware';
import Cookie = Preserve.Cookie;

export class CreateEvidence {
  private vault: Vault;
  private logger: Logger;

  constructor(vault: Vault, logger: Logger) {
    this.vault = vault;
    this.logger = logger;
  }

  async execute(url: string, user: User, cookies: Cookie[]) {
    const evidence = await this.vault.create(url, user, cookies);
    this.logger.info(`Evidence created for url ${url}`);

    return evidence;
  }
}
