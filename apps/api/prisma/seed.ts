import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';
import { SEED_CATEGORIES } from '@skillex/shared';

dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL as string,
  }),
});

const DEMO_PASSWORD = 'Password123!';

const DEMO_USERS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'demo@skillex.dev',
    name: 'Demo User',
    bio: 'Full-stack developer trading TypeScript and React lessons for design and languages.',
    pointsBalance: 1_250,
    preferredCurrency: 'USD',
    referralCode: 'DEMO2026',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'ada@skillex.dev',
    name: 'Ada Lovelace',
    bio: 'Software engineer and design enthusiast. I teach Python and UI design.',
    pointsBalance: 840,
    preferredCurrency: 'GBP',
    referralCode: 'ADA2026',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'grace@skillex.dev',
    name: 'Grace Hopper',
    bio: 'Engineering manager. Happy to trade project management and agile coaching.',
    pointsBalance: 620,
    preferredCurrency: 'USD',
    referralCode: 'GRACE2026',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'linus@skillex.dev',
    name: 'Linus Torvalds',
    bio: 'Systems programmer learning design. I can teach Linux fundamentals.',
    pointsBalance: 310,
    preferredCurrency: 'EUR',
    referralCode: 'LINUS2026',
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'maya@skillex.dev',
    name: 'Maya Angelou',
    bio: 'Content strategist and writer. Learning to code one exchange at a time.',
    pointsBalance: 430,
    preferredCurrency: 'USD',
    referralCode: 'MAYA2026',
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'sam@skillex.dev',
    name: 'Sam Altman',
    bio: 'Founder and operator. I trade business strategy for product and design help.',
    pointsBalance: 90,
    preferredCurrency: 'USD',
    referralCode: 'SAM2026',
  },
] as const;

const USER_SKILLS: Record<string, { offering: string[]; seeking: string[] }> = {
  'demo@skillex.dev': {
    offering: ['TypeScript', 'React', 'Node.js'],
    seeking: ['UI Design', 'Spanish'],
  },
  'ada@skillex.dev': {
    offering: ['Python', 'UI Design'],
    seeking: ['React', 'Public Speaking'],
  },
  'grace@skillex.dev': {
    offering: ['Project Management', 'Agile'],
    seeking: ['Python', 'Business Analysis'],
  },
  'linus@skillex.dev': {
    offering: ['JavaScript', 'NestJS'],
    seeking: ['UI Design', 'Content Marketing'],
  },
  'maya@skillex.dev': {
    offering: ['Content Marketing', 'SEO'],
    seeking: ['TypeScript', 'Public Speaking'],
  },
  'sam@skillex.dev': {
    offering: ['Business Analysis', 'Leadership'],
    seeking: ['React', 'Figma'],
  },
};

const COMPLETED_BARTER_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const COMPLETED_BARTER_EXCHANGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const COMPLETED_POINTS_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const COMPLETED_POINTS_EXCHANGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const IN_PROGRESS_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const IN_PROGRESS_EXCHANGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
const COMMITTED_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const COMMITTED_EXCHANGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4';
const PENDING_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';
const PENDING_REQUEST_ID_2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';
const PENDING_REQUEST_ID_3 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7';
const REJECTED_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8';

const DEMO_REQUEST_IDS = [
  COMPLETED_BARTER_REQUEST_ID,
  COMPLETED_POINTS_REQUEST_ID,
  IN_PROGRESS_REQUEST_ID,
  COMMITTED_REQUEST_ID,
  PENDING_REQUEST_ID,
  PENDING_REQUEST_ID_2,
  PENDING_REQUEST_ID_3,
  REJECTED_REQUEST_ID,
];

const DEMO_EXCHANGE_IDS = [
  COMPLETED_BARTER_EXCHANGE_ID,
  COMPLETED_POINTS_EXCHANGE_ID,
  IN_PROGRESS_EXCHANGE_ID,
  COMMITTED_EXCHANGE_ID,
];

