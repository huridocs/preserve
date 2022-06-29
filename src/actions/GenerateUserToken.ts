import { TokenGenerator } from '../infrastructure/TokenGenerator';
import { UsersRepository } from '../infrastructure/UsersRepository';

export class GenerateUserToken {
  private tokenGenerator: TokenGenerator;
  private tokensRepository: UsersRepository;

  constructor(tokenGenerator: TokenGenerator, tokensRepository: UsersRepository) {
    this.tokenGenerator = tokenGenerator;
    this.tokensRepository = tokensRepository;
  }

  async execute() {
    const token = this.tokenGenerator.generate();
    const generatedToken = await this.tokensRepository.save(token);

    return generatedToken?.token;
  }
}
