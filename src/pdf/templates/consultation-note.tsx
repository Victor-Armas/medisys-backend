import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConsultationNoteTemplateProps {
  // Clinic
  clinicName: string;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
  clinicLogoUrl?: string | null;
  // Doctor
  doctorName: string;
  doctorLicense: string;
  doctorSpecialty?: string | null;
  doctorSignatureUrl?: string | null;
  includeSignature: boolean;
  // Patient
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientCurp?: string | null;
  patientBloodType?: string | null;
  patientAllergies?: string[];
  // Consultation
  folioNumber: string;
  consultedAt: string;
  consultationType: string;
  // Clinical sections
  reasonForVisit: string;
  currentCondition: string;
  physicalExamFindings?: string | null;
  labResultsSummary?: string | null;
  clinicalImpressions?: string | null;
  treatmentPlan?: string | null;
  patientInstructions?: string | null;
  prognosis?: string | null;
  requiresFollowUp: boolean;
  followUpDays?: number | null;
  // Vital signs
  vitalSigns?: {
    bloodPressure?: string | null;
    heartRateBpm?: number | null;
    respiratoryRate?: number | null;
    temperatureC?: number | null;
    oxygenSaturation?: number | null;
    weightKg?: number | null;
    heightCm?: number | null;
    bmi?: number | null;
  } | null;
  // Diagnoses
  diagnoses: Array<{
    icd10Code?: string | null;
    description: string;
    diagnosisType: string;
    isMain: boolean;
  }>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const C = {
  purple: '#7405a6',
  purpleLight: '#f5eaff',
  gray: '#596064',
  grayLight: '#f1f4f7',
  dark: '#2b3438',
  white: '#ffffff',
  border: '#e2e8f0',
};

const TYPE_LABELS: Record<string, string> = {
  FIRST_VISIT: 'Primera vez',
  FOLLOW_UP: 'Seguimiento',
  URGENT: 'Urgencia',
  ROUTINE: 'Revisión rutina',
  PROCEDURE: 'Procedimiento',
};

const DIAG_LABELS: Record<string, string> = {
  DEFINITIVE: 'Definitivo',
  PRESUMPTIVE: 'Presuntivo',
  ASSOCIATED: 'Asociado',
  COMPLICATION: 'Complicación',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.dark,
    paddingHorizontal: 36,
    paddingVertical: 32,
    backgroundColor: C.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.purple,
  },
  logo: { width: 48, height: 48, objectFit: 'contain' },
  logoPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: C.purple,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: C.white,
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
  clinicName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.purple },
  clinicSub: { fontSize: 8, color: C.gray, marginTop: 2 },
  doctorBlock: { alignItems: 'flex-end' },
  doctorName: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  doctorSub: { fontSize: 8, color: C.gray, marginTop: 1 },
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
  // Patient banner
  patientBanner: {
    backgroundColor: C.grayLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  patientField: { flex: 1 },
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
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  allergyText: { fontSize: 8, color: '#dc2626', fontFamily: 'Helvetica-Bold' },
  // Vitals grid
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  vitalBox: {
    width: '13%',
    backgroundColor: C.grayLight,
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
  },
  vitalLabel: {
    fontSize: 7,
    color: C.gray,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  vitalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
    marginTop: 2,
  },
  vitalUnit: { fontSize: 6.5, color: C.gray },
  // Sections
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
    marginTop: 12,
  },
  textBox: {
    backgroundColor: C.grayLight,
    borderRadius: 6,
    padding: 8,
    marginBottom: 2,
  },
  textContent: { fontSize: 8.5, lineHeight: 1.5, color: C.dark },
  grid2: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  // Diagnoses
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 7,
    borderRadius: 6,
    marginBottom: 3,
  },
  diagMain: { backgroundColor: C.purpleLight },
  diagAlt: { backgroundColor: C.grayLight },
  diagCode: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.purple,
    marginRight: 5,
  },
  diagDesc: { fontSize: 8.5, color: C.dark, flex: 1 },
  diagBadge: { fontSize: 7, color: C.purple, fontFamily: 'Helvetica-Bold' },
  // Follow-up
  followUpBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  followUpText: {
    fontSize: 8.5,
    color: '#92400e',
    fontFamily: 'Helvetica-Bold',
  },
  // Footer
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureBlock: { alignItems: 'center', width: 140 },
  signatureImage: {
    width: 110,
    height: 50,
    objectFit: 'contain',
    marginBottom: 4,
  },
  signatureLine: {
    width: 120,
    borderTopWidth: 1,
    borderTopColor: C.dark,
    paddingTop: 3,
  },
  signatureText: { fontSize: 7.5, color: C.gray, textAlign: 'center' },
  nomText: { fontSize: 7, color: C.gray },
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

// ── Template ──────────────────────────────────────────────────────────────────

