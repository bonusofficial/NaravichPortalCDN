import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AdminAuthenticatedRequest } from '../../common/interfaces/authenticated-request';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MfaCodeDto } from './dto/mfa-code.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AdminAuthenticatedRequest) {
    return this.authService.me(request.user.sub);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() request: AdminAuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(request.user.sub, dto);
  }

  @Post('mfa/setup')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  setupMfa(@Req() request: AdminAuthenticatedRequest) {
    return this.authService.startMfa(request.user.sub);
  }

  @Post('mfa/enable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  enableMfa(
    @Req() request: AdminAuthenticatedRequest,
    @Body() dto: MfaCodeDto,
  ) {
    return this.authService.enableMfa(request.user.sub, dto.code);
  }

  @Post('mfa/disable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  disableMfa(
    @Req() request: AdminAuthenticatedRequest,
    @Body() dto: MfaCodeDto,
  ) {
    return this.authService.disableMfa(request.user.sub, dto.code);
  }
}
