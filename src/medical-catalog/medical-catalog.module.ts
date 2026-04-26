import { Module } from '@nestjs/common';
import { MedicalCatalogController } from './medical-catalog.controller';
import { Icd10Service } from './icd10.service';
import { MedicationsService } from './medications.service';
import { MedicalSuggestionsService } from './medical-suggestions.service';
import { MedicalSuggestionsController } from './medical-suggestions.controller';

@Module({
  controllers: [MedicalCatalogController, MedicalSuggestionsController],
  providers: [Icd10Service, MedicationsService, MedicalSuggestionsService],
  // Export services so PatientsModule can use catalog search if needed
  exports: [Icd10Service, MedicationsService, MedicalSuggestionsService],
})
export class MedicalCatalogModule {}