function daysFromNow(days: number, hour = 14): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function seedAppConfig() {
  console.log('Initializing AppConfig...');
  await prisma.appConfig.upsert({
    where: { id: 'singleton' },
    update: {
      exchangeCommissionRate: 0.1,
      facilitationFee: 5,
      withdrawalSpread: 0.06,
      minWithdrawalPoints: 200,
      prelaunchMode: false,
    },
    create: {
      id: 'singleton',
      exchangeCommissionRate: 0.1,
      facilitationFee: 5,
      withdrawalSpread: 0.06,
      minWithdrawalPoints: 200,
      referralRewardReferrer: 200,
      referralRewardReferee: 200,
      referralBonusPerExchange: 50,
      referralBonusCap: 500,
      referralMonthlyCap: 5000,
      recordingPointsPerMinute: 4,
      prelaunchMode: false,
    },
  });
}

async function seedSkills() {
  console.log('Seeding categories and skills from @skillex/shared...');

  for (const cat of SEED_CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {
        sponsorName: cat.sponsor?.name ?? null,
        sponsorLogo: cat.sponsor?.logo ?? null,
        sponsorUrl: cat.sponsor?.url ?? null,
      },
      create: {
        name: cat.name,
        sponsorName: cat.sponsor?.name ?? null,
        sponsorLogo: cat.sponsor?.logo ?? null,
        sponsorUrl: cat.sponsor?.url ?? null,
      },
    });

    for (const skillName of cat.skills) {
      await prisma.skill.upsert({
        where: { name: skillName },
        update: { categoryId: category.id },
        create: {
          name: skillName,
          categoryId: category.id,
        },
      });
    }
  }

  const skills = await prisma.skill.findMany();
  return new Map(skills.map((skill) => [skill.name, skill]));
}

async function seedDemoUsers() {
  console.log('Seeding demo users...');
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = new Map<string, { id: string; email: string; name: string }>();

  for (const demo of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        name: demo.name,
        bio: demo.bio,
        emailVerified: true,
        pointsBalance: demo.pointsBalance,
        preferredCurrency: demo.preferredCurrency,
        referralCode: demo.referralCode,
        emailNotifications: true,
        inAppNotifications: true,
        pushNotifications: true,
      },
      create: {
        id: demo.id,
        email: demo.email,
        name: demo.name,
        bio: demo.bio,
        emailVerified: true,
        pointsBalance: demo.pointsBalance,
        preferredCurrency: demo.preferredCurrency,
        referralCode: demo.referralCode,
      },
    });

    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { accountId: user.id, password: passwordHash },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          password: passwordHash,
        },
      });
    }

    users.set(user.email, {
      id: user.id,
      email: user.email,
      name: user.name ?? demo.name,
    });
  }

  return users;
}

async function seedUserSkills(
  users: Map<string, { id: string }>,
  skills: Map<string, { id: string }>,
) {
  console.log('Seeding user skills...');

  for (const [email, plan] of Object.entries(USER_SKILLS)) {
    const user = users.get(email);
    if (!user) continue;

    for (const skillName of plan.offering) {
      const skill = skills.get(skillName);
      if (!skill) continue;

      await prisma.userSkill.upsert({
        where: {
          userId_skillId_type: {
            userId: user.id,
            skillId: skill.id,
            type: 'OFFERING',
          },
        },
        update: { experienceLevel: 'INTERMEDIATE' },
        create: {
          userId: user.id,
          skillId: skill.id,
          type: 'OFFERING',
          experienceLevel: 'INTERMEDIATE',
        },
      });
    }

    for (const skillName of plan.seeking) {
      const skill = skills.get(skillName);
      if (!skill) continue;

      await prisma.userSkill.upsert({
        where: {
          userId_skillId_type: {
            userId: user.id,
            skillId: skill.id,
            type: 'SEEKING',
          },
        },
        update: { experienceLevel: 'BEGINNER' },
        create: {
          userId: user.id,
          skillId: skill.id,
          type: 'SEEKING',
          experienceLevel: 'BEGINNER',
        },
      });
    }
  }
}

