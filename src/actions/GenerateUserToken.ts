import { TokenGenerator } from '../infrastructure/TokenGenerator';
import { TokensRepository } from '../infrastructure/TokensRepository';

export class GenerateUserToken {
  private tokenGenerator: TokenGenerator;
  private tokensRepository: TokensRepository;

  constructor(tokenGenerator: TokenGenerator, tokensRepository: TokensRepository) {
    this.tokenGenerator = tokenGenerator;
    this.tokensRepository = tokensRepository;
  }

  async execute() {
    const token = this.tokenGenerator.generate();
    await this.tokensRepository.save(token);
    return token;
  }
}
