import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { SkillType } from '../generated/prisma/client';
import { SkillsService } from './skills.service';

interface AuthRequest extends Request {
  user: {
    id: string;
  };
}

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('categories')
  getCategories() {
    return this.skillsService.findAllCategories();
  }

  @Get('search')
  searchSkills(@Query('q') query: string) {
    return this.skillsService.searchSkills(query || '');
  }

  @Get('my')
  @UseGuards(BetterAuthGuard)
  getMySkills(@Req() req: AuthRequest) {
    return this.skillsService.getUserSkills(req.user.id);
  }

  @Post('my')
  @UseGuards(BetterAuthGuard)
  addUserSkill(
    @Req() req: AuthRequest,
    @Body()
    data: { skillId: string; type: SkillType; experienceLevel?: string },
  ) {
    return this.skillsService.addUserSkill(req.user.id, data);
  }

  @Delete('my/:id')
  @UseGuards(BetterAuthGuard)
  removeUserSkill(@Req() req: AuthRequest, @Param('id') userSkillId: string) {
    return this.skillsService.removeUserSkill(req.user.id, userSkillId);
  }
}
