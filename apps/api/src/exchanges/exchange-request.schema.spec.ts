import * as v from 'valibot';

import { CreateExchangeRequestSchema } from '@skillex/shared';

const baseRequest = {
  receiverId: '22222222-2222-4222-8222-222222222222',
  requestedSkillId: '75e9d069-a1a9-48f7-a56d-40d623eeca74',
};

describe('CreateExchangeRequestSchema', () => {
  it('accepts a UUID receiver id from the seeded demo data', () => {
    const result = v.safeParse(CreateExchangeRequestSchema, baseRequest);

    expect(result.success).toBe(true);
  });

  it('accepts a 32-character receiver id', () => {
    const result = v.safeParse(CreateExchangeRequestSchema, {
      ...baseRequest,
      receiverId: 'a'.repeat(32),
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty receiver id', () => {
    const result = v.safeParse(CreateExchangeRequestSchema, {
      ...baseRequest,
      receiverId: '',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a UUID points payer id', () => {
    const result = v.safeParse(CreateExchangeRequestSchema, {
      ...baseRequest,
      pointsProposal: 50,
      pointsPayerId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a negative points proposal', () => {
    const result = v.safeParse(CreateExchangeRequestSchema, {
      ...baseRequest,
      pointsProposal: -10,
    });

    expect(result.success).toBe(false);
  });
});
