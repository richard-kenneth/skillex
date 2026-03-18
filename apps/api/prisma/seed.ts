import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL as string,
  }),
});

async function main() {
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