async function seedDemoExchanges(
  users: Map<string, { id: string }>,
  skills: Map<string, { id: string }>,
) {
  const demo = users.get('demo@skillex.dev')!;
  const ada = users.get('ada@skillex.dev')!;
  const grace = users.get('grace@skillex.dev')!;
  const linus = users.get('linus@skillex.dev')!;
  const maya = users.get('maya@skillex.dev')!;
  const sam = users.get('sam@skillex.dev')!;

  const skillId = (name: string) => {
    const skill = skills.get(name);
    if (!skill) throw new Error(`Missing seeded skill: ${name}`);
    return skill.id;
  };

  console.log('Resetting demo exchanges...');
  await prisma.exchange.deleteMany({
    where: { id: { in: DEMO_EXCHANGE_IDS } },
  });
  await prisma.exchangeRequest.deleteMany({
    where: { id: { in: DEMO_REQUEST_IDS } },
  });

  console.log('Seeding exchange requests and exchanges...');

  // 1. Completed barter exchange: Demo teaches TypeScript, Ada teaches UI Design.
  await prisma.exchangeRequest.create({
    data: {
      id: COMPLETED_BARTER_REQUEST_ID,
      senderId: demo.id,
      receiverId: ada.id,
      requestedSkillId: skillId('UI Design'),
      offeredSkillId: skillId('TypeScript'),
      status: 'COMMITTED',
      pointsProposal: 0,
      requestedSkillSessions: 1,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      senderAgreed: true,
      receiverAgreed: true,
      scheduledAt: daysFromNow(-14, 15),
      completedAt: daysFromNow(-14, 16),
    },
  });

  await prisma.exchange.create({
    data: {
      id: COMPLETED_BARTER_EXCHANGE_ID,
      requestId: COMPLETED_BARTER_REQUEST_ID,
      senderId: demo.id,
      receiverId: ada.id,
      taughtSkillId: skillId('TypeScript'),
      receivedSkillId: skillId('UI Design'),
      pointsAmount: 0,
      escrowLocked: false,
      requestedSkillSessions: 1,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      completedSessions: 2,
      status: 'COMPLETED',
      senderCompleted: true,
      receiverCompleted: true,
      committedAt: daysFromNow(-20, 10),
      completedAt: daysFromNow(-14, 16),
      sessions: {
        create: [
          {
            skillId: skillId('TypeScript'),
            scheduledAt: daysFromNow(-14, 15),
            completedAt: daysFromNow(-14, 16),
            duration: 60,
            status: 'COMPLETED',
          },
          {
            skillId: skillId('UI Design'),
            scheduledAt: daysFromNow(-7, 15),
            completedAt: daysFromNow(-7, 16),
            duration: 60,
            status: 'COMPLETED',
          },
        ],
      },
      chatMessages: {
        create: [
          {
            senderId: demo.id,
            content:
              'Thanks for the Figma walkthrough — the auto-layout tips were great.',
          },
          {
            senderId: ada.id,
            content:
              'Your TypeScript generics explanation finally made it click. See you next time!',
          },
        ],
      },
      reviews: {
        create: [
          {
            reviewerId: demo.id,
            revieweeId: ada.id,
            rating: 5,
            tags: ['GREAT_TEACHER', 'PATIENT', 'CLEAR_EXPLANATIONS'],
          },
          {
            reviewerId: ada.id,
            revieweeId: demo.id,
            rating: 5,
            tags: ['KNOWLEDGEABLE', 'ON_TIME', 'WOULD_EXCHANGE_AGAIN'],
          },
        ],
      },
    },
  });

  // 2. Completed exchange with points: Grace pays Ada 200 points for Python.
  await prisma.exchangeRequest.create({
    data: {
      id: COMPLETED_POINTS_REQUEST_ID,
      senderId: grace.id,
      receiverId: ada.id,
      requestedSkillId: skillId('Python'),
      offeredSkillId: skillId('Project Management'),
      status: 'COMMITTED',
      pointsProposal: 200,
      pointsPayerId: grace.id,
      requestedSkillSessions: 1,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      senderAgreed: true,
      receiverAgreed: true,
      scheduledAt: daysFromNow(-10, 17),
      completedAt: daysFromNow(-10, 18),
    },
  });

  await prisma.exchange.create({
    data: {
      id: COMPLETED_POINTS_EXCHANGE_ID,
      requestId: COMPLETED_POINTS_REQUEST_ID,
      senderId: grace.id,
      receiverId: ada.id,
      taughtSkillId: skillId('Project Management'),
      receivedSkillId: skillId('Python'),
      pointsAmount: 200,
      pointsPayerId: grace.id,
      escrowLocked: false,
      requestedSkillSessions: 1,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      completedSessions: 2,
      status: 'COMPLETED',
      senderCompleted: true,
      receiverCompleted: true,
      committedAt: daysFromNow(-16, 9),
      completedAt: daysFromNow(-10, 18),
      sessions: {
        create: [
          {
            skillId: skillId('Python'),
            scheduledAt: daysFromNow(-10, 17),
            completedAt: daysFromNow(-10, 18),
            duration: 60,
            status: 'COMPLETED',
          },
          {
            skillId: skillId('Project Management'),
            scheduledAt: daysFromNow(-3, 17),
            completedAt: daysFromNow(-3, 18),
            duration: 60,
            status: 'COMPLETED',
          },
        ],
      },
      reviews: {
        create: [
          {
            reviewerId: grace.id,
            revieweeId: ada.id,
            rating: 5,
            tags: ['GREAT_TEACHER', 'WELL_PREPARED'],
          },
          {
            reviewerId: ada.id,
            revieweeId: grace.id,
            rating: 4,
            tags: ['GOOD_COMMUNICATOR', 'WOULD_EXCHANGE_AGAIN'],
          },
        ],
      },
    },
  });

  // 3. In-progress exchange: Linus learns UI Design from Maya.
  await prisma.exchangeRequest.create({
    data: {
      id: IN_PROGRESS_REQUEST_ID,
      senderId: linus.id,
      receiverId: maya.id,
      requestedSkillId: skillId('UI Design'),
      offeredSkillId: skillId('JavaScript'),
      status: 'COMMITTED',
      pointsProposal: 0,
      requestedSkillSessions: 2,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      senderAgreed: true,
      receiverAgreed: true,
      scheduledAt: daysFromNow(-1, 18),
    },
  });

  await prisma.exchange.create({
    data: {
      id: IN_PROGRESS_EXCHANGE_ID,
      requestId: IN_PROGRESS_REQUEST_ID,
      senderId: linus.id,
      receiverId: maya.id,
      taughtSkillId: skillId('JavaScript'),
      receivedSkillId: skillId('UI Design'),
      pointsAmount: 0,
      escrowLocked: false,
      requestedSkillSessions: 2,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      completedSessions: 1,
      status: 'IN_PROGRESS',
      senderCompleted: false,
      receiverCompleted: false,
      committedAt: daysFromNow(-5, 11),
      sessions: {
        create: [
          {
            skillId: skillId('UI Design'),
            scheduledAt: daysFromNow(-1, 18),
            completedAt: daysFromNow(-1, 19),
            duration: 60,
            status: 'COMPLETED',
          },
          {
            skillId: skillId('UI Design'),
            scheduledAt: daysFromNow(2, 18),
            duration: 60,
            status: 'SCHEDULED',
          },
          {
            skillId: skillId('JavaScript'),
            scheduledAt: daysFromNow(4, 18),
            duration: 60,
            status: 'SCHEDULED',
          },
        ],
      },
    },
  });

  // 4. Upcoming committed exchange: Sam pays Demo 50 points for React help.
  await prisma.exchangeRequest.create({
    data: {
      id: COMMITTED_REQUEST_ID,
      senderId: sam.id,
      receiverId: demo.id,
      requestedSkillId: skillId('React'),
      offeredSkillId: skillId('Business Analysis'),
      status: 'COMMITTED',
      pointsProposal: 50,
      pointsPayerId: sam.id,
      requestedSkillSessions: 1,
      requestedSkillDuration: 90,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      senderAgreed: true,
      receiverAgreed: true,
      scheduledAt: daysFromNow(3, 16),
    },
  });

  await prisma.exchange.create({
    data: {
      id: COMMITTED_EXCHANGE_ID,
      requestId: COMMITTED_REQUEST_ID,
      senderId: sam.id,
      receiverId: demo.id,
      taughtSkillId: skillId('Business Analysis'),
      receivedSkillId: skillId('React'),
      pointsAmount: 50,
      pointsPayerId: sam.id,
      escrowLocked: true,
      requestedSkillSessions: 1,
      requestedSkillDuration: 90,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      completedSessions: 0,
      status: 'COMMITTED',
      senderCompleted: false,
      receiverCompleted: false,
      committedAt: daysFromNow(-2, 12),
      sessions: {
        create: [
          {
            skillId: skillId('React'),
            scheduledAt: daysFromNow(3, 16),
            duration: 90,
            status: 'SCHEDULED',
          },
          {
            skillId: skillId('Business Analysis'),
            scheduledAt: daysFromNow(5, 16),
            duration: 60,
            status: 'SCHEDULED',
          },
        ],
      },
    },
  });

  // 5. Pending requests in various states.
  await prisma.exchangeRequest.create({
    data: {
      id: PENDING_REQUEST_ID,
      senderId: demo.id,
      receiverId: grace.id,
      requestedSkillId: skillId('Spanish'),
      offeredSkillId: skillId('React'),
      status: 'PENDING',
      pointsProposal: 0,
      requestedSkillSessions: 1,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      senderAgreed: true,
      receiverAgreed: false,
      proposedSlots: {
        create: [
          {
            proposerId: demo.id,
            skillId: skillId('Spanish'),
            dayOfWeek: 2,
            startTime: '18:00',
          },
          {
            proposerId: demo.id,
            skillId: skillId('Spanish'),
            dayOfWeek: 4,
            startTime: '18:00',
          },
        ],
      },
      messages: {
        create: [
          {
            senderId: demo.id,
            receiverId: grace.id,
            messageKey: 'INTERESTED_IN_EXCHANGE',
          },
          {
            senderId: grace.id,
            receiverId: demo.id,
            messageKey: 'PROPOSE_TERMS',
            requestedSkillSessions: 1,
            requestedSkillDuration: 60,
            offeredSkillSessions: 1,
            offeredSkillDuration: 60,
          },
        ],
      },
    },
  });

  await prisma.exchangeRequest.create({
    data: {
      id: PENDING_REQUEST_ID_2,
      senderId: maya.id,
      receiverId: demo.id,
      requestedSkillId: skillId('TypeScript'),
      offeredSkillId: skillId('Content Marketing'),
      status: 'PENDING',
      pointsProposal: 100,
      pointsPayerId: maya.id,
      requestedSkillSessions: 1,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      senderAgreed: true,
      receiverAgreed: false,
      proposedSlots: {
        create: [
          {
            proposerId: maya.id,
            skillId: skillId('TypeScript'),
            dayOfWeek: 6,
            startTime: '10:00',
          },
        ],
      },
      messages: {
        create: [
          {
            senderId: maya.id,
            receiverId: demo.id,
            messageKey: 'INTERESTED_IN_EXCHANGE',
            pointsProposal: 100,
            pointsPayerId: maya.id,
          },
        ],
      },
    },
  });

  await prisma.exchangeRequest.create({
    data: {
      id: PENDING_REQUEST_ID_3,
      senderId: ada.id,
      receiverId: linus.id,
      requestedSkillId: skillId('NestJS'),
      offeredSkillId: skillId('Python'),
      status: 'PENDING',
      pointsProposal: 0,
      requestedSkillSessions: 1,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      senderAgreed: true,
      receiverAgreed: false,
    },
  });

  await prisma.exchangeRequest.create({
    data: {
      id: REJECTED_REQUEST_ID,
      senderId: sam.id,
      receiverId: grace.id,
      requestedSkillId: skillId('Agile'),
      offeredSkillId: skillId('Leadership'),
      status: 'REJECTED',
      pointsProposal: 0,
      requestedSkillSessions: 1,
      requestedSkillDuration: 60,
      offeredSkillSessions: 1,
      offeredSkillDuration: 60,
      senderAgreed: true,
      receiverAgreed: false,
    },
  });
}

