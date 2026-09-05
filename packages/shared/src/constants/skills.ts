export interface SeedCategory {
  key: string;
  name: string;
  skills: string[];
  sponsor?: {
    name: string;
    url: string;
    logo?: string;
  };
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    key: "Programming",
    name: "Programming",
    skills: [
      "JavaScript",
      "TypeScript",
      "Python",
      "React",
      "Node.js",
      "NestJS",
      "Next.js",
      "Prisma",
    ],
    sponsor: {
      name: "AltSchool Africa",
      url: "https://altschoolafrica.com",
      logo: "https://altschoolafrica.com/favicon.ico",
    },
  },
  {
    key: "Design",
    name: "Design",
    skills: [
      "UI Design",
      "UX Design",
      "Figma",
      "Adobe XD",
      "Graphic Design",
      "Logo Design",
    ],
  },
  {
    key: "Marketing",
    name: "Marketing",
    skills: [
      "SEO",
      "Content Marketing",
      "Social Media",
      "Email Marketing",
      "Digital Strategy",
    ],
  },
  {
    key: "Business",
    name: "Business",
    skills: [
      "Project Management",
      "Agile",
      "Business Analysis",
      "Public Speaking",
      "Leadership",
    ],
    sponsor: {
      name: "Ingressive for Good",
      url: "https://ingressive.org",
      logo: "https://ingressive.org/favicon.ico",
    },
  },
  {
    key: "Languages",
    name: "Languages",
    skills: ["English", "Spanish", "French", "German", "Chinese", "Japanese"],
  },
  {
    key: "Lifestyle",
    name: "Lifestyle",
    skills: ["Cooking", "Yoga", "Fitness", "Music Production", "Photography"],
  },
];

export const SEED_SKILLS: string[] = SEED_CATEGORIES.flatMap((c) => c.skills);

/**
 * Rounds down to the nearest ten strictly lower than or equal to count,
 * designed for "+" display.
 * e.g., if 31..39 -> 30 (for "30+"), if 30 -> 20 (for "20+").
 */
export function getTensFloorCount(count: number): number {
  if (count <= 10) return count;
  return Math.floor((count - 1) / 10) * 10;
}

export const PLATFORM_STATS = {
  categoryCount: SEED_CATEGORIES.length,
  skillCount: SEED_SKILLS.length,
  skillDisplayCount: getTensFloorCount(SEED_SKILLS.length),
  languageCount: 4,
} as const;
