import { Module } from '@nestjs/common';
import { MedicalCatalogController } from './medical-catalog.controller';
import { Icd10Service } from './icd10.service';
import { MedicationsService } from './medications.service';

@Module({
  controllers: [MedicalCatalogController],
  providers: [Icd10Service, MedicationsService],
  // Export services so PatientsModule can use catalog search if needed
  exports: [Icd10Service, MedicationsService],
})
export class MedicalCatalogModule {}
