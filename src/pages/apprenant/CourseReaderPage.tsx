import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { StickyNote, GraduationCap, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { courseReaderRoute } from '@/router'
import { useSessionAccess } from '@/hooks/useSessionAccess'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CourseReader } from '@/components/reader/CourseReader'
import { CourseSidebar, type ModuleWithSessions } from '@/components/reader/CourseSidebar'
import { EcranVerrouille } from '@/components/reader/EcranVerrouille'
import { TexteCard } from '@/components/reader/TexteCard'
import { VideoCard } from '@/components/reader/VideoCard'
import { AudioCard } from '@/components/reader/AudioCard'
import { PdfCard } from '@/components/reader/PdfCard'
import { ExerciseModal } from '@/components/reader/ExerciseModal'
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel'
import { Button } from '@/components/ui/button'
import type { CourseSession, Exercise } from '@/types'

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? ''
}

async function fetchCourseForReader(slug: string) {
  const { data: course, error } = await supabase.from('courses').select('*').eq('slug', slug).single()
  if (error) throw error

  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('*, sessions(*)')
    .eq('course_id', course.id)
    .order('order_index', { ascending: true })
  if (modulesError) throw modulesError

  const sorted = (modules as ModuleWithSessions[]).map((m) => ({
    ...m,
    sessions: [...m.sessions].sort((a, b) => a.order_index - b.order_index),
  }))

  const sessionIds = sorted.flatMap((m) => m.sessions.map((s) => s.id))
  const { data: exercises } = sessionIds.length
    ? await supabase.from('exercises').select('*').in('session_id', sessionIds).eq('is_final_exam', false)
    : { data: [] as Exercise[] }

  return { course, modules: sorted, exercises: exercises ?? [] }
}

async function fetchEnrollment(courseId: string, userId: string) {
  // "complete" doit rester accessible : un apprenant qui a terminé la formation doit
  // pouvoir revenir consulter le contenu (cas d'usage LMS standard), pas être bloqué dehors.
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .in('status', ['actif', 'complete'])
    .maybeSingle()
  if (error) throw error
  return data
}

async function fetchSessionProgress(enrollmentId: string) {
  const { data, error } = await supabase
    .from('session_progress')
    .select('session_id, is_completed')
    .eq('enrollment_id', enrollmentId)
  if (error) throw error
  return data
}

