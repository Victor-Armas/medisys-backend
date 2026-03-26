import { Body, Controller, Post } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { RegisterPatientDTO } from './dto/register-patient.dto';

@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Post('register')
  // 💡 NOTA: No lleva @UseGuards(JwtAuthGuard) porque es PÚBLICO
  register(@Body() dto: RegisterPatientDTO) {
    return this.patientsService.register(dto);
  }
}
