import { Vault } from 'src/Vault';
import { User } from 'src/authMiddleware';

export class PreserveEvidence {
  private vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  async execute(url: string, user: User) {
    return await this.vault.create(url, user);
  }
}
