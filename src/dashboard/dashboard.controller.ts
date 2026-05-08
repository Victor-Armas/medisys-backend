import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { RequestWithUser } from '@auth/auth.controller';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

const ALL_STAFF = [
  'ADMIN_SYSTEM',
  'MAIN_DOCTOR',
  'DOCTOR',
  'RECEPTIONIST',
] as const;

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(...ALL_STAFF)
  getStats(@Query() dto: DashboardQueryDto, @Req() req: RequestWithUser) {
    return this.dashboardService.getStats(dto, req.user.id, req.user.role);
  }
}