async function seedReferralsAndPoints(users: Map<string, { id: string }>) {
  const demo = users.get('demo@skillex.dev')!;
  const ada = users.get('ada@skillex.dev')!;
  const grace = users.get('grace@skillex.dev')!;
  const linus = users.get('linus@skillex.dev')!;
  const maya = users.get('maya@skillex.dev')!;
  const sam = users.get('sam@skillex.dev')!;

  console.log('Seeding referral and points history...');

  await prisma.referral.upsert({
    where: {
      referrerId_refereeId: {
        referrerId: demo.id,
        refereeId: maya.id,
      },
    },
    update: {
      status: 'CONVERTED',
      referrerRewarded: true,
      refereeRewarded: true,
      bonusAwarded: 400,
      convertedAt: daysFromNow(-8, 12),
    },
    create: {
      referrerId: demo.id,
      refereeId: maya.id,
      status: 'CONVERTED',
      referrerRewarded: true,
      refereeRewarded: true,
      bonusAwarded: 400,
      convertedAt: daysFromNow(-8, 12),
    },
  });

  const demoUserIds = [demo.id, ada.id, grace.id, linus.id, maya.id, sam.id];
  await prisma.pointsTransaction.deleteMany({
    where: { userId: { in: demoUserIds } },
  });

  await prisma.pointsTransaction.createMany({
    data: [
      {
        userId: demo.id,
        amount: 1_250,
        type: 'PURCHASE',
        status: 'SUCCESS',
        fiatAmount: 12.5,
        fiatCurrency: 'USD',
        referenceId: 'seed_purchase_demo',
        description: 'Purchased 1,250 points (demo data)',
      },
      {
        userId: demo.id,
        amount: 200,
        type: 'REFERRAL_REWARD',
        status: 'SUCCESS',
        referenceId: 'seed_referral_demo',
        description: 'Referral reward for inviting Maya',
      },
      {
        userId: demo.id,
        amount: -5,
        type: 'FACILITATION_FEE',
        status: 'SUCCESS',
        referenceId: COMPLETED_BARTER_EXCHANGE_ID,
        description: 'Exchange facilitation fee',
      },
      {
        userId: ada.id,
        amount: 180,
        type: 'ESCROW_RELEASE',
        status: 'SUCCESS',
        referenceId: COMPLETED_POINTS_EXCHANGE_ID,
        description:
          'Received 180 points from completed exchange (20 pts platform service)',
      },
      {
        userId: ada.id,
        amount: -5,
        type: 'FACILITATION_FEE',
        status: 'SUCCESS',
        referenceId: COMPLETED_POINTS_EXCHANGE_ID,
        description: 'Exchange facilitation fee',
      },
      {
        userId: grace.id,
        amount: -200,
        type: 'ESCROW_LOCK',
        status: 'SUCCESS',
        referenceId: COMPLETED_POINTS_EXCHANGE_ID,
        description: 'Locked 200 points in escrow for Python exchange',
      },
      {
        userId: grace.id,
        amount: 180,
        type: 'ESCROW_RELEASE',
        status: 'SUCCESS',
        referenceId: COMPLETED_POINTS_EXCHANGE_ID,
        description: 'Received 180 points for teaching project management',
      },
      {
        userId: grace.id,
        amount: -20,
        type: 'EXCHANGE_COMMISSION',
        status: 'SUCCESS',
        referenceId: COMPLETED_POINTS_EXCHANGE_ID,
        description: 'Platform service commission',
      },
      {
        userId: linus.id,
        amount: 300,
        type: 'PURCHASE',
        status: 'SUCCESS',
        fiatAmount: 3,
        fiatCurrency: 'USD',
        referenceId: 'seed_purchase_linus',
        description: 'Purchased 300 points (demo data)',
      },
      {
        userId: linus.id,
        amount: -5,
        type: 'FACILITATION_FEE',
        status: 'SUCCESS',
        referenceId: IN_PROGRESS_EXCHANGE_ID,
        description: 'Exchange facilitation fee',
      },
      {
        userId: maya.id,
        amount: 200,
        type: 'REFERRAL_REWARD',
        status: 'SUCCESS',
        referenceId: 'seed_referral_maya',
        description: 'Welcome referral reward',
      },
      {
        userId: sam.id,
        amount: -50,
        type: 'ESCROW_LOCK',
        status: 'SUCCESS',
        referenceId: COMMITTED_EXCHANGE_ID,
        description: 'Locked 50 points in escrow for React exchange',
      },
      {
        userId: sam.id,
        amount: 100,
        type: 'PURCHASE',
        status: 'PENDING',
        fiatAmount: 1,
        fiatCurrency: 'USD',
        referenceId: 'seed_purchase_sam_pending',
        description: 'Pending purchase of 100 points',
      },
    ],
  });
}

