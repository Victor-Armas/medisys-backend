import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// Extendemos el tipo Request de Express para incluir `user`.
// NestJS lo agrega ahí después de que el JwtGuard valida el token,
// pero TypeScript no lo sabe a menos que se lo digamos explícitamente.
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: RequestWithUser) {
    return req.user;
  }
}
