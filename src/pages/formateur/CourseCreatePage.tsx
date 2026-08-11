import { useNavigate } from '@tanstack/react-router'
import { CourseForm } from '@/components/studio/CourseForm'

export function CourseCreatePage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-dark">Créer une formation</h1>
      <CourseForm
        onSaved={(course) => {
          void navigate({ to: '/formateur/formations/$courseId/editer', params: { courseId: course.id } })
        }}
      />
    </div>
  )
}
