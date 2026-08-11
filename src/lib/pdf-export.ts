import jsPDF from 'jspdf'
import type { AssessmentExportData } from '@/types'

export function exportAssessmentsToPdf(data: AssessmentExportData): void {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' })
  const margin = 20
  let y = margin

  const addText = (text: string, size = 11, bold = false, color = '#1A1A1A') => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(text, 170)
    doc.text(lines, margin, y)
    y += lines.length * (size * 0.5) + 2
    if (y > 270) {
      doc.addPage()
      y = margin
    }
  }

  doc.setFillColor(123, 52, 21) // #7B3415
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor('#FFFFFF')
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text("RAPPORT D'ÉVALUATIONS — FLAUGUSTLEARN", margin, 20)
  y = 40

  addText(`Apprenant : ${data.student?.full_name ?? '—'}`, 12, true)
  addText(`Formation : ${data.course?.title ?? '—'}`, 11)
  addText(`Date : ${new Date(data.generated_at).toLocaleDateString('fr-FR')}`, 11)
  addText(`Score global : ${data.passed_exercises}/${data.total_exercises} exercices validés`, 11)
  y += 5

  for (const assessment of data.assessments) {
    const passed = assessment.passed
    doc.setFillColor(passed ? 232 : 255, passed ? 245 : 235, passed ? 233 : 238)
    doc.rect(margin - 2, y - 5, 174, 10, 'F')

    addText(
      assessment.is_final_exam ? 'EXAMEN FINAL' : `${assessment.module_title} — ${assessment.session_title}`,
      12,
      true
    )
    addText(
      `Score : ${assessment.score}% | ${passed ? '✓ Validé' : '✗ Non validé'} | Tentative n°${assessment.attempt_number}`,
      10,
      false,
      passed ? '#1A6B35' : '#B71C1C'
    )
    y += 3
  }

  const courseSlug = (data.course?.title ?? 'formation').replace(/\s+/g, '-')
  doc.save(`evaluations-${courseSlug}.pdf`)
}