async function seedNotifications(users: Map<string, { id: string }>) {
  const demo = users.get('demo@skillex.dev')!;
  const ada = users.get('ada@skillex.dev')!;
  const grace = users.get('grace@skillex.dev')!;

  console.log('Seeding notifications...');

  await prisma.notification.deleteMany({
    where: { userId: { in: [demo.id, ada.id, grace.id] } },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: demo.id,
        title: 'New exchange request',
        message:
          'Maya wants to trade Content Marketing for TypeScript lessons.',
        type: 'EXCHANGE_REQUEST_RECEIVED',
        link: `/exchanges/${PENDING_REQUEST_ID_2}`,
        read: false,
      },
      {
        userId: demo.id,
        title: 'Session coming up',
        message: 'Your React session with Sam is in 3 days.',
        type: 'SESSION_REMINDER',
        link: `/exchanges/${COMMITTED_EXCHANGE_ID}`,
        read: false,
      },
      {
        userId: demo.id,
        title: 'Leave a review',
        message: 'How was your exchange with Ada? Share a review.',
        type: 'REVIEW_REQUESTED',
        link: `/exchanges/${COMPLETED_BARTER_EXCHANGE_ID}`,
        read: true,
      },
      {
        userId: demo.id,
        title: 'Referral reward',
        message: 'You earned 200 points for inviting Maya.',
        type: 'REFERRAL_REWARD',
        link: '/points',
        read: true,
      },
      {
        userId: ada.id,
        title: 'Review received',
        message: 'Grace left you a 5-star review.',
        type: 'REVIEW_RECEIVED',
        link: '/profile',
        read: false,
      },
      {
        userId: grace.id,
        title: 'Exchange completed',
        message: 'Your Python exchange with Ada is complete.',
        type: 'EXCHANGE_COMPLETED',
        link: `/exchanges/${COMPLETED_POINTS_EXCHANGE_ID}`,
        read: true,
      },
    ],
  });
}

