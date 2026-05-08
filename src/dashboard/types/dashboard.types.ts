export interface AppointmentKpis {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
}

export interface ConsultationKpis {
  totalConsultations: number;
}

export interface DashboardKpis extends AppointmentKpis, ConsultationKpis {
  newPatients: number;
  completionRate: number;
}

export interface AppointmentByDay {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface TypeCount {
  type: string;
  count: number;
}

export interface DoctorPerformanceStat {
  name: string;
  total: number;
  completed: number;
  cancelled: number;
}

export interface TopDiagnosisStat {
  description: string;
  icd10Code: string | null;
  count: number;
}

export interface GenderCount {
  gender: string;
  count: number;
}

export interface DashboardStats {
  period: { from: string; to: string };
  kpis: DashboardKpis;
  appointmentsByDay: AppointmentByDay[];
  appointmentsByStatus: StatusCount[];
  appointmentsByType: TypeCount[];
  consultationsByType: TypeCount[];
  topDiagnoses: TopDiagnosisStat[];
  doctorPerformance: DoctorPerformanceStat[];
  patientsByGender: GenderCount[];
}
