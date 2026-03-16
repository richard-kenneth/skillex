import { Controller, Get, UseGuards, Req, Put, Body } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';

@Controller('users')
@UseGuards(BetterAuthGuard) // Protect all user routes
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req: Request & { user: { id: string } }) {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('bio')
  updateBio(
    @Req() req: Request & { user: { id: string } },
    @Body('bio') bio: string,
  ) {
    return this.usersService.updateBio(req.user.id, bio);
  }
}