async function seedWaitlist() {
  console.log('Seeding waitlist entries...');

  const entries = [
    {
      email: 'earlybird@example.com',
      name: 'Early Bird',
      source: 'landing_hero',
    },
    {
      email: 'designer@example.com',
      name: 'Dana Designer',
      source: 'landing_footer',
    },
    {
      email: 'engineer@example.com',
      name: 'Eli Engineer',
      source: 'landing_hero',
    },
  ];

  for (const entry of entries) {
    await prisma.waitlistEntry.upsert({
      where: { email: entry.email },
      update: { name: entry.name, source: entry.source },
      create: entry,
    });
  }
}

async function main() {
  await seedAppConfig();
  const skills = await seedSkills();

  const shouldSeedDemo =
    process.env.NODE_ENV !== 'production' ||
    process.env.SEED_DEMO_DATA === 'true';

  if (!shouldSeedDemo) {
    console.log(
      'Skipping demo data. Set SEED_DEMO_DATA=true to seed it in production.',
    );
    console.log('Base seeding complete.');
    return;
  }

  const users = await seedDemoUsers();
  await seedUserSkills(users, skills);
  await seedDemoExchanges(users, skills);
  await seedReferralsAndPoints(users);
  await seedNotifications(users);
  await seedWaitlist();

  console.log('');
  console.log('Demo login: demo@skillex.dev / Password123!');
  console.log('All seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
