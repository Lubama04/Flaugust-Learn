import jsPDF from 'jspdf'
import type { WorksheetSchema, WorksheetFieldValue } from '@/types'

const FLAUGUST_BROWN: [number, number, number] = [123, 52, 21]
const MARGIN = 18
const PAGE_WIDTH = 210
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

/** État partagé (position verticale, pagination) pendant l'écriture d'un document jsPDF Flaugust. */
class FlaugustDoc {
  doc: jsPDF
  y = 36

  constructor(headerTitle: string) {
    this.doc = new jsPDF({ orientation: 'portrait', format: 'a4' })
    this.header(headerTitle)
  }

  private header(title: string) {
    this.doc.setFillColor(...FLAUGUST_BROWN)
    this.doc.rect(0, 0, PAGE_WIDTH, 26, 'F')
    this.doc.setTextColor('#FFFFFF')
    this.doc.setFontSize(15)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title.toUpperCase(), MARGIN, 17)
    this.y = 36
  }

  newPage(title?: string) {
    this.doc.addPage()
    this.y = MARGIN
    if (title) {
      this.doc.setFontSize(13)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...FLAUGUST_BROWN)
      this.doc.text(title, MARGIN, this.y)
      this.y += 8
    }
  }

  ensureSpace(needed: number) {
    if (this.y + needed > 280) this.newPage()
  }

  line(text: string, size = 10, bold = false, color = '#444444') {
    this.doc.setFontSize(size)
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.setTextColor(color)
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH)
    this.ensureSpace(lines.length * (size * 0.5))
    this.doc.text(lines, MARGIN, this.y)
    this.y += lines.length * (size * 0.5) + 3
  }

  spacer(amount = 4) {
    this.y += amount
  }

  table(cols: string[], rows: string[][]) {
    const colWidth = CONTENT_WIDTH / Math.max(cols.length, 1)
    const rowHeight = 8

    this.ensureSpace(rowHeight)
    this.doc.setFillColor(...FLAUGUST_BROWN)
    this.doc.setTextColor('#FFFFFF')
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'bold')
    cols.forEach((col, i) => {
      this.doc.rect(MARGIN + i * colWidth, this.y, colWidth, rowHeight, 'F')
      this.doc.text(this.doc.splitTextToSize(col, colWidth - 2), MARGIN + i * colWidth + 1, this.y + 5)
    })
    this.y += rowHeight

    rows.forEach((row, rowIdx) => {
      this.ensureSpace(rowHeight)
      const shade = rowIdx % 2 === 0 ? 249 : 255
      this.doc.setFillColor(shade, shade, shade)
      this.doc.setDrawColor(230, 230, 230)
      this.doc.setTextColor('#1A1A1A')
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(8)
      row.forEach((cell, colIdx) => {
        this.doc.rect(MARGIN + colIdx * colWidth, this.y, colWidth, rowHeight, 'FD')
        this.doc.text(this.doc.splitTextToSize(cell || '', colWidth - 2), MARGIN + colIdx * colWidth + 1, this.y + 5)
      })
      this.y += rowHeight
    })
    this.y += 4
  }

  footerAndSave(filename: string) {
    const pageCount = this.doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.setTextColor('#AAAAAA')
      this.doc.text('FlaugustLearn par Flaugust Business', MARGIN, 292)
      this.doc.text(`Page ${i} / ${pageCount}`, PAGE_WIDTH - MARGIN - 20, 292)
    }
    this.doc.save(filename)
  }
}

function slugFile(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'document'
}

/** Écrit les champs d'une fiche (texte ou tableau) dans le document en cours. */
function writeWorksheetFields(pdf: FlaugustDoc, schema: WorksheetSchema, values: Record<string, WorksheetFieldValue>) {
  for (const field of schema.fields) {
    pdf.ensureSpace(10)
    pdf.line(field.label, 11, true, '#7B3415')
    const value = values[field.id]
    if (field.type === 'table' && Array.isArray(value)) {
      pdf.table(field.table_config?.cols ?? [], value)
    } else {
      pdf.line(typeof value === 'string' && value.trim() ? value : '(non renseigné)', 10, false, '#444444')
      pdf.spacer(2)
    }
  }
}

