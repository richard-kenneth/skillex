import { Logger } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';

function makeService() {
  const prisma = {
    waitlistEntry: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const emailService = { send: jest.fn().mockResolvedValue(undefined) };

  return {
    service: new WaitlistService(prisma as never, emailService as never),
    prisma,
    emailService,
  };
}

describe('WaitlistService', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function loggedMessages(): string {
    return logSpy.mock.calls.map(([message]) => String(message)).join('\n');
  }

  it('logs a redacted address for a new entry', async () => {
    const { service, prisma, emailService } = makeService();
    prisma.waitlistEntry.findUnique.mockResolvedValue(null);
    prisma.waitlistEntry.create.mockResolvedValue({
      email: 'alice@example.com',
      name: null,
    });

    await expect(
      service.join({ email: 'Alice@Example.com', source: 'landing' }),
    ).resolves.toEqual({ success: true, alreadyJoined: false });

    expect(loggedMessages()).toContain('a***@example.com');
    expect(loggedMessages()).toContain('source: landing');
    expect(loggedMessages()).not.toContain('alice@example.com');
    expect(loggedMessages()).not.toContain('Alice@Example.com');
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@example.com' }),
    );
  });

  it('logs a redacted address for a duplicate entry', async () => {
    const { service, prisma, emailService } = makeService();
    prisma.waitlistEntry.findUnique.mockResolvedValue({
      email: 'alice@example.com',
    });

    await expect(
      service.join({ email: 'alice@example.com', source: 'landing' }),
    ).resolves.toEqual({ success: true, alreadyJoined: true });

    expect(loggedMessages()).toContain('a***@example.com');
    expect(loggedMessages()).toContain('source: landing');
    expect(loggedMessages()).not.toContain('alice@example.com');
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });
});
