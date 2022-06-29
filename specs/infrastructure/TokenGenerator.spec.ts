import crypto from 'crypto';
import { TokenGenerator } from '../../src/infrastructure/TokenGenerator';

describe('TokenGenerator', () => {
  it('should generate tokens', () => {
    const hashMock = {
      toString: jest.fn().mockReturnValueOnce('encrypt 123'),
    };
    const createHashMock = jest.spyOn(crypto, 'randomBytes').mockImplementationOnce(() => hashMock);
    const tokenGenerator = new TokenGenerator();

    const token = tokenGenerator.generate();

    expect(createHashMock).toHaveBeenCalledWith(24);
    expect(hashMock.toString).toHaveBeenCalledWith('hex');
    expect(token).toEqual('encrypt 123');

    createHashMock.mockClear();
  });
});
