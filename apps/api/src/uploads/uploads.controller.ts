import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ConfirmAvatarSchema,
  GetPresignedUrlSchema,
  type ConfirmAvatarDto,
  type GetPresignedUrlDto,
} from '@skillex/shared';
import { Request } from 'express';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ValibotValidationPipe } from '../common/pipes/valibot.pipe';
import { UsersService } from '../users/users.service';
import { R2Service } from './r2.service';

@Controller('uploads')
@UseGuards(BetterAuthGuard)
export class UploadsController {
  constructor(
    private readonly r2Service: R2Service,
    private readonly usersService: UsersService,
  ) {}

  @Get('presigned-url')
  @UsePipes(new ValibotValidationPipe(GetPresignedUrlSchema))
  async getPresignedUrl(
    @Req() req: Request & { user: { id: string } },
    @Query() query: GetPresignedUrlDto,
  ) {
    const { fileName, fileType, type = 'avatar' } = query;

    // Backend Control: Restrict file types and paths
    let key = '';
    if (type === 'avatar') {
      if (!fileType.startsWith('image/')) {
        throw new BadRequestException('Only images are allowed for avatars');
      }
      // Path strategy: avatars/userId-timestamp.extension
      const extension = fileName.split('.').pop();
      key = `avatars/${req.user.id}-${Date.now()}.${extension}`;
    } else {
      // Future document sharing
      key = `documents/${req.user.id}/${Date.now()}-${fileName}`;
    }

    const url = await this.r2Service.getPresignedUploadUrl(key, fileType);

    return {
      uploadUrl: url,
      key,
      publicUrl: this.r2Service.getPublicUrl(key),
    };
  }

  @Post('confirm-avatar')
  @UsePipes(new ValibotValidationPipe(ConfirmAvatarSchema))
  async confirmAvatar(
    @Req() req: Request & { user: { id: string } },
    @Body() body: ConfirmAvatarDto,
  ) {
    const { key } = body;
    const publicUrl = this.r2Service.getPublicUrl(key);

    // Update the user profile in the database
    await this.usersService.updateAvatar(publicUrl, req.headers);

    return {
      success: true,
      imageUrl: publicUrl,
    };
  }
}
