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

function makeService() {
  const tx = {
    pointsTransaction: {
      updateMany: jest
        .fn<Promise<{ count: number }>, [unknown]>()
        .mockResolvedValue({ count: 1 }),
    },
    user: {
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const prisma = {
    pointsTransaction: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  const rates = { getRates: jest.fn() };
  const events = { emit: jest.fn() };
  const posthog = { capture: jest.fn() };

  const service = new PointsService(
    prisma as never,
    rates as never,
    events as never,
    posthog as never,
  );

  return { service, prisma, tx, events, posthog };
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