export function exportWorksheetPdf(params: {
  schema: WorksheetSchema
  values: Record<string, WorksheetFieldValue>
  learnerName: string
  sessionTitle: string
}): void {
  const pdf = new FlaugustDoc(params.schema.title)
  pdf.line(`Apprenant : ${params.learnerName || 'Non renseigné'}`, 11, true, '#1A1A1A')
  pdf.line(`Session : ${params.sessionTitle}`, 10)
  pdf.line(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 10)
  pdf.spacer(3)
  writeWorksheetFields(pdf, params.schema, params.values)
  pdf.footerAndSave(`${slugFile(params.schema.title)}.pdf`)
}

export function exportNotesPdf(params: {
  sessionTitle: string
  learnerName: string
  notes: Array<{ content: string; created_at: string }>
}): void {
  const pdf = new FlaugustDoc(`Notes : ${params.sessionTitle}`)
  pdf.line(`Apprenant : ${params.learnerName || 'Non renseigné'}`, 11, true, '#1A1A1A')
  pdf.line(`Session : ${params.sessionTitle}`, 10)
  pdf.spacer(3)
  params.notes.forEach((note, i) => {
    pdf.ensureSpace(12)
    pdf.line(`Note ${i + 1}, ${new Date(note.created_at).toLocaleDateString('fr-FR')}`, 10, true, '#7B3415')
    pdf.line(note.content, 10)
    pdf.spacer(2)
  })
  pdf.footerAndSave(`notes-${slugFile(params.sessionTitle)}.pdf`)
}

export function exportExercisePdf(params: {
  exerciseTitle: string
  learnerName: string
  score: number
  passed: boolean
  submittedAt: string
  attemptNumber: number
}): void {
  const pdf = new FlaugustDoc(params.exerciseTitle)
  pdf.line(`Apprenant : ${params.learnerName || 'Non renseigné'}`, 11, true, '#1A1A1A')
  pdf.line(`Date : ${new Date(params.submittedAt).toLocaleDateString('fr-FR')}`, 10)
  pdf.line(`Tentative n° ${params.attemptNumber}`, 10)
  pdf.spacer(3)
  pdf.line(`Score : ${params.score}%`, 13, true, params.passed ? '#1A6B35' : '#B71C1C')
  pdf.line(params.passed ? 'Validé' : 'Non validé', 11, true, params.passed ? '#1A6B35' : '#B71C1C')
  pdf.footerAndSave(`${slugFile(params.exerciseTitle)}.pdf`)
}

export interface DossierCourseData {
  courseTitle: string
  worksheets: Array<{ sessionTitle: string; schema: WorksheetSchema; values: Record<string, WorksheetFieldValue> }>
  notesBySession: Array<{ sessionTitle: string; notes: Array<{ content: string; created_at: string }> }>
  exercises: Array<{ title: string; score: number; passed: boolean; isFinalExam: boolean; submittedAt: string }>
}

export function exportFullDossierPdf(learnerName: string, data: DossierCourseData): void {
  const pdf = new FlaugustDoc(`Dossier de formation : ${data.courseTitle}`)
  pdf.line(`Apprenant : ${learnerName || 'Non renseigné'}`, 12, true, '#1A1A1A')
  pdf.line(`Formation : ${data.courseTitle}`, 11)
  pdf.line(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 10)

  if (data.worksheets.length > 0) {
    pdf.newPage('Fiches remplies')
    for (const w of data.worksheets) {
      pdf.ensureSpace(10)
      pdf.line(`${w.schema.title} (${w.sessionTitle})`, 11, true, '#7B3415')
      writeWorksheetFields(pdf, w.schema, w.values)
      pdf.spacer(4)
    }
  }

  if (data.notesBySession.length > 0) {
    pdf.newPage('Mes notes')
    for (const group of data.notesBySession) {
      pdf.ensureSpace(10)
      pdf.line(group.sessionTitle, 11, true, '#7B3415')
      group.notes.forEach((note, i) => {
        pdf.line(`${i + 1}. (${new Date(note.created_at).toLocaleDateString('fr-FR')}) ${note.content}`, 10)
      })
      pdf.spacer(3)
    }
  }

  if (data.exercises.length > 0) {
    pdf.newPage('Mes exercices et évaluations')
    pdf.table(
      ['Exercice', 'Score', 'Résultat', 'Date'],
      data.exercises.map((ex) => [
        ex.isFinalExam ? `${ex.title} (examen final)` : ex.title,
        `${ex.score}%`,
        ex.passed ? 'Validé' : 'Non validé',
        new Date(ex.submittedAt).toLocaleDateString('fr-FR'),
      ])
    )
  }

  pdf.footerAndSave(`dossier-${slugFile(data.courseTitle)}.pdf`)
}
