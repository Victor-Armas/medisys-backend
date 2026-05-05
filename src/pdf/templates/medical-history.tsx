import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

export interface MedicalHistoryPDFProps {
  // Paciente
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientCurp?: string | null;
  patientBloodType?: string | null;
  patientPhone?: string | null;
  patientBirthDate: string;
  // Clínica
  clinicName: string;
  clinicLogoUrl?: string | null;
  generatedAt: string;
  // Alergias
  allergies: { substance: string; severity: string }[];
  // Condiciones
  diseases: { icd10Code?: string | null; description: string }[];
  surgeries: { description: string }[];
  trauma: { description: string }[];
  hospitalizations: { description: string }[];
  familyHistory: {
    familyMember: string;
    description: string;
    icd10Code?: string | null;
  }[];
  // Medicamentos
  medications: {
    name: string;
    dose?: string | null;
    frequency?: string | null;
  }[];
  // Hábitos
  smoking: string;
  alcoholUse: string;
  drugUse: string;
  bloodTransfusions: boolean;
  pets: boolean;
  tattoos: boolean;
  woodSmokeExposure: boolean;
  immunizations?: string | null;
  physicalActivity?: string | null;
  // Ginecológico (opcional)
  gynecological?: {
    menarche?: number | null;
    menstrualCycle?: string | null;
    gestations?: number | null;
    deliveries?: number | null;
    caesareans?: number | null;
    abortions?: number | null;
    contraceptiveMethod?: string | null;
    menopause?: boolean | null;
  } | null;
}

const C = {
  purple: '#7405a6',
  purpleLight: '#f5eaff',
  gray: '#596064',
  grayLight: '#f1f4f7',
  dark: '#2b3438',
  white: '#ffffff',
  red: '#dc2626',
  redLight: '#fee2e2',
};

const HABIT_ES: Record<string, string> = {
  NEVER: 'Nunca',
  FORMER: 'Anteriormente',
  CURRENT: 'Activo',
  UNKNOWN: 'Desconocido',
};

const FAMILY_ES: Record<string, string> = {
  FATHER: 'Padre',
  MOTHER: 'Madre',
  SIBLINGS: 'Hermanos',
  CHILDREN: 'Hijos',
  OTHER: 'Otro',
};

