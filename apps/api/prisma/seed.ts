import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';

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
    update: {},
    create: { id: 'singleton' },
  });

  const categories = [
    {
      name: 'Programming',
      skills: [
        'JavaScript',
        'TypeScript',
        'Python',
        'React',
        'Node.js',
        'NestJS',
        'Next.js',
        'Prisma',
      ],
    },
    {
      name: 'Design',
      skills: [
        'UI Design',
        'UX Design',
        'Figma',
        'Adobe XD',
        'Graphic Design',
        'Logo Design',
      ],
    },
    {
      name: 'Marketing',
      skills: [
        'SEO',
        'Content Marketing',
        'Social Media',
        'Email Marketing',
        'Digital Strategy',
      ],
    },
    {
      name: 'Business',
      skills: [
        'Project Management',
        'Agile',
        'Business Analysis',
        'Public Speaking',
        'Leadership',
      ],
    },
    {
      name: 'Languages',
      skills: ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'],
    },
    {
      name: 'Lifestyle',
      skills: ['Cooking', 'Yoga', 'Fitness', 'Music Production', 'Photography'],
    },
  ];

  // [x] Implement `SkillsService`
  // [x] Implement `SkillsController`
  // [x] Seed initial categories and skills
  // [x] Integrate `SkillManager` into `ProfileForm`
  // [/] Fix lint errors and verify functionality
  //     [x] Frontend `SkillManager` lint & types
  //     [/] Backend `SkillsController` & `seed.ts` lint
  // [ ] Test skill management flow (add/remove)

  console.log('Seeding categories and skills...');

  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name },
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

  console.log('Seeding finished.');

  // Seed FeeTiers
  console.log('Seeding fee tiers...');

  const feeTiers = [
    {
      name: 'Standard',
      minVolume: 0,
      maxVolume: 5000,
      purchaseFeePercentage: 0.05,
      purchaseFeeFixed: 30, // $0.30
      withdrawalFeePercentage: 0.05,
      withdrawalFeeFixed: 50, // 50 NGN
      bonusPercentage: 0,
      sortOrder: 0,
    },
    {
      name: 'Silver',
      minVolume: 5001,
      maxVolume: 20000,
      purchaseFeePercentage: 0.035,
      purchaseFeeFixed: 20, // $0.20
      withdrawalFeePercentage: 0.035,
      withdrawalFeeFixed: 40,
      bonusPercentage: 0.02,
      sortOrder: 1,
    },
    {
      name: 'Gold',
      minVolume: 20001,
      maxVolume: 50000,
      purchaseFeePercentage: 0.025,
      purchaseFeeFixed: 15, // $0.15
      withdrawalFeePercentage: 0.025,
      withdrawalFeeFixed: 30,
      bonusPercentage: 0.03,
      sortOrder: 2,
    },
    {
      name: 'Platinum',
      minVolume: 50001,
      maxVolume: null,
      purchaseFeePercentage: 0.015,
      purchaseFeeFixed: 10, // $0.10
      withdrawalFeePercentage: 0.015,
      withdrawalFeeFixed: 20,
      bonusPercentage: 0.05,
      sortOrder: 3,
    },
  ];

  for (const tier of feeTiers) {
    await prisma.feeTier.upsert({
      where: { name: tier.name },
      update: tier,
      create: tier,
    });
    console.log(
      `  - Fee Tier: ${tier.name} (${tier.purchaseFeePercentage * 100}% + ${tier.purchaseFeeFixed} cents base)`,
    );
  }

  // Add sponsor data to select categories
  console.log('Adding sponsor data to categories...');

  await prisma.category
    .update({
      where: { name: 'Programming' },
      data: {
        sponsorName: 'AltSchool Africa',
        sponsorLogo: 'https://altschoolafrica.com/favicon.ico',
        sponsorUrl: 'https://altschoolafrica.com',
      },
    })
    .catch(() =>
      console.log('  - Programming category not found, skipping sponsor'),
    );

  await prisma.category
    .update({
      where: { name: 'Business' },
      data: {
        sponsorName: 'Ingressive for Good',
        sponsorLogo: 'https://ingressive.org/favicon.ico',
        sponsorUrl: 'https://ingressive.org',
      },
    })
    .catch(() =>
      console.log('  - Business category not found, skipping sponsor'),
    );

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
