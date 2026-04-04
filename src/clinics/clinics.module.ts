import { Module } from '@nestjs/common';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { RolesGuard } from '@auth/guards/roles.guard';

@Module({
  controllers: [ClinicsController],
  providers: [ClinicsService, RolesGuard],
  exports: [ClinicsService],
})
export class ClinicsModule {}