const BLOOD_TYPE_ES: Record<string, string> = {
  O_POSITIVE: 'O Positivo',
  O_NEGATIVE: 'O Negativo',
  A_POSITIVE: 'A Positivo',
  A_NEGATIVE: 'A Negativo',
  B_POSITIVE: 'B Positivo',
  B_NEGATIVE: 'B Negativo',
  AB_POSITIVE: 'AB Positivo',
  AB_NEGATIVE: 'AB Negativo',
  UNKNOWN: 'Desconocido',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.dark,
    paddingHorizontal: 36,
    paddingVertical: 28,
    backgroundColor: C.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.purple,
  },
  logo: { width: 44, height: 44, objectFit: 'contain' },
  logoPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: C.purple,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: C.white,
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  clinicName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.purple },
  clinicSub: { fontSize: 8, color: C.gray, marginTop: 2 },
  folioBar: {
    backgroundColor: C.purpleLight,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  folioText: { fontSize: 8, color: C.purple, fontFamily: 'Helvetica-Bold' },
  patientBanner: {
    backgroundColor: C.grayLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  patientField: { flex: 1, minWidth: '20%' },
  patientLabel: {
    fontSize: 7,
    color: C.gray,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  patientValue: {
    fontSize: 9,
    color: C.dark,
    marginTop: 2,
    fontFamily: 'Helvetica-Bold',
  },
  allergyBanner: {
    backgroundColor: C.redLight,
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  allergyTitle: {
    fontSize: 8,
    color: C.red,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  allergyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  allergyChip: {
    backgroundColor: C.red,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  allergyChipText: {
    fontSize: 7.5,
    color: C.white,
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
    marginTop: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.purple,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableHeaderText: {
    color: C.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableCell: { fontSize: 8, color: C.dark },
  tableCellBold: { fontSize: 8, color: C.dark, fontFamily: 'Helvetica-Bold' },
  habitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  habitBox: {
    width: '22%',
    backgroundColor: C.grayLight,
    borderRadius: 6,
    padding: 6,
  },
  habitLabel: {
    fontSize: 7,
    color: C.gray,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  habitValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginTop: 2,
  },
  footer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: C.gray, textAlign: 'center' },
});

export function MedicalHistoryTemplate(p: MedicalHistoryPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* HEADER */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {p.clinicLogoUrl ? (
              <Image src={p.clinicLogoUrl} style={s.logo} />
            ) : (
              <View style={s.logoPlaceholder}>
                <Text style={s.logoPlaceholderText}>{p.clinicName[0]}</Text>
              </View>
            )}
            <View style={{ marginLeft: 10 }}>
              <Text style={s.clinicName}>{p.clinicName}</Text>
              <Text style={s.clinicSub}>
                EXPEDIENTE CLÍNICO · NOM-004-SSA3-2012
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: C.gray }}>
              Generado: {p.generatedAt}
            </Text>
          </View>
        </View>

        {/* FOLIO BAR */}
        <View style={s.folioBar}>
          <Text style={s.folioText}>HISTORIAL MÉDICO COMPLETO</Text>
          <Text style={s.folioText}>Fecha: {p.generatedAt}</Text>
        </View>

        {/* PACIENTE */}
        <View style={s.patientBanner}>
          {[
            { label: 'Nombre', value: p.patientName },
            { label: 'Edad', value: `${p.patientAge} años` },
            {
              label: 'Género',
              value:
                p.patientGender === 'FEMALE'
                  ? 'Femenino'
                  : p.patientGender === 'MALE'
                    ? 'Masculino'
                    : 'Otro',
            },
            ...(p.patientCurp ? [{ label: 'CURP', value: p.patientCurp }] : []),
            ...(p.patientBloodType
              ? [
                  {
                    label: 'Tipo sanguíneo',
                    value:
                      BLOOD_TYPE_ES[p.patientBloodType] ?? p.patientBloodType,
                  },
                ]
              : []),
            ...(p.patientPhone
              ? [{ label: 'Teléfono', value: p.patientPhone }]
              : []),
          ].map(({ label, value }) => (
            <View key={label} style={s.patientField}>
              <Text style={s.patientLabel}>{label}</Text>
              <Text style={s.patientValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ALERGIAS */}
        {p.allergies.length > 0 ? (
          <View style={s.allergyBanner}>
            <Text style={s.allergyTitle}>⚠ ALERGIAS CONOCIDAS</Text>
            <View style={s.allergyChips}>
              {p.allergies.map((a, i) => (
                <View key={i} style={s.allergyChip}>
                  <Text style={s.allergyChipText}>
                    {a.substance} ({a.severity})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={s.tableRow}>
            <Text style={s.tableCell}>Sin Alergias Registradas</Text>
          </View>
        )}

        {/* CONDICIONES */}
        <View style={s.row}>
          <View style={s.col}>
            {/* Enfermedades */}
            {p.diseases.length > 0 ? (
              <>
                <Text style={s.sectionTitle}>Enfermedades previas</Text>
                {p.diseases.map((d, i) => (
                  <View
                    key={i}
                    style={[
                      s.tableRow,
                      { backgroundColor: i % 2 === 0 ? C.grayLight : C.white },
                    ]}
                  >
                    {d.icd10Code && (
                      <Text
                        style={[
                          s.tableCell,
                          {
                            width: '15%',
                            color: C.purple,
                            fontFamily: 'Helvetica-Bold',
                          },
                        ]}
                      >
                        {d.icd10Code}
                      </Text>
                    )}
                    <Text style={[s.tableCell, { flex: 1 }]}>
                      {d.description}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.tableRow}>
                <Text style={s.tableCell}>Sin Enfermedades Registradas</Text>
              </View>
            )}
            {/* Cirugías */}
            {p.surgeries.length > 0 ? (
              <>
                <Text style={s.sectionTitle}>Cirugías</Text>
                {p.surgeries.map((d, i) => (
                  <View
                    key={i}
                    style={[
                      s.tableRow,
                      { backgroundColor: i % 2 === 0 ? C.grayLight : C.white },
                    ]}
                  >
                    <Text style={s.tableCell}>{d.description}</Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.tableRow}>
                <Text style={s.tableCell}>Sin Cirugías Registradas</Text>
              </View>
            )}
          </View>
          <View style={s.col}>
            {/* Medicamentos */}
            {p.medications.length > 0 ? (
              <>
                <Text style={s.sectionTitle}>Medicamentos actuales</Text>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHeaderText, { flex: 2 }]}>
                    Medicamento
                  </Text>
                  <Text style={[s.tableHeaderText, { flex: 1 }]}>Dosis</Text>
                  <Text style={[s.tableHeaderText, { flex: 1 }]}>
                    Frecuencia
                  </Text>
                </View>
                {p.medications.map((m, i) => (
                  <View
                    key={i}
                    style={[
                      s.tableRow,
                      { backgroundColor: i % 2 === 0 ? C.grayLight : C.white },
                    ]}
                  >
                    <Text style={[s.tableCellBold, { flex: 2 }]}>{m.name}</Text>
                    <Text style={[s.tableCell, { flex: 1 }]}>
                      {m.dose ?? '—'}
                    </Text>
                    <Text style={[s.tableCell, { flex: 1 }]}>
                      {m.frequency ?? '—'}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.tableRow}>
                <Text style={s.tableCell}>Sin Medicamentos Registrados</Text>
              </View>
            )}
            {/* Antecedentes heredofamiliares */}
            {p.familyHistory.length > 0 ? (
              <>
                <Text style={s.sectionTitle}>
                  Antecedentes heredofamiliares
                </Text>
                {p.familyHistory.map((f, i) => (
                  <View
                    key={i}
                    style={[
                      s.tableRow,
                      { backgroundColor: i % 2 === 0 ? C.grayLight : C.white },
                    ]}
                  >
                    <Text style={[s.tableCellBold, { width: '22%' }]}>
                      {FAMILY_ES[f.familyMember] ?? f.familyMember}
                    </Text>
                    <Text style={[s.tableCell, { flex: 1 }]}>
                      {f.description}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={s.tableRow}>
                <Text style={s.tableCell}>
                  Sin Antecedentes Heredofamiliares Registrados
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* TRAUMA / HOSPITALIZACIONES */}
        {p.trauma.length > 0 || p.hospitalizations.length > 0 ? (
          <View style={s.row}>
            {p.trauma.length > 0 && (
              <View style={s.col}>
                <Text style={s.sectionTitle}>Traumatismos</Text>
                {p.trauma.map((d, i) => (
                  <View
                    key={i}
                    style={[
                      s.tableRow,
                      { backgroundColor: i % 2 === 0 ? C.grayLight : C.white },
                    ]}
                  >
                    <Text style={s.tableCell}>{d.description}</Text>
                  </View>
                ))}
              </View>
            )}
            {p.hospitalizations.length > 0 && (
              <View style={s.col}>
                <Text style={s.sectionTitle}>Hospitalizaciones</Text>
                {p.hospitalizations.map((d, i) => (
                  <View
                    key={i}
                    style={[
                      s.tableRow,
                      { backgroundColor: i % 2 === 0 ? C.grayLight : C.white },
                    ]}
                  >
                    <Text style={s.tableCell}>{d.description}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={s.tableRow}>
            <Text style={s.tableCell}>Sin Registro</Text>
          </View>
        )}

        {/* HÁBITOS */}
        <Text style={s.sectionTitle}>Antecedentes no patológicos</Text>
        <View style={s.habitsGrid}>
          {[
            { label: 'Tabaquismo', value: HABIT_ES[p.smoking] ?? p.smoking },
            {
              label: 'Alcoholismo',
              value: HABIT_ES[p.alcoholUse] ?? p.alcoholUse,
            },
            { label: 'Toxicomanías', value: HABIT_ES[p.drugUse] ?? p.drugUse },
            {
              label: 'Transfusiones',
              value: p.bloodTransfusions ? 'Sí' : 'No',
            },
            { label: 'Mascotas', value: p.pets ? 'Sí' : 'No' },
            { label: 'Tatuajes', value: p.tattoos ? 'Sí' : 'No' },
            { label: 'Humo leña', value: p.woodSmokeExposure ? 'Sí' : 'No' },
            { label: 'Act. física', value: p.physicalActivity || '—' },
          ].map(({ label, value }) => (
            <View key={label} style={s.habitBox}>
              <Text style={s.habitLabel}>{label}</Text>
              <Text style={s.habitValue}>{value}</Text>
            </View>
          ))}
        </View>
        {p.immunizations && (
          <View
            style={{
              backgroundColor: C.grayLight,
              borderRadius: 6,
              padding: 8,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontSize: 7,
                color: C.gray,
                fontFamily: 'Helvetica-Bold',
                marginBottom: 2,
              }}
            >
              INMUNIZACIONES
            </Text>
            <Text style={{ fontSize: 8, color: C.dark }}>
              {p.immunizations}
            </Text>
          </View>
        )}

        {/* GINECOLÓGICO */}
        {p.gynecological && (
          <>
            <Text style={s.sectionTitle}>Antecedentes gineco-obstétricos</Text>
            <View style={s.habitsGrid}>
              {[
                {
                  label: 'Menarca',
                  value:
                    p.gynecological.menarche != null
                      ? `${p.gynecological.menarche} años`
                      : '—',
                },
                {
                  label: 'Ciclo',
                  value: p.gynecological.menstrualCycle || '—',
                },
                {
                  label: 'Gestas',
                  value:
                    p.gynecological.gestations != null
                      ? String(p.gynecological.gestations)
                      : '—',
                },
                {
                  label: 'Partos',
                  value:
                    p.gynecological.deliveries != null
                      ? String(p.gynecological.deliveries)
                      : '—',
                },
                {
                  label: 'Cesáreas',
                  value:
                    p.gynecological.caesareans != null
                      ? String(p.gynecological.caesareans)
                      : '—',
                },
                {
                  label: 'Abortos',
                  value:
                    p.gynecological.abortions != null
                      ? String(p.gynecological.abortions)
                      : '—',
                },
                {
                  label: 'Anticonceptivo',
                  value: p.gynecological.contraceptiveMethod || '—',
                },
                {
                  label: 'Menopausia',
                  value: p.gynecological.menopause ? 'Sí' : 'No',
                },
              ].map(({ label, value }) => (
                <View key={label} style={s.habitBox}>
                  <Text style={s.habitLabel}>{label}</Text>
                  <Text style={s.habitValue}>{value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* FOOTER */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Documento generado por MediSys · NOM-004-SSA3-2012 · Uso exclusivo
            médico
          </Text>
        </View>
      </Page>
    </Document>
  );
}
