import { Body, Controller, Get, HttpCode, Patch, Post, UseGuards, Inject } from '@nestjs/common';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { loginDto, registerInviteDto, updateProfileDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown) {
    const parsed = loginDto.parse(body);
    return this.auth.login(parsed.email, parsed.password);
  }

  @Post('register-invite')
  @HttpCode(201)
  async registerInvite(@Body() body: unknown) {
    const parsed = registerInviteDto.parse(body);
    return this.auth.registerWithInvite(parsed.token, {
      name: parsed.name,
      password: parsed.password,
      country: parsed.country,
      university: parsed.university,
      avatarUrl: parsed.avatarUrl,
      department: parsed.department,
      instagram: parsed.instagram,
      linkedin: parsed.linkedin,
      telegram: parsed.telegram,
      leetcode: parsed.leetcode,
      codeforces: parsed.codeforces,
      studentId: parsed.studentId,
      bio: parsed.bio,
    });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentPrincipal() principal: Principal) {
    return this.auth.me(principal.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateMe(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = updateProfileDto.parse(body);
    return this.auth.updateProfile(principal.id, parsed);
  }
}
