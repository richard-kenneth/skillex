import { ReferralsService } from './referrals.service';

function makeService() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const events = { emit: jest.fn() };

  const service = new ReferralsService(prisma as never, events as never);

  return { service, prisma, events };
}

describe('ReferralsService', () => {
  describe('getMyReferralCode', () => {
    it('generates a code from the unambiguous alphabet', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique
        .mockResolvedValueOnce({ referralCode: null, name: 'User' })
        .mockResolvedValueOnce(null);
      prisma.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.getMyReferralCode('user-1');

      expect(result.referralCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-1', referralCode: null },
        data: { referralCode: result.referralCode },
      });
    });

    it('returns the existing code if another request wins the race', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique
        .mockResolvedValueOnce({ referralCode: null, name: 'User' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ referralCode: 'EXISTING' });
      prisma.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.getMyReferralCode('user-1')).resolves.toEqual({
        referralCode: 'EXISTING',
      });
    });

    it('does not overwrite a code that already exists', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValueOnce({
        referralCode: 'ALREADY1',
        name: 'User',
      });

      await expect(service.getMyReferralCode('user-1')).resolves.toEqual({
        referralCode: 'ALREADY1',
      });
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });
  });
});

function makeCompletionService() {
  const config = {
    id: 'singleton',
    referralRewardReferrer: 200,
    referralRewardReferee: 200,
    referralBonusPerExchange: 50,
    referralBonusCap: 500,
    referralMonthlyCap: 5_000,
  };

  const tx = {
    $queryRaw: jest
      .fn<Promise<unknown[]>, [TemplateStringsArray, ...unknown[]]>()
      .mockResolvedValue([]),
    referral: {
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
      updateMany: jest
        .fn<Promise<{ count: number }>, [unknown]>()
        .mockResolvedValue({ count: 1 }),
    },
    pointsTransaction: {
      findFirst: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue(null),
      aggregate: jest
        .fn<Promise<{ _sum: { amount: number | null } }>, [unknown]>()
        .mockResolvedValue({ _sum: { amount: 0 } }),
      create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
    },
    user: {
      update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
    },
  };

  const prisma = {
    appConfig: {
      findUnique: jest
        .fn<Promise<unknown>, [unknown]>()
        .mockResolvedValue(config),
    },
    referral: {
      findFirst: jest.fn<Promise<unknown>, [unknown]>(),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  const events = { emit: jest.fn() };
  const service = new ReferralsService(prisma as never, events as never);

  return { service, prisma, tx, events };
}

describe('ReferralsService rewards', () => {
  const pendingReferral = {
    id: 'referral-1',
    referrerId: 'referrer-1',
    refereeId: 'referee-1',
    status: 'PENDING',
    convertedAt: null,
    bonusAwarded: 0,
  };

  it('locks the referrer before checking the monthly cap', async () => {
    const { service, prisma, tx } = makeCompletionService();
    prisma.referral.findFirst.mockResolvedValue(pendingReferral);
    tx.referral.findUnique.mockResolvedValue({
      ...pendingReferral,
      status: 'CONVERTED',
      convertedAt: new Date(),
    });

    await service.processExchangeCompletion('referee-1', 'exchange-1');

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.pointsTransaction.aggregate.mock.invocationCallOrder[0],
    );
  });

  it('pays the conversion rewards and the first bonus', async () => {
    const { service, prisma, tx, events } = makeCompletionService();
    prisma.referral.findFirst.mockResolvedValue(pendingReferral);
    tx.referral.findUnique.mockResolvedValue({
      ...pendingReferral,
      status: 'CONVERTED',
      convertedAt: new Date(),
    });

    await service.processExchangeCompletion('referee-1', 'exchange-1');

    expect(tx.user.update).toHaveBeenCalledTimes(3);

    const created = tx.pointsTransaction.create.mock.calls.map(
      (call) => (call[0] as { data: { type: string; amount: number } }).data,
    );
    expect(created.map((row) => row.type)).toEqual([
      'REFERRAL_REWARD',
      'REFERRAL_REWARD',
      'REFERRAL_BONUS',
    ]);
    expect(created.map((row) => row.amount)).toEqual([200, 200, 50]);
    expect(events.emit).toHaveBeenCalledTimes(3);
  });

  it('does not pay the bonus twice for the same exchange', async () => {
    const { service, prisma, tx, events } = makeCompletionService();
    const converted = {
      ...pendingReferral,
      status: 'CONVERTED',
      convertedAt: new Date(),
    };
    prisma.referral.findFirst.mockResolvedValue(converted);
    tx.referral.findUnique.mockResolvedValue(converted);
    tx.pointsTransaction.findFirst.mockResolvedValue({ id: 'bonus-1' });

    await service.processExchangeCompletion('referee-1', 'exchange-1');

    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.pointsTransaction.create).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});
