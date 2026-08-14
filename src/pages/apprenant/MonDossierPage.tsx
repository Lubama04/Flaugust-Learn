import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Download,
  Printer,
  StickyNote,
  ClipboardList,
  FileSignature,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useProfile } from '@/hooks/useProfile'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn } from '@/lib/utils'
import {
  exportWorksheetPdf,
  exportNotesPdf,
  exportExercisePdf,
  exportFullDossierPdf,
} from '@/lib/dossier-pdf'
import type { WorksheetSchema, WorksheetFieldValue, WorksheetData } from '@/types'

interface DossierWorksheet {
  sessionId: string
  sessionTitle: string
  schema: WorksheetSchema
  values: Record<string, WorksheetFieldValue>
}
interface DossierNoteGroup {
  sessionId: string
  sessionTitle: string
  notes: Array<{ content: string; created_at: string }>
}
interface DossierExercise {
  title: string
  score: number
  passed: boolean
  isFinalExam: boolean
  submittedAt: string
  attemptNumber: number
}
interface CourseGroup {
  courseId: string
  courseTitle: string
  worksheets: DossierWorksheet[]
  notesBySession: DossierNoteGroup[]
  exercises: DossierExercise[]
}

function worksheetValuesFromData(schema: WorksheetSchema, data: WorksheetData | null): Record<string, WorksheetFieldValue> {
  const values: Record<string, WorksheetFieldValue> = {}
  for (const field of schema.fields) values[field.id] = ''
  for (const f of data?.fields ?? []) {
    if (f.id in values) values[f.id] = f.value
  }
  return values
}

async function fetchDossier(userId: string): Promise<CourseGroup[]> {
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, course_id, courses(id, title)')
    .eq('user_id', userId)
    .in('status', ['actif', 'complete'])
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!enrollments || enrollments.length === 0) return []

  const groups: CourseGroup[] = []

  for (const enrollment of enrollments) {
    const course = (enrollment as unknown as { courses: { id: string; title: string } | null }).courses
    if (!course) continue

    const { data: modules } = await supabase
      .from('modules')
      .select('sessions(id, title, worksheet_schema)')
      .eq('course_id', course.id)
    const sessions = (modules ?? []).flatMap(
      (m) => (m as unknown as { sessions: Array<{ id: string; title: string; worksheet_schema: WorksheetSchema | null }> }).sessions ?? []
    )
    const sessionIds = sessions.map((s) => s.id)
    const sessionTitleById = new Map(sessions.map((s) => [s.id, s.title]))

    let worksheets: DossierWorksheet[] = []
    let notesBySession: DossierNoteGroup[] = []

    if (sessionIds.length > 0) {
      const [{ data: worksheetsRaw }, { data: notesRaw }] = await Promise.all([
        supabase
          .from('learner_worksheets')
          .select('session_id, worksheet_data')
          .eq('user_id', userId)
          .in('session_id', sessionIds),
        supabase
          .from('learner_notes')
          .select('session_id, content, created_at')
          .eq('user_id', userId)
          .in('session_id', sessionIds)
          .order('created_at', { ascending: false }),
      ])

      worksheets = (worksheetsRaw ?? [])
        .map((w) => {
          const session = sessions.find((s) => s.id === w.session_id)
          if (!session?.worksheet_schema) return null
          return {
            sessionId: w.session_id,
            sessionTitle: session.title,
            schema: session.worksheet_schema,
            values: worksheetValuesFromData(session.worksheet_schema, w.worksheet_data as unknown as WorksheetData),
          }
        })
        .filter((w): w is DossierWorksheet => w !== null)

      const notesGrouped = new Map<string, Array<{ content: string; created_at: string }>>()
      for (const note of notesRaw ?? []) {
        const list = notesGrouped.get(note.session_id) ?? []
        list.push({ content: note.content, created_at: note.created_at })
        notesGrouped.set(note.session_id, list)
      }
      notesBySession = Array.from(notesGrouped.entries()).map(([sessionId, notes]) => ({
        sessionId,
        sessionTitle: sessionTitleById.get(sessionId) ?? 'Session',
        notes,
      }))
    }

    const { data: exerciseResults } = await supabase
      .from('exercise_results')
      .select('score, passed, submitted_at, attempt_number, exercise_id, exercises(title, is_final_exam)')
      .eq('enrollment_id', enrollment.id)
      .order('submitted_at', { ascending: false })

    // Un seul résultat par exercice dans le dossier : la tentative la plus récente (déjà trié par
    // submitted_at desc), pas l'historique complet de chaque tentative.
    const seenExerciseIds = new Set<string>()
    const exercises: DossierExercise[] = []
    for (const r of exerciseResults ?? []) {
      if (seenExerciseIds.has(r.exercise_id)) continue
      seenExerciseIds.add(r.exercise_id)
      const ex = (r as unknown as { exercises: { title: string; is_final_exam: boolean } | null }).exercises
      exercises.push({
        title: ex?.title ?? 'Exercice',
        score: r.score,
        passed: r.passed,
        isFinalExam: ex?.is_final_exam ?? false,
        submittedAt: r.submitted_at,
        attemptNumber: r.attempt_number,
      })
    }

    groups.push({ courseId: course.id, courseTitle: course.title, worksheets, notesBySession, exercises })
  }

  return groups
}

