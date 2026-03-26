import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { RolesGuard } from '@auth/guards/roles.guard';

// los guards se instancian directamente en providers.
@Module({
  controllers: [DoctorsController],
  providers: [DoctorsService, RolesGuard],
  // exports: [DoctorsService] — descomentar si otro módulo necesita DoctorsService
})
export class DoctorsModule {}
