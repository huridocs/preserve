import { Vault } from 'src/Vault';
import { ApiRequestFilter, User } from 'src/types';

export class RetrieveUserEvidences {
  private vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  async execute(user: User, query: ApiRequestFilter['query']) {
    const dateFilter = query.filter?.date?.gt
      ? {
          'attributes.date': { $gt: new Date(query.filter?.date?.gt) },
        }
      : {};
    const statusFilter = query.filter?.status
      ? {
          'attributes.status': query.filter.status,
        }
      : {};

    return await this.vault.getByUser(
      user,
      {
        ...dateFilter,
        ...statusFilter,
      },
      query?.page?.limit ? parseInt(query.page.limit) : undefined
    );
  }
}
