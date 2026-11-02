import { InternalServerErrorException } from '@nestjs/common';

// better-auth is ESM-only and is not needed to test the users service.
jest.mock('../auth/auth.service', () => ({
  AuthService: class AuthService {},
}));

import { UsersService } from './users.service';

function makeService() {
  const prisma = {
    user: {
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
    },
  };

  const auth = {
    auth: {
      api: {
        updateUser: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue({}),
      },
    },
  };

  const service = new UsersService(prisma as never, auth as never);

  return { service, prisma, auth };
}

describe('UsersService', () => {
  describe('getProfile', () => {
    it('selects only public profile fields', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await service.getProfile('user-1');

      const query = prisma.user.findUnique.mock.calls[0][0] as {
        select: Record<string, unknown>;
      };
      expect(query.select).toMatchObject({
        id: true,
        name: true,
        image: true,
        bio: true,
        createdAt: true,
      });
      expect(query.select.skills).toBeDefined();
      expect(query.select.receivedReviews).toBeDefined();
      expect(query.select.email).toBeUndefined();
      expect(query.select.emailVerified).toBeUndefined();
      expect(query.select.pointsBalance).toBeUndefined();
      expect(query.select.referralCode).toBeUndefined();
      expect(query.select.referredById).toBeUndefined();
      expect(query.select.pushTokens).toBeUndefined();
    });
  });

  describe('updateAvatar', () => {
    const originalSecret = process.env.INTERNAL_SECRET;

    afterEach(() => {
      if (originalSecret === undefined) {
        delete process.env.INTERNAL_SECRET;
      } else {
        process.env.INTERNAL_SECRET = originalSecret;
      }
    });

    it('refuses to update an avatar when INTERNAL_SECRET is missing', async () => {
      delete process.env.INTERNAL_SECRET;
      const { service, auth } = makeService();

      await expect(
        service.updateAvatar('https://cdn.example/avatar.png', {}),
      ).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(auth.auth.api.updateUser).not.toHaveBeenCalled();
    });

    it('forwards only auth headers plus the internal secret', async () => {
      process.env.INTERNAL_SECRET = 'server-secret';
      const { service, auth } = makeService();

      await service.updateAvatar('https://cdn.example/avatar.png', {
        authorization: 'Bearer token',
        cookie: 'session=abc',
        'x-client-controlled': 'do-not-forward',
      });

      const request = auth.auth.api.updateUser.mock.calls[0][0] as {
        body: { image: string };
        headers: Headers;
      };
      expect(request.body).toEqual({
        image: 'https://cdn.example/avatar.png',
      });
      expect(request.headers.get('authorization')).toBe('Bearer token');
      expect(request.headers.get('cookie')).toBe('session=abc');
      expect(request.headers.get('x-server-secret')).toBe('server-secret');
      expect(request.headers.get('x-client-controlled')).toBeNull();
    });
  });
});
