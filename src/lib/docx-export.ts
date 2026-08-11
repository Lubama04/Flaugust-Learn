import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ShadingType,
} from 'docx'
import { saveAs } from 'file-saver'
import type { AssessmentExportData } from '@/types'

function questionPrompt(q: { prompt?: string; text?: string }): string {
  return q.prompt ?? q.text ?? ''
}

export async function exportAssessmentsToDocx(data: AssessmentExportData): Promise<void> {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      text: "RAPPORT D'ÉVALUATIONS — FLAUGUSTLEARN",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Apprenant : `, bold: true }),
        new TextRun({ text: data.student?.full_name ?? '—' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Formation : `, bold: true }),
        new TextRun({ text: data.course?.title ?? '—' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Date d'export : `, bold: true }),
        new TextRun({ text: new Date(data.generated_at).toLocaleDateString('fr-FR') }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Score global : `, bold: true }),
        new TextRun({ text: `${data.passed_exercises}/${data.total_exercises} exercices validés` }),
      ],
    }),
    new Paragraph({ text: '' })
  )

  for (const assessment of data.assessments) {
    children.push(
      new Paragraph({
        text: assessment.is_final_exam
          ? '📋 EXAMEN FINAL'
          : `📝 ${assessment.module_title} — ${assessment.session_title}`,
        heading: HeadingLevel.HEADING_2,
        shading: { type: ShadingType.CLEAR, fill: assessment.passed ? 'E8F5E9' : 'FFEBEE' },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Type : `, bold: true }),
          new TextRun({ text: assessment.exercise_type }),
          new TextRun({ text: `   Score : `, bold: true }),
          new TextRun({ text: `${assessment.score}%`, color: assessment.passed ? '1A6B35' : 'B71C1C' }),
          new TextRun({ text: `   Résultat : `, bold: true }),
          new TextRun({ text: assessment.passed ? '✅ Validé' : '❌ Non validé' }),
        ],
      }),
      new Paragraph({ text: '' })
    )

    for (const q of assessment.questions ?? []) {
      const qId = q.id ?? ''
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Q: ${questionPrompt(q)}`, bold: true })],
          indent: { left: 360 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Votre réponse : `, italics: true }),
            new TextRun({ text: JSON.stringify(assessment.user_answers?.[qId] ?? 'Non répondu') }),
          ],
          indent: { left: 720 },
        })
      )
    }
    children.push(new Paragraph({ text: '' }))
  }

  const doc = new Document({ sections: [{ children, properties: {} }] })
  const buffer = await Packer.toBlob(doc)
  const courseSlug = (data.course?.title ?? 'formation').replace(/\s+/g, '-')
  saveAs(buffer, `evaluations-${courseSlug}.docx`)
}
