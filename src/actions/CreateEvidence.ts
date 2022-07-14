import { appendFile } from 'fs/promises';
import { WithId } from 'mongodb';
import path from 'path';
import { Logger } from 'winston';
import { Vault } from 'src/infrastructure/Vault';
import { EvidenceDB, User } from 'src/types';
import { Cookie } from 'src/types';
import { config } from '../config';

export class CreateEvidence {
  private vault: Vault;
  private logger: Logger;

  constructor(vault: Vault, logger: Logger) {
    this.vault = vault;
    this.logger = logger;
  }

  async execute(url: string, user: User, cookies: Cookie[] | undefined) {
    const evidence = await this.vault.create(url, user, cookies || []);
    await CreateEvidence.createCookieJar(cookies, evidence);
    this.logger.info(`Evidence created for url ${url}`);

    return evidence;
  }

  private static async createCookieJar(
    cookies: Cookie[] | undefined,
    evidence: WithId<EvidenceDB>
  ) {
    const cookiesHeader = '# Netscape HTTP Cookie File\n';
    const netscapeCookies =
      cookiesHeader +
      cookies
        ?.map(cookie => {
          const { domain, path, secure, expirationDate, name, value } = cookie;

          return [
            domain,
            domain?.startsWith('.') ? 'TRUE' : 'FALSE',
            path,
            secure?.toString().toUpperCase(),
            expirationDate,
            name,
            value,
          ].join('\t');
        })
        .join('\n');

    await appendFile(
      path.join(config.cookiesPath, `${evidence._id.toString()}.txt`),
      netscapeCookies
    );
  }
}