export function MonDossierPage() {
  const userId = useAuthStore((s) => s.session?.user.id)
  const { data: profile } = useProfile()
  const [openCourseId, setOpenCourseId] = useState<string | null>(null)

  const { data: groups, isLoading } = useQuery({
    queryKey: ['mon-dossier', userId],
    queryFn: () => fetchDossier(userId!),
    enabled: !!userId,
  })

  if (isLoading) return <LoadingSpinner label="Chargement de votre dossier..." />

  return (
    <div id="dossier-print-area">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #dossier-print-area, #dossier-print-area * { visibility: visible; }
          #dossier-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark">Mon dossier de formation</h1>
          <p className="mt-1 text-sm text-gray">
            Retrouvez ici toutes les fiches, notes et évaluations de vos formations suivies.
          </p>
        </div>
        <Button variant="outline" size="sm" className="no-print" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Imprimer
        </Button>
      </div>

      {!groups || groups.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Votre dossier est encore vide"
          description="Inscrivez-vous à une formation et complétez vos premières sessions pour voir apparaître vos fiches, notes et évaluations ici."
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isOpen = openCourseId === group.courseId
            const totalItems = group.worksheets.length + group.notesBySession.length + group.exercises.length
            return (
              <Card key={group.courseId}>
                <button
                  type="button"
                  onClick={() => setOpenCourseId(isOpen ? null : group.courseId)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                    )}
                    <span className="font-semibold text-dark">{group.courseTitle}</span>
                  </div>
                  <span className="text-xs text-gray-400">{totalItems} élément(s)</span>
                </button>

                {isOpen && (
                  <CardContent className="space-y-6 border-t border-gray-100 pt-5">
                    <DossierSection
                      icon={FileSignature}
                      title={`Fiches remplies (${group.worksheets.length})`}
                      empty="Aucune fiche remplie pour cette formation."
                    >
                      {group.worksheets.map((w) => (
                        <DossierRow key={w.sessionId} label={`${w.schema.title} (${w.sessionTitle})`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="no-print"
                            onClick={() =>
                              exportWorksheetPdf({
                                schema: w.schema,
                                values: w.values,
                                learnerName: profile?.full_name ?? '',
                                sessionTitle: w.sessionTitle,
                              })
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </DossierRow>
                      ))}
                    </DossierSection>

                    <DossierSection
                      icon={StickyNote}
                      title="Mes notes (par session)"
                      empty="Aucune note prise sur cette formation."
                    >
                      {group.notesBySession.map((n) => (
                        <DossierRow key={n.sessionId} label={`${n.sessionTitle} : ${n.notes.length} note(s)`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="no-print"
                            onClick={() =>
                              exportNotesPdf({
                                sessionTitle: n.sessionTitle,
                                learnerName: profile?.full_name ?? '',
                                notes: n.notes,
                              })
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </DossierRow>
                      ))}
                    </DossierSection>

                    <DossierSection
                      icon={ClipboardList}
                      title="Mes exercices et évaluations"
                      empty="Aucun exercice complété pour cette formation."
                    >
                      {group.exercises.map((ex, i) => (
                        <DossierRow
                          key={i}
                          label={`${ex.isFinalExam ? 'Examen final' : ex.title} (${ex.score}/100${ex.passed ? ', validé' : ''})`}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="no-print"
                            onClick={() =>
                              exportExercisePdf({
                                exerciseTitle: ex.title,
                                learnerName: profile?.full_name ?? '',
                                score: ex.score,
                                passed: ex.passed,
                                submittedAt: ex.submittedAt,
                                attemptNumber: ex.attemptNumber,
                              })
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </DossierRow>
                      ))}
                    </DossierSection>

                    {totalItems > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <Button
                          size="sm"
                          className="no-print"
                          onClick={() =>
                            exportFullDossierPdf(profile?.full_name ?? '', {
                              courseTitle: group.courseTitle,
                              worksheets: group.worksheets,
                              notesBySession: group.notesBySession,
                              exercises: group.exercises,
                            })
                          }
                        >
                          <Download className="mr-2 h-4 w-4" /> Télécharger tout le dossier
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DossierSection({
  icon: Icon,
  title,
  empty,
  children,
}: {
  icon: typeof StickyNote
  title: string
  empty: string
  children: ReactNode
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-dark">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </p>
      {hasChildren ? <div className="space-y-1">{children}</div> : <p className="text-xs text-gray-400">{empty}</p>}
    </div>
  )
}

function DossierRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 rounded-lg bg-lightGray/60 px-3 py-2 text-sm text-dark')}>
      <span className="truncate">{label}</span>
      {children}
    </div>
  )
}
