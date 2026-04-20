// src/patients/patients.module.ts
import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { MedicalFilesController } from './medical-files.controller';
import { MedicalFilesService } from './medical-files.service';
import { PatientConditionsController } from './conditions/patient-conditions.controller';
import { PatientConditionsService } from './conditions/patient-conditions.service';
import { PatientMedicationsController } from './medications/patient-medications.controller';
import { PatientMedicationsService } from './medications/patient-medications.service';
import { PatientAllergiesController } from './allergies/patient-allergies.controller';
import { PatientAllergiesService } from './allergies/patient-allergies.service';
import { RolesGuard } from '@auth/guards/roles.guard';

@Module({
  controllers: [
    PatientsController,
    MedicalFilesController,
    PatientConditionsController,
    PatientMedicationsController,
    PatientAllergiesController,
  ],
  providers: [
    PatientsService,
    MedicalFilesService,
    PatientConditionsService,
    PatientMedicationsService,
    PatientAllergiesService,
    RolesGuard,
  ],
  exports: [PatientsService],
})
export class PatientsModule {}
