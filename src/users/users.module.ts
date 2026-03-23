import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  // providers: servicios que este módulo crea y administra
  providers: [UsersService],

  // exports: lo que este módulo comparte con otros módulos
  // Sin esto, AuthModule no podría usar UsersService
  exports: [UsersService],
})
export class UsersModule {}
