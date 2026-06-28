import { All, Controller, Req, Res } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // Better Auth toNodeHandler expects the standard Node request object.
    // Ensure the path is correctly passed if NestJS strips the prefix.
    return toNodeHandler(this.authService.auth)(req, res);
  }
}
