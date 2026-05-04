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

export interface PrescriptionItem {
  medicationName: string;
  brandName?: string | null;
  dose: string;
  frequency: string;
  duration: string;
  route?: string | null;
  quantity?: number | null;
  instructions?: string | null;
}

export interface PrescriptionTemplateProps {
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
  includeSignature: boolean; // dynamic toggle
  // Patient
  patientName: string;
  patientAge: number;
  patientGender: string;
  // Prescription
  folioNumber: string;
  issuedAt: string;
  expiresAt: string;
  items: PrescriptionItem[];
  patientInstructions?: string | null;
  diagnosesSummary?: string | null; // "J06.9 - Infección vías respiratorias"
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

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.dark,
    paddingHorizontal: 36,
    paddingVertical: 32,
    backgroundColor: C.white,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.purple,
  },
  logo: { width: 50, height: 50, objectFit: 'contain' },
  logoPlaceholder: {
    width: 50,
    height: 50,
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
  clinicInfo: { flex: 1, marginLeft: 12 },
  clinicName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.purple },
  clinicSub: { fontSize: 8, color: C.gray, marginTop: 2 },
  doctorBlock: { alignItems: 'flex-end' },
  doctorName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark },
  doctorSub: { fontSize: 8, color: C.gray, marginTop: 1 },
  // Folio bar
  folioBar: {
    backgroundColor: C.purpleLight,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  folioText: { fontSize: 8, color: C.purple, fontFamily: 'Helvetica-Bold' },
  // Patient
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
    marginTop: 12,
  },
  patientRow: {
    flexDirection: 'row',
    gap: 24,
    backgroundColor: C.grayLight,
    borderRadius: 6,
    padding: 10,
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
  // Diagnosis
  diagBox: {
    backgroundColor: C.grayLight,
    borderRadius: 6,
    padding: 8,
    marginBottom: 2,
  },
  diagText: { fontSize: 8.5, color: C.dark },
  // Medications
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.purple,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: C.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: { backgroundColor: C.grayLight },
  col1: { width: '4%' },
  col2: { width: '32%' },
  col3: { width: '16%' },
  col4: { width: '18%' },
  col5: { width: '18%' },
  col6: { width: '12%' },
  cellText: { fontSize: 8, color: C.dark },
  cellBold: { fontSize: 8.5, color: C.dark, fontFamily: 'Helvetica-Bold' },
  cellSub: { fontSize: 7, color: C.gray, marginTop: 1 },
  // Instructions
  instructionsBox: {
    backgroundColor: C.purpleLight,
    borderRadius: 6,
    padding: 10,
    marginTop: 2,
  },
  instructionsText: { fontSize: 8.5, color: C.dark, lineHeight: 1.5 },
  // Footer / signature
  footer: {
    marginTop: 20,
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
  validity: { fontSize: 7.5, color: C.gray },
});

// ── Helper ────────────────────────────────────────────────────────────────────

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

// ── Template ──────────────────────────────────────────────────────────────────

