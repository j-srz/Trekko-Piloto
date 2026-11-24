import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiProblemResponse } from '../common/decorators/api-problem-response.decorator.js';
import { Throttle } from '../common/guards/rate-limit.decorator.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import type { AuthenticatedUser } from './interfaces/authenticated-user.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import {
  AuthTokensResponseDto,
  UserProfileResponseDto,
} from './dto/auth-responses.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Public()
  @Throttle(5)
  @ApiOperation({ summary: 'Register a new Trekko account' })
  @ApiResponse({
    status: 201,
    description: 'Account created',
    type: AuthTokensResponseDto,
  })
  @ApiProblemResponse(400, 'Invalid registration data')
  @ApiProblemResponse(409, 'Email already registered')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('login')
  @Public()
  @Throttle(5)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and obtain access and refresh tokens' })
  @ApiResponse({
    status: 200,
    description: 'Signed in',
    type: AuthTokensResponseDto,
  })
  @ApiProblemResponse(400, 'Invalid login data')
  @ApiProblemResponse(401, 'Invalid credentials')
  @ApiProblemResponse(423, 'Account temporarily locked')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  login(@Body() body: LoginDto, @Req() request: Request, @Ip() ip: string) {
    return this.auth.login({
      ...body,
      dispositivo: request.get('user-agent')?.slice(0, 255),
      ip,
    });
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token and detect reuse' })
  @ApiResponse({
    status: 200,
    description: 'Tokens rotated',
    type: AuthTokensResponseDto,
  })
  @ApiProblemResponse(400, 'Invalid refresh token payload')
  @ApiProblemResponse(401, 'Invalid or reused refresh token')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  refresh(@Body() body: RefreshDto, @Req() request: Request, @Ip() ip: string) {
    return this.auth.refresh(
      body.refreshToken,
      request.get('user-agent')?.slice(0, 255),
      ip,
    );
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current refresh token or its family' })
  @ApiResponse({ status: 204, description: 'Session revoked' })
  @ApiProblemResponse(400, 'Invalid refresh token payload')
  @ApiProblemResponse(401, 'Invalid or expired session')
  @ApiProblemResponse(403, 'Insufficient permissions')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RefreshDto,
    @Query('all') all?: string,
  ): Promise<void> {
    return this.auth.logout(user.sub, body.refreshToken, all === 'true');
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user',
    type: UserProfileResponseDto,
  })
  @ApiProblemResponse(401, 'Authentication required')
  @ApiProblemResponse(403, 'Insufficient permissions')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.sub);
  }
}
