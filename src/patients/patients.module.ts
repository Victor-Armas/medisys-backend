import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { MedicalFilesController } from './medical-files.controller';
import { MedicalFilesService } from './medical-files.service';
import { RolesGuard } from '@auth/guards/roles.guard';

@Module({
  controllers: [PatientsController, MedicalFilesController],
  providers: [PatientsService, MedicalFilesService, RolesGuard],
  exports: [PatientsService],
})
export class PatientsModule {}
