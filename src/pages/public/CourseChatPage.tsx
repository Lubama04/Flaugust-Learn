import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useProfile } from '@/hooks/useProfile'
import { courseChatRoute } from '@/router'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CourseChat } from '@/components/chat/CourseChat'
import type { Course } from '@/types'

async function fetchCourseBySlug(slug: string): Promise<Course> {
  const { data, error } = await supabase.from('courses').select('*').eq('slug', slug).single()
  if (error) throw error
  return data
}

async function fetchHasAccess(courseId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .in('status', ['actif', 'complete'])
    .maybeSingle()
  return !!data
}

function CourseChatContent() {
  const { slug } = courseChatRoute.useParams()
  const userId = useAuthStore((s) => s.session?.user.id)
  const { data: profile } = useProfile()

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['chat-course', slug],
    queryFn: () => fetchCourseBySlug(slug),
  })

  const isFormateurOrAdmin = profile?.role === 'admin' || (profile?.role === 'formateur' && course?.formateur_id === userId)

  const { data: hasEnrollment, isLoading: accessLoading } = useQuery({
    queryKey: ['chat-access', course?.id, userId],
    queryFn: () => fetchHasAccess(course!.id, userId!),
    enabled: !!course?.id && !!userId && !isFormateurOrAdmin,
  })

  const hasAccess = isFormateurOrAdmin || hasEnrollment

  if (courseLoading || !course) return <LoadingSpinner label="Chargement…" />

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-4">
      <div className="mb-3 flex items-center gap-3">
        <Link to="/formation/$slug" params={{ slug }} className="text-gray-400 hover:text-dark">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-dark">Discussion — {course.title}</p>
          <p className="text-xs text-gray-400">Posez vos questions, l'assistant IA et votre formateur répondent</p>
        </div>
      </div>

      {accessLoading ? (
        <LoadingSpinner label="Vérification de l'accès…" />
      ) : !hasAccess ? (
        <p className="mt-8 text-center text-sm text-gray">
          Vous devez être inscrit et actif sur cette formation pour accéder à la discussion.
        </p>
      ) : (
        <div className="min-h-0 flex-1">
          <CourseChat courseId={course.id} />
        </div>
      )}
    </div>
  )
}

export function CourseChatPage() {
  return (
    <ProtectedRoute>
      <CourseChatContent />
    </ProtectedRoute>
  )
}
