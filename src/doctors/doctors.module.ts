import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { RolesGuard } from '@auth/guards/roles.guard';
import { ClinicsModule } from 'src/clinics/clinics.module';

// los guards se instancian directamente en providers.
@Module({
  imports: [ClinicsModule],
  controllers: [DoctorsController],
  providers: [DoctorsService, RolesGuard],
  // exports: [DoctorsService] — descomentar si otro módulo necesita DoctorsService
})
export class DoctorsModule {}
