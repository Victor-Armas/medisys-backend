import { Injectable } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  PrescriptionTemplate,
  PrescriptionTemplateProps,
} from './templates/prescription';
import {
  ConsultationNoteTemplate,
  ConsultationNoteTemplateProps,
} from './templates/consultation-note';
import {
  MedicalHistoryPDFProps,
  MedicalHistoryTemplate,
} from './templates/medical-history';

@Injectable()
export class PdfService {
  async generatePrescription(
    props: PrescriptionTemplateProps,
  ): Promise<Buffer> {
    const element = <PrescriptionTemplate {...props} />;

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PDF generation timeout')), 10_000),
    );

    return Buffer.from(await Promise.race([renderToBuffer(element), timeout]));
  }

  async generateConsultationNote(
    props: ConsultationNoteTemplateProps,
  ): Promise<Buffer> {
    const element = <ConsultationNoteTemplate {...props} />;
    return Buffer.from(await renderToBuffer(element));
  }

  async generateMedicalHistory(props: MedicalHistoryPDFProps): Promise<Buffer> {
    const element = <MedicalHistoryTemplate {...props} />;
    return Buffer.from(await renderToBuffer(element));
  }
}
