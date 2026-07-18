import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { type UpdateProfileDto, UpdateProfileSchema } from '@skil-ex2/shared';
import { Request } from 'express';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(BetterAuthGuard) // Protect all user routes
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req: Request & { user: { id: string } }) {
    // BetterAuthGuard attaches the user to the request
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Patch('profile')
  @UsePipes(new ValibotValidationPipe(UpdateProfileSchema))
  updateProfile(
    @Req() req: Request & { user: { id: string } },
    @Body() data: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.id, data);
  }
}
