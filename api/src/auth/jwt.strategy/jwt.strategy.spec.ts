import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('maps JWT claims into the authenticated request user', () => {
    const config = { getOrThrow: jest.fn().mockReturnValue('jwt-secret') };
    const strategy = new JwtStrategy(config as unknown as ConfigService);

    expect(
      strategy.validate({ sub: 'user-1', email: 'ada@example.com' }),
    ).toEqual({
      id: 'user-1',
      email: 'ada@example.com',
    });
    expect(config.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });
});
