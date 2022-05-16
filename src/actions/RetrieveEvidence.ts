import { Vault } from 'src/Vault';
import { User } from 'src/authMiddleware';
import { ObjectId } from 'mongodb';

export class RetrieveEvidence {
  private vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  async execute(id: string, user: User) {
    return await this.vault.getOne(new ObjectId(id), user);
  }
}
