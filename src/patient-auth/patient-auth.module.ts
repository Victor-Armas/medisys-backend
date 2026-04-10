import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PatientAuthController } from './patient-auth.controller';
import { PatientAuthService } from './patient-auth.service';
import { PatientJwtStrategy } from './strategies/patient-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    // JwtModule sin secreto fijo — el service firma manualmente con JWT_PATIENT_SECRET
    // para evitar colisión con el JwtModule del AuthModule de staff
    JwtModule.register({}),
  ],
  controllers: [PatientAuthController],
  providers: [PatientAuthService, PatientJwtStrategy],
  exports: [PatientJwtStrategy],
})
export class PatientAuthModule {}
