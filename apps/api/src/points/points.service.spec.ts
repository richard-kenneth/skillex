import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PointsService } from './points.service';

const TRANSACTION = {
  id: 'tx-1',
  userId: 'user-1',
  amount: 1_000,
  type: 'PURCHASE',
  status: 'PENDING',
  referenceId: 'pts_buy_user-1_123',
  fiatAmount: 5_000,
  fiatCurrency: 'NGN',
  flwRef: null,
};

const VALID_PAYLOAD = {
  event: 'charge.completed',
  data: {
    status: 'successful',
    tx_ref: TRANSACTION.referenceId,
    flw_ref: 'flw-ref-1',
    amount: TRANSACTION.fiatAmount,
    currency: TRANSACTION.fiatCurrency,
  },
};

function objectContaining(value: Record<string, unknown>) {
  // Jest's objectContaining returns `any`; keep the assertion typed so the
  // strict lint rules do not flag the matcher itself.
  return expect.objectContaining(value) as Record<string, unknown>;
}

function makeService() {
  const tx = {
    pointsTransaction: {
      updateMany: jest
        .fn<Promise<{ count: number }>, [unknown]>()
        .mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({ id: 'withdrawal-1' }),
    },
    user: {
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const prisma = {
    pointsTransaction: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'purchase-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
    },
    appConfig: {
      findUnique: jest.fn().mockResolvedValue({
        minWithdrawalPoints: 200,
        withdrawalSpread: 0.06,
      }),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  const rates = {
    getRates: jest.fn().mockResolvedValue({ USD: 1, NGN: 1500 }),
  };
  const events = { emit: jest.fn() };
  const posthog = { capture: jest.fn() };

  const service = new PointsService(
    prisma as never,
    rates as never,
    events as never,
    posthog as never,
  );

  return { service, prisma, rates, tx, events, posthog };
}

describe('PointsService webhook', () => {
  const originalSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;

  beforeEach(() => {
    process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = 'expected-hash';
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
    } else {
      process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH = originalSecret;
    }
  });

  it('fails closed when the webhook secret is not configured', async () => {
    delete process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
    const { service, prisma } = makeService();

    await expect(
      service.verifyWebhook('expected-hash', VALID_PAYLOAD),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.pointsTransaction.findFirst).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature without touching the database', async () => {
    const { service, prisma } = makeService();

    await expect(
      service.verifyWebhook('wrong-hash', VALID_PAYLOAD),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.pointsTransaction.findFirst).not.toHaveBeenCalled();
  });

  it('ignores events that are not successful charge completions', async () => {
    const { service, prisma } = makeService();

    await expect(
      service.verifyWebhook('expected-hash', {
        event: 'transfer.completed',
      }),
    ).resolves.toEqual({ received: true });

    expect(prisma.pointsTransaction.findFirst).not.toHaveBeenCalled();
  });

  it('refuses to credit when the paid amount does not match', async () => {
    const { service, prisma, tx, events } = makeService();
    prisma.pointsTransaction.findFirst.mockResolvedValue(TRANSACTION);

    await expect(
      service.verifyWebhook('expected-hash', {
        ...VALID_PAYLOAD,
        data: { ...VALID_PAYLOAD.data, amount: 100 },
      }),
    ).resolves.toEqual({ received: true });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('refuses to credit when the paid currency does not match', async () => {
    const { service, prisma, tx } = makeService();
    prisma.pointsTransaction.findFirst.mockResolvedValue(TRANSACTION);

    await expect(
      service.verifyWebhook('expected-hash', {
        ...VALID_PAYLOAD,
        data: { ...VALID_PAYLOAD.data, currency: 'USD' },
      }),
    ).resolves.toEqual({ received: true });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('ignores malformed payloads without touching the database', async () => {
    const { service, prisma } = makeService();

    await expect(service.verifyWebhook('expected-hash', null)).resolves.toEqual(
      { received: true },
    );
    await expect(
      service.verifyWebhook('expected-hash', 'not-an-object'),
    ).resolves.toEqual({ received: true });

    expect(prisma.pointsTransaction.findFirst).not.toHaveBeenCalled();
  });

  it('accepts a numeric string amount from Flutterwave', async () => {
    const { service, prisma, tx } = makeService();
    prisma.pointsTransaction.findFirst.mockResolvedValue(TRANSACTION);

    await expect(
      service.verifyWebhook('expected-hash', {
        ...VALID_PAYLOAD,
        data: { ...VALID_PAYLOAD.data, amount: '5000' },
      }),
    ).resolves.toEqual({ received: true });

    expect(tx.user.update).toHaveBeenCalled();
  });

  it('credits a matching payment exactly once', async () => {
    const { service, prisma, tx, events, posthog } = makeService();
    prisma.pointsTransaction.findFirst.mockResolvedValue(TRANSACTION);

    await expect(
      service.verifyWebhook('expected-hash', VALID_PAYLOAD),
    ).resolves.toEqual({ received: true });

    const claim = tx.pointsTransaction.updateMany.mock.calls[0][0] as {
      where: { id: string; status: string };
      data: { status: string; flwRef: string; description: string };
    };
    expect(claim.where).toEqual({ id: TRANSACTION.id, status: 'PENDING' });
    expect(claim.data.status).toBe('SUCCESS');
    expect(claim.data.flwRef).toBe('flw-ref-1');
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: TRANSACTION.userId },
      data: { pointsBalance: { increment: TRANSACTION.amount } },
    });
    expect(events.emit).toHaveBeenCalledWith('points.purchased', {
      userId: TRANSACTION.userId,
      amount: TRANSACTION.amount,
    });
    expect(posthog.capture).toHaveBeenCalled();
  });

  it('does not credit twice when the same webhook is delivered again', async () => {
    const { service, prisma, tx, events } = makeService();
    prisma.pointsTransaction.findFirst.mockResolvedValue(TRANSACTION);
    tx.pointsTransaction.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.verifyWebhook('expected-hash', VALID_PAYLOAD),
    ).resolves.toEqual({ received: true });

    expect(tx.user.update).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe('PointsService optional payments', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.FLUTTERWAVE_SECRET_KEY;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSecretKey === undefined) {
      delete process.env.FLUTTERWAVE_SECRET_KEY;
    } else {
      process.env.FLUTTERWAVE_SECRET_KEY = originalSecretKey;
    }
  });

  it('credits points immediately with the local mock purchase', async () => {
    const { service, prisma, tx, events, posthog } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      email: 'demo@skillex.dev',
      name: 'Demo User',
      preferredCurrency: 'USD',
    });

    const result = await service.initiatePurchase('user-1', {
      amount: 500,
      currency: 'USD',
    });

    expect(result).toMatchObject({
      mock: true,
      credited: true,
      targetPoints: 500,
      fiatCurrency: 'USD',
    });
    expect(prisma.pointsTransaction.create).toHaveBeenCalledWith({
      data: objectContaining({
        userId: 'user-1',
        amount: 500,
        status: 'PENDING',
      }),
    });
    expect(tx.pointsTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'purchase-1', status: 'PENDING' },
      data: objectContaining({ status: 'SUCCESS' }),
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { pointsBalance: { increment: 500 } },
    });
    expect(events.emit).toHaveBeenCalledWith('points.purchased', {
      userId: 'user-1',
      amount: 500,
    });
    expect(posthog.capture).toHaveBeenCalled();
  });

  it('fails closed in production when Flutterwave is not configured', async () => {
    process.env.NODE_ENV = 'production';
    const { service, prisma, tx } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      email: 'demo@skillex.dev',
      name: 'Demo User',
      preferredCurrency: 'USD',
    });

    await expect(
      service.initiatePurchase('user-1', { amount: 500, currency: 'USD' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.pointsTransaction.update).toHaveBeenCalledWith({
      where: { id: 'purchase-1' },
      data: objectContaining({ status: 'FAILED' }),
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('completes a mock withdrawal without contacting Flutterwave', async () => {
    const { service, prisma, tx, events } = makeService();
    prisma.user.findUnique.mockResolvedValue({ pointsBalance: 1_000 });
    prisma.pointsTransaction.findFirst.mockResolvedValue(null);

    const result = await service.withdrawPoints('user-1', {
      amount: 500,
      bankCode: '000',
      accountNumber: '0123456789',
    });

    expect(result).toMatchObject({
      success: true,
      mock: true,
      amountToTransfer: 7050,
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', pointsBalance: { gte: 500 } },
      data: { pointsBalance: { decrement: 500 } },
    });
    expect(tx.pointsTransaction.create).toHaveBeenCalled();
    expect(prisma.pointsTransaction.update).toHaveBeenCalledWith({
      where: { id: 'withdrawal-1' },
      data: objectContaining({ status: 'SUCCESS' }),
    });
    expect(events.emit).toHaveBeenCalledWith('points.withdrawn', {
      userId: 'user-1',
      amount: 500,
      status: 'SUCCESS',
    });
  });

  it('provides mock banks and account resolution in development', async () => {
    const { service } = makeService();

    await expect(service.getBanks()).resolves.toEqual([
      { id: 1, code: '000', name: 'SkillEx Test Bank' },
      { id: 2, code: '001', name: 'Demo Microfinance Bank' },
    ]);

    await expect(service.resolveAccount('0123456789', '000')).resolves.toEqual({
      success: true,
      accountName: 'SkillEx Test Account',
      mock: true,
    });
  });

  it('disables banks and account resolution in production without keys', async () => {
    process.env.NODE_ENV = 'production';
    const { service } = makeService();

    await expect(service.getBanks()).resolves.toEqual([]);
    await expect(service.resolveAccount('0123456789', '000')).resolves.toEqual({
      success: false,
      message: 'Payments are not configured on this server.',
    });
  });
});
