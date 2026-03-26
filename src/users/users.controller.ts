import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '@auth/decorators/roles.decorator';
import { CreateUserDTO } from './dto/create-user.dto';

@Controller('users')
// Ambos guards se aplican a todos los endpoints de este controller
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('ADMIN_SYSTEM', 'MAIN_DOCTOR')
  create(@Body() dto: CreateUserDTO) {
    // El controller solo delega — la lógica vive en el service
    return this.usersService.create(dto);
  }
}