async function fetchNotes(userId: string, sessionId: string) {
  const { data, error } = await supabase
    .from('learner_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

function CourseReaderContent() {
  const { slug } = courseReaderRoute.useParams()
  const search = courseReaderRoute.useSearch()
  const navigate = courseReaderRoute.useNavigate()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.session?.user.id)

  const [exerciseModalExercise, setExerciseModalExercise] = useState<Exercise | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['course-reader', slug],
    queryFn: () => fetchCourseForReader(slug),
  })

  const { data: enrollment } = useQuery({
    queryKey: ['reader-enrollment', data?.course.id, userId],
    queryFn: () => fetchEnrollment(data!.course.id, userId!),
    enabled: !!data?.course.id && !!userId,
  })

  const { data: progressRows } = useQuery({
    queryKey: ['session-progress', enrollment?.id],
    queryFn: () => fetchSessionProgress(enrollment!.id),
    enabled: !!enrollment?.id,
  })

  const completedSessionIds = useMemo(
    () => new Set((progressRows ?? []).filter((p) => p.is_completed).map((p) => p.session_id)),
    [progressRows]
  )

  const allSessions = useMemo(() => data?.modules.flatMap((m) => m.sessions) ?? [], [data])

  const activeSession: CourseSession | undefined = useMemo(() => {
    if (search.session) return allSessions.find((s) => s.id === search.session)
    return allSessions.find((s) => !completedSessionIds.has(s.id)) ?? allSessions[0]
  }, [search.session, allSessions, completedSessionIds])

  useEffect(() => {
    if (!search.session && activeSession) {
      void navigate({ search: { session: activeSession.id }, replace: true })
    }
  }, [search.session, activeSession, navigate])

  const { data: access, isLoading: accessLoading } = useSessionAccess(activeSession?.id, enrollment?.id)

  const { data: notes } = useQuery({
    queryKey: ['learner-notes', userId, activeSession?.id],
    queryFn: () => fetchNotes(userId!, activeSession!.id),
    enabled: !!userId && !!activeSession?.id,
  })

  const { data: isCourseComplete } = useQuery({
    queryKey: ['course-completion', enrollment?.id, completedSessionIds.size],
    queryFn: async () => {
      const { data: result } = await supabase.rpc('check_course_completion', { p_enrollment_id: enrollment!.id })
      return result ?? false
    },
    enabled: !!enrollment?.id,
  })

  const handleSelectSession = (session: CourseSession) => {
    void navigate({ search: { session: session.id } })
  }

  const handleContentCompleted = () => {
    void queryClient.invalidateQueries({ queryKey: ['session-progress'] })
    void queryClient.invalidateQueries({ queryKey: ['session-access'] })

    if (activeSession) {
      const exercise = data?.exercises.find((ex) => ex.session_id === activeSession.id)
      if (exercise) setExerciseModalExercise(exercise)
    }
  }

  if (isLoading || !data) return <LoadingSpinner label="Chargement de la formation…" />

  if (!enrollment) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-gray">Vous n'êtes pas inscrit (ou votre inscription n'est pas encore active) à cette formation.</p>
        <Link to="/formation/$slug" params={{ slug }} className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Retour à la formation
        </Link>
      </div>
    )
  }

  const progressLabel = `${completedSessionIds.size} / ${allSessions.length} sessions complétées`
  const isSessionCompleted = activeSession ? completedSessionIds.has(activeSession.id) : false

  return (
    <>
      <CourseReader
        title={data.course.title}
        progressLabel={progressLabel}
        sidebar={
          <CourseSidebar
            modules={data.modules}
            activeSessionId={activeSession?.id ?? null}
            completedSessionIds={completedSessionIds}
            onSelectSession={handleSelectSession}
          />
        }
        notes={
          <div className="space-y-4">
            {activeSession && (
              <AIAssistantPanel
                sessionTitle={activeSession.title}
                courseTitle={data.course.title}
                sessionContent={
                  activeSession.type === 'texte'
                    ? stripHtml(activeSession.content_text ?? '')
                    : activeSession.description
                }
              />
            )}
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-dark">
                <StickyNote className="h-4 w-4" /> Mes notes
              </p>
              {notes && notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-white p-3 text-sm text-gray shadow-sm">
                    {note.video_timestamp_seconds !== null && (
                      <span className="text-xs font-medium text-primary">
                        {Math.floor(note.video_timestamp_seconds / 60)}:
                        {String(note.video_timestamp_seconds % 60).padStart(2, '0')} —{' '}
                      </span>
                    )}
                    {note.content}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">Aucune note sur cette session.</p>
              )}
            </div>
          </div>
        }
        headerAction={
          <div className="flex items-center gap-1">
            <Link to="/formation/$slug/discussion" params={{ slug }}>
              <Button variant="ghost" size="sm">
                <MessageCircle className="mr-1.5 h-4 w-4" /> Discussion
              </Button>
            </Link>
            <Link to="/formation/$slug" params={{ slug }}>
              <Button variant="ghost" size="sm">
                Quitter
              </Button>
            </Link>
          </div>
        }
      >
        {isCourseComplete && (
          <div className="mb-6 flex flex-col items-center gap-3 rounded-xl bg-gradient-to-r from-lime/10 to-secondary/10 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm font-medium text-dark">
              🎉 Formation presque terminée ! Passez l'examen final pour obtenir votre certificat.
            </p>
            <Link to="/formation/$slug/examen-final" params={{ slug }}>
              <Button size="sm">
                <GraduationCap className="mr-2 h-4 w-4" /> Passer l'examen final
              </Button>
            </Link>
          </div>
        )}

        {!activeSession ? (
          <p className="text-center text-gray">Cette formation ne contient pas encore de contenu.</p>
        ) : accessLoading ? (
          <LoadingSpinner label="Vérification de l'accès…" />
        ) : access && !access.allowed ? (
          <EcranVerrouille access={access} onGoToPreviousSession={(id) => void navigate({ search: { session: id } })} />
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-dark">{activeSession.title}</h2>
              {activeSession.description && <p className="mt-1 text-sm text-gray">{activeSession.description}</p>}
            </div>

            {activeSession.type === 'texte' && (
              <TexteCard
                sessionId={activeSession.id}
                enrollmentId={enrollment.id}
                contentHtml={activeSession.content_text ?? ''}
                isCompleted={isSessionCompleted}
                onCompleted={handleContentCompleted}
              />
            )}
            {activeSession.type === 'video' && (
              <VideoCard
                sessionId={activeSession.id}
                enrollmentId={enrollment.id}
                contentUrl={activeSession.content_url ?? ''}
                isCompleted={isSessionCompleted}
                onCompleted={handleContentCompleted}
              />
            )}
            {activeSession.type === 'audio' && (
              <AudioCard
                sessionId={activeSession.id}
                enrollmentId={enrollment.id}
                contentUrl={activeSession.content_url ?? ''}
                isCompleted={isSessionCompleted}
              />
            )}
            {activeSession.type === 'pdf' && (
              <PdfCard
                sessionId={activeSession.id}
                enrollmentId={enrollment.id}
                contentUrl={activeSession.content_url ?? ''}
                isCompleted={isSessionCompleted}
                onCompleted={handleContentCompleted}
              />
            )}
            {(activeSession.type === 'slides' || activeSession.type === 'live') && activeSession.content_url && (
              <a
                href={activeSession.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary hover:bg-primary/10"
              >
                Ouvrir le contenu →
              </a>
            )}
          </div>
        )}
      </CourseReader>

      {exerciseModalExercise && enrollment && (
        <ExerciseModal
          exercise={exerciseModalExercise}
          enrollmentId={enrollment.id}
          open={!!exerciseModalExercise}
          onClose={() => setExerciseModalExercise(null)}
          onPassed={() => {
            void queryClient.invalidateQueries({ queryKey: ['session-access'] })
          }}
        />
      )}
    </>
  )
}

export function CourseReaderPage() {
  return (
    <ProtectedRoute>
      <CourseReaderContent />
    </ProtectedRoute>
  )
}