export function PrescriptionTemplate(props: PrescriptionTemplateProps) {
  const {
    clinicName,
    clinicAddress,
    clinicPhone,
    clinicLogoUrl,
    doctorName,
    doctorLicense,
    doctorSpecialty,
    doctorSignatureUrl,
    includeSignature,
    patientName,
    patientAge,
    patientGender,
    folioNumber,
    issuedAt,
    expiresAt,
    items,
    patientInstructions,
    diagnosesSummary,
  } = props;

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* HEADER */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {clinicLogoUrl ? (
              <Image src={clinicLogoUrl} style={s.logo} />
            ) : (
              <View style={s.logoPlaceholder}>
                <Text style={s.logoPlaceholderText}>{clinicName[0]}</Text>
              </View>
            )}
            <View style={s.clinicInfo}>
              <Text style={s.clinicName}>{clinicName}</Text>
              {clinicAddress && (
                <Text style={s.clinicSub}>{clinicAddress}</Text>
              )}
              {clinicPhone && (
                <Text style={s.clinicSub}>Tel: {clinicPhone}</Text>
              )}
            </View>
          </View>
          <View style={s.doctorBlock}>
            <Text style={s.doctorName}>{doctorName}</Text>
            <Text style={s.doctorSub}>Cédula: {doctorLicense}</Text>
            {doctorSpecialty && (
              <Text style={s.doctorSub}>{doctorSpecialty}</Text>
            )}
          </View>
        </View>

        {/* FOLIO BAR */}
        <View style={s.folioBar}>
          <Text style={s.folioText}>RECETA MÉDICA · {folioNumber}</Text>
          <Text style={s.folioText}>Fecha: {fmt(issuedAt)}</Text>
        </View>

        {/* PATIENT */}
        <Text style={s.sectionTitle}>Datos del Paciente</Text>
        <View style={s.patientRow}>
          {[
            { label: 'Nombre', value: patientName },
            { label: 'Edad', value: `${patientAge} años` },
            {
              label: 'Género',
              value:
                patientGender === 'FEMALE'
                  ? 'Femenino'
                  : patientGender === 'MALE'
                    ? 'Masculino'
                    : 'Otro',
            },
          ].map(({ label, value }) => (
            <View key={label} style={s.patientField}>
              <Text style={s.patientLabel}>{label}</Text>
              <Text style={s.patientValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* DIAGNOSIS */}
        {diagnosesSummary && (
          <>
            <Text style={s.sectionTitle}>Diagnóstico</Text>
            <View style={s.diagBox}>
              <Text style={s.diagText}>{diagnosesSummary}</Text>
            </View>
          </>
        )}

        {/* MEDICATIONS */}
        <Text style={s.sectionTitle}>Medicamentos Prescritos</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.col1]}>#</Text>
            <Text style={[s.tableHeaderCell, s.col2]}>Medicamento</Text>
            <Text style={[s.tableHeaderCell, s.col3]}>Dosis</Text>
            <Text style={[s.tableHeaderCell, s.col4]}>Frecuencia</Text>
            <Text style={[s.tableHeaderCell, s.col5]}>Duración</Text>
            <Text style={[s.tableHeaderCell, s.col6]}>Vía</Text>
          </View>
          {items.map((item, idx) => (
            <View
              key={idx}
              style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
            >
              <Text style={[s.cellText, s.col1]}>{idx + 1}</Text>
              <View style={s.col2}>
                <Text style={s.cellBold}>{item.medicationName}</Text>
                {item.brandName && (
                  <Text style={s.cellSub}>{item.brandName}</Text>
                )}
                {item.instructions && (
                  <Text style={s.cellSub}>• {item.instructions}</Text>
                )}
              </View>
              <Text style={[s.cellText, s.col3]}>{item.dose}</Text>
              <Text style={[s.cellText, s.col4]}>{item.frequency}</Text>
              <Text style={[s.cellText, s.col5]}>{item.duration}</Text>
              <Text style={[s.cellText, s.col6]}>{item.route ?? '—'}</Text>
            </View>
          ))}
        </View>

        {/* PATIENT INSTRUCTIONS */}
        {patientInstructions && (
          <>
            <Text style={s.sectionTitle}>Indicaciones Generales</Text>
            <View style={s.instructionsBox}>
              <Text style={s.instructionsText}>{patientInstructions}</Text>
            </View>
          </>
        )}

        {/* FOOTER */}
        <View style={s.footer}>
          <Text style={s.validity}>Válida hasta: {fmt(expiresAt)}</Text>
          {includeSignature && (
            <View style={s.signatureBlock}>
              {doctorSignatureUrl && (
                <Image src={doctorSignatureUrl} style={s.signatureImage} />
              )}
              <View style={s.signatureLine}>
                <Text style={s.signatureText}>{doctorName}</Text>
                <Text style={s.signatureText}>Cédula: {doctorLicense}</Text>
              </View>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
