import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface JwtRequest extends Request {
  user?: { sub: string };
}

@Injectable()
export class HttpJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<JwtRequest>();
    const authorization = (
      request as unknown as { headers: { authorization?: string } }
    ).headers.authorization;
    const token = (authorization ?? '').replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      request.user = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.configService.get<string>('JWT_SECRET', ''),
      });
      return Boolean(request.user.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
