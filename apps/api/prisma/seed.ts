import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';
import { SEED_CATEGORIES } from '@skillex/shared';

dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL as string,
  }),
});

async function main() {
  // Initialize AppConfig
  console.log('Initializing AppConfig...');
  await prisma.appConfig.upsert({
    where: { id: 'singleton' },
    update: {
      exchangeCommissionRate: 0.1,
      facilitationFee: 5,
      withdrawalSpread: 0.06,
      minWithdrawalPoints: 200,
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
    },
  });

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

    console.log(`Category: ${category.name}`);

    for (const skillName of cat.skills) {
      await prisma.skill.upsert({
        where: { name: skillName },
        update: { categoryId: category.id },
        create: {
          name: skillName,
          categoryId: category.id,
        },
      });
      console.log(`  - Skill: ${skillName}`);
    }
  }

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
