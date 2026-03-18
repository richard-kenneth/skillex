import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SkillType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  async findAllCategories() {
    return this.prisma.category.findMany({
      include: {
        _count: {
          select: { skills: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async searchSkills(query: string) {
    return this.prisma.skill.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        category: true,
      },
      take: 10,
    });
  }

  async getUserSkills(userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async addUserSkill(
    userId: string,
    data: { skillId: string; type: SkillType; experienceLevel?: string },
  ) {
    // Check if user already has this skill with this type
    const existing = await this.prisma.userSkill.findUnique({
      where: {
        userId_skillId_type: {
          userId,
          skillId: data.skillId,
          type: data.type,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'User already has this skill listed as ' + data.type,
      );
    }

    return this.prisma.userSkill.create({
      data: {
        userId,
        skillId: data.skillId,
        type: data.type,
        experienceLevel: data.experienceLevel,
      },
      include: {
        skill: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async removeUserSkill(userId: string, userSkillId: string) {
    const userSkill = await this.prisma.userSkill.findUnique({
      where: { id: userSkillId },
    });

    if (!userSkill || userSkill.userId !== userId) {
      throw new NotFoundException('Skill not found for this user');
    }

    return this.prisma.userSkill.delete({
      where: { id: userSkillId },
    });
  }

  async findOrCreateSkill(name: string, categoryId?: string) {
    const normalizedName = name.trim();

    let skill = await this.prisma.skill.findUnique({
      where: { name: normalizedName },
    });

    if (!skill) {
      skill = await this.prisma.skill.create({
        data: {
          name: normalizedName,
          categoryId,
        },
      });
    }

    return skill;
  }
}
