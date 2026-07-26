export type AddSkillDto = {
      skillId: string;
      type: "OFFERING" | "SEEKING";
      experienceLevel?: string;
    }