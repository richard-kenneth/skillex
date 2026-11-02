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
import { Throttle } from '@nestjs/throttler';
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
import {
  buildAvatarKey,
  buildDocumentKey,
  getAttachmentExtension,
  getAvatarExtension,
  isOwnedAvatarKey,
} from './upload-policy';

@Controller('uploads')
@UseGuards(BetterAuthGuard)
export class UploadsController {
  constructor(
    private readonly r2Service: R2Service,
    private readonly usersService: UsersService,
  ) {}

  @Get('presigned-url')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UsePipes(new ValibotValidationPipe(GetPresignedUrlSchema))
  async getPresignedUrl(
    @Req() req: Request & { user: { id: string } },
    @Query() query: GetPresignedUrlDto,
  ) {
    const { fileType, type = 'avatar' } = query;

    // Backend Control: Restrict file types and paths. The extension is derived
    // from the MIME type, never from a client-supplied file name.
    let key = '';
    if (type === 'avatar') {
      if (!getAvatarExtension(fileType)) {
        throw new BadRequestException(
          'Avatars must be JPEG, PNG, WebP, GIF, or AVIF images',
        );
      }
      key = buildAvatarKey(req.user.id, fileType);
    } else {
      if (!getAttachmentExtension(fileType)) {
        throw new BadRequestException('Unsupported document type');
      }
      key = buildDocumentKey(req.user.id, fileType);
    }

    const url = await this.r2Service.getPresignedUploadUrl(key, fileType);

    return {
      uploadUrl: url,
      key,
      publicUrl: this.r2Service.getPublicUrl(key),
    };
  }

  @Post('confirm-avatar')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(new ValibotValidationPipe(ConfirmAvatarSchema))
  async confirmAvatar(
    @Req() req: Request & { user: { id: string } },
    @Body() body: ConfirmAvatarDto,
  ) {
    const { key } = body;

    if (!isOwnedAvatarKey(req.user.id, key)) {
      throw new BadRequestException('Invalid avatar key');
    }

    const publicUrl = this.r2Service.getPublicUrl(key);

    // Update the user profile in the database
    await this.usersService.updateAvatar(publicUrl, req.headers);

    return {
      success: true,
      imageUrl: publicUrl,
    };
  }
}