export function ConsultationNoteTemplate(p: ConsultationNoteTemplateProps) {
  const vitals = p.vitalSigns;
  const vitalItems = vitals
    ? [
        { label: 'T.A.', value: vitals.bloodPressure, unit: 'mmHg' },
        { label: 'FC', value: vitals.heartRateBpm, unit: 'lpm' },
        { label: 'FR', value: vitals.respiratoryRate, unit: 'rpm' },
        { label: 'Temp.', value: vitals.temperatureC, unit: '°C' },
        { label: 'SpO₂', value: vitals.oxygenSaturation, unit: '%' },
        { label: 'Peso', value: vitals.weightKg, unit: 'kg' },
        { label: 'Talla', value: vitals.heightCm, unit: 'cm' },
        { label: 'IMC', value: vitals.bmi, unit: 'kg/m²' },
      ].filter((v) => v.value != null)
    : [];

  const sections = [
    {
      label: 'Motivo de Consulta y Padecimiento Actual',
      value: p.reasonForVisit,
    },
    { label: 'Evolución / Padecimiento Actual', value: p.currentCondition },
    { label: 'Exploración Física', value: p.physicalExamFindings },
    { label: 'Estudios de Laboratorio e Imagen', value: p.labResultsSummary },
    { label: 'Impresión Clínica', value: p.clinicalImpressions },
    { label: 'Plan de Tratamiento', value: p.treatmentPlan },
    { label: 'Indicaciones al Paciente', value: p.patientInstructions },
    { label: 'Pronóstico', value: p.prognosis },
  ].filter((s) => s.value?.trim());

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
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={s.clinicName}>{p.clinicName}</Text>
              {p.clinicAddress && (
                <Text style={s.clinicSub}>{p.clinicAddress}</Text>
              )}
              {p.clinicPhone && (
                <Text style={s.clinicSub}>Tel: {p.clinicPhone}</Text>
              )}
              <Text style={s.clinicSub}>
                NOTA DE EVOLUCIÓN — NOM-004-SSA3-2012
              </Text>
            </View>
          </View>
          <View style={s.doctorBlock}>
            <Text style={s.doctorName}>{p.doctorName}</Text>
            <Text style={s.doctorSub}>Cédula: {p.doctorLicense}</Text>
            {p.doctorSpecialty && (
              <Text style={s.doctorSub}>{p.doctorSpecialty}</Text>
            )}
          </View>
        </View>

        {/* FOLIO BAR */}
        <View style={s.folioBar}>
          <Text style={s.folioText}>
            CONSULTA: {p.folioNumber} ·{' '}
            {TYPE_LABELS[p.consultationType] ?? p.consultationType}
          </Text>
          <Text style={s.folioText}>
            {fmt(p.consultedAt)} · {time(p.consultedAt)}
          </Text>
        </View>

        {/* PATIENT */}
        <View style={s.patientBanner}>
          {[
            { label: 'Paciente', value: p.patientName },
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
              ? [{ label: 'Grupo', value: p.patientBloodType }]
              : []),
          ].map(({ label, value }) => (
            <View key={label} style={s.patientField}>
              <Text style={s.patientLabel}>{label}</Text>
              <Text style={s.patientValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* ALLERGY ALERT */}
        {p.patientAllergies && p.patientAllergies.length > 0 && (
          <View style={s.allergyBanner}>
            <Text style={s.allergyText}>
              ⚠ ALERGIAS: {p.patientAllergies.join(' · ')}
            </Text>
          </View>
        )}

        {/* VITALS */}
        {vitalItems.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Signos Vitales</Text>
            <View style={s.vitalsGrid}>
              {vitalItems.map(({ label, value, unit }) => (
                <View key={label} style={s.vitalBox}>
                  <Text style={s.vitalLabel}>{label}</Text>
                  <Text style={s.vitalValue}>{String(value)}</Text>
                  <Text style={s.vitalUnit}>{unit}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* DIAGNOSES */}
        {p.diagnoses.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Diagnósticos</Text>
            {p.diagnoses.map((d, idx) => (
              <View
                key={idx}
                style={[s.diagRow, d.isMain ? s.diagMain : s.diagAlt]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    flex: 1,
                    alignItems: 'flex-start',
                  }}
                >
                  {d.icd10Code && <Text style={s.diagCode}>{d.icd10Code}</Text>}
                  <Text style={s.diagDesc}>{d.description}</Text>
                </View>
                <Text style={s.diagBadge}>
                  {d.isMain ? 'Principal · ' : ''}
                  {DIAG_LABELS[d.diagnosisType] ?? d.diagnosisType}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* CLINICAL SECTIONS */}
        {sections.map(({ label, value }) => (
          <View key={label}>
            <Text style={s.sectionTitle}>{label}</Text>
            <View style={s.textBox}>
              <Text style={s.textContent}>{value}</Text>
            </View>
          </View>
        ))}

        {/* FOLLOW-UP */}
        {p.requiresFollowUp && (
          <View style={s.followUpBox}>
            <Text style={s.followUpText}>
              <Text style={{ marginRight: 8 }}>↩</Text>
              {` Requiere seguimiento${p.followUpDays ? ` en ${p.followUpDays} días` : ''}`}
            </Text>
          </View>
        )}

        {/* FOOTER */}
        <View style={s.footer}>
          <Text style={s.nomText}>NOM-004-SSA3-2012 · Expediente Clínico</Text>
          {p.includeSignature && (
            <View style={s.signatureBlock}>
              {p.doctorSignatureUrl && (
                <Image src={p.doctorSignatureUrl} style={s.signatureImage} />
              )}
              <View style={s.signatureLine}>
                <Text style={s.signatureText}>{p.doctorName}</Text>
                <Text style={s.signatureText}>Cédula: {p.doctorLicense}</Text>
              </View>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
