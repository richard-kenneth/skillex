import { ExchangesService } from './exchanges.service';

function makeService() {
  const tx = {
    exchangeRequest: {
      updateMany: jest
        .fn<Promise<{ count: number }>, [unknown]>()
        .mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn(),
    },
    proposedSlot: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    exchange: {
      create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
    },
  };

  const prisma = {
    exchange: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const points = {
    releaseEscrow: jest.fn(),
    applyFacilitationFee: jest.fn().mockResolvedValue(undefined),
    lockEscrowInTransaction: jest.fn().mockResolvedValue(undefined),
  };
  const events = { emit: jest.fn() };
  const r2 = {};
  const referrals = {
    processExchangeCompletion: jest.fn().mockResolvedValue(undefined),
  };

  const service = new ExchangesService(
    prisma as never,
    points as never,
    events as never,
    r2 as never,
    referrals as never,
  );

  return { service, prisma, tx, points, referrals };
}

function commitExchange(service: ExchangesService, requestId: string) {
  return (
    service as unknown as {
      commitExchangeInternal: (request: { id: string }) => Promise<void>;
    }
  ).commitExchangeInternal({ id: requestId });
}

const COMMITTED_REQUEST = {
  id: 'request-1',
  senderId: 'user-1',
  receiverId: 'user-2',
  requestedSkillId: 'skill-a',
  offeredSkillId: 'skill-b',
  pointsProposal: 50,
  pointsPayerId: 'user-1',
  requestedSkillSessions: 1,
  requestedSkillDuration: 60,
  offeredSkillSessions: 1,
  offeredSkillDuration: 60,
};

const BASE_EXCHANGE = {
  id: 'exchange-1',
  senderId: 'user-1',
  receiverId: 'user-2',
  status: 'IN_PROGRESS',
  senderCompleted: false,
  receiverCompleted: false,
  pointsAmount: 0,
  pointsPayerId: null,
  escrowLocked: false,
};

describe('ExchangesService.markExchangeComplete', () => {
  it('returns early when the exchange is already completed', async () => {
    const { service, prisma, points } = makeService();
    prisma.exchange.findUnique.mockResolvedValue({
      ...BASE_EXCHANGE,
      status: 'COMPLETED',
      senderCompleted: true,
      receiverCompleted: true,
    });
    jest.spyOn(service, 'getExchangeById').mockResolvedValue({} as never);

    await service.markExchangeComplete('user-1', 'exchange-1');

    expect(prisma.exchange.update).not.toHaveBeenCalled();
    expect(points.releaseEscrow).not.toHaveBeenCalled();
  });

  it('lets only the request that claims completion run the payouts', async () => {
    const { service, prisma, points, referrals } = makeService();
    prisma.exchange.findUnique.mockResolvedValue(BASE_EXCHANGE);
    prisma.exchange.update.mockResolvedValue({
      ...BASE_EXCHANGE,
      senderCompleted: true,
      receiverCompleted: true,
    });
    prisma.exchange.updateMany.mockResolvedValue({ count: 0 });
    jest.spyOn(service, 'getExchangeById').mockResolvedValue({} as never);

    await service.markExchangeComplete('user-1', 'exchange-1');

    const claim = prisma.exchange.updateMany.mock.calls[0][0] as {
      where: {
        id: string;
        status: { not: string };
        senderCompleted: boolean;
        receiverCompleted: boolean;
      };
      data: { status: string; completedAt: Date };
    };
    expect(claim.where).toEqual({
      id: 'exchange-1',
      status: { not: 'COMPLETED' },
      senderCompleted: true,
      receiverCompleted: true,
    });
    expect(claim.data.status).toBe('COMPLETED');
    expect(claim.data.completedAt).toBeInstanceOf(Date);
    expect(points.releaseEscrow).not.toHaveBeenCalled();
    expect(points.applyFacilitationFee).not.toHaveBeenCalled();
    expect(referrals.processExchangeCompletion).not.toHaveBeenCalled();
  });
});

describe('ExchangesService.commitExchangeInternal', () => {
  it('does nothing when another transaction already claimed the request', async () => {
    const { service, tx, points } = makeService();
    tx.exchangeRequest.updateMany.mockResolvedValue({ count: 0 });

    await commitExchange(service, 'request-1');

    expect(tx.exchangeRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'request-1', status: 'PENDING' },
      data: { status: 'COMMITTED' },
    });
    expect(tx.exchangeRequest.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(points.lockEscrowInTransaction).not.toHaveBeenCalled();
    expect(tx.exchange.create).not.toHaveBeenCalled();
  });

  it('locks escrow and creates the exchange in the same transaction', async () => {
    const { service, tx, points } = makeService();
    tx.exchangeRequest.findUniqueOrThrow.mockResolvedValue(COMMITTED_REQUEST);
    tx.proposedSlot.findMany.mockResolvedValue([
      { skillId: 'skill-a', dayOfWeek: 1, startTime: '10:00' },
    ]);

    await commitExchange(service, 'request-1');

    expect(points.lockEscrowInTransaction).toHaveBeenCalledWith(
      tx,
      'user-1',
      50,
      'request-1',
    );

    const create = tx.exchange.create.mock.calls[0][0] as {
      data: {
        requestId: string;
        pointsAmount: number;
        pointsPayerId: string;
        escrowLocked: boolean;
        status: string;
        sessions: { create: Array<{ skillId: string; duration: number }> };
      };
    };
    expect(create.data.requestId).toBe('request-1');
    expect(create.data.pointsAmount).toBe(50);
    expect(create.data.pointsPayerId).toBe('user-1');
    expect(create.data.escrowLocked).toBe(true);
    expect(create.data.status).toBe('COMMITTED');
    expect(create.data.sessions.create).toHaveLength(1);
    expect(create.data.sessions.create[0].skillId).toBe('skill-a');
  });

  it('does not create an exchange when locking escrow fails', async () => {
    const { service, tx, points } = makeService();
    tx.exchangeRequest.findUniqueOrThrow.mockResolvedValue(COMMITTED_REQUEST);
    points.lockEscrowInTransaction.mockRejectedValue(
      new Error('Insufficient points'),
    );

    await expect(commitExchange(service, 'request-1')).rejects.toThrow(
      'Insufficient points',
    );

    expect(tx.exchange.create).not.toHaveBeenCalled();
  });

  it('refuses to commit points without a payer', async () => {
    const { service, tx, points } = makeService();
    tx.exchangeRequest.findUniqueOrThrow.mockResolvedValue({
      ...COMMITTED_REQUEST,
      pointsPayerId: null,
    });

    await expect(commitExchange(service, 'request-1')).rejects.toThrow(
      'pointsPayerId is required',
    );

    expect(points.lockEscrowInTransaction).not.toHaveBeenCalled();
    expect(tx.exchange.create).not.toHaveBeenCalled();
  });
});
