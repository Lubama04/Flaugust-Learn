import { Link } from '@tanstack/react-router'
import { Star, Users, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import type { Course, EnrollmentStatus } from '@/types'

const LEVEL_BADGE: Record<string, { label: string; variant: 'secondary' | 'accent' | 'magenta' }> = {
  debutant: { label: 'Débutant', variant: 'secondary' },
  intermediaire: { label: 'Intermédiaire', variant: 'accent' },
  avance: { label: 'Avancé', variant: 'magenta' },
}

interface CourseCardProps {
  course: Course & { formateur_name?: string | null }
  /** État d'inscription de l'utilisateur courant pour ce cours, si connu. */
  enrollmentStatus?: EnrollmentStatus
}

export function CourseCard({ course, enrollmentStatus }: CourseCardProps) {
  const level = LEVEL_BADGE[course.level] ?? { label: course.level, variant: 'secondary' as const }

  const ctaLabel =
    enrollmentStatus === 'actif'
      ? 'Continuer'
      : enrollmentStatus === 'complete'
        ? 'Revoir'
        : enrollmentStatus === 'en_attente'
          ? 'En attente'
          : "S'inscrire"

  return (
    <Link to="/formation/$slug" params={{ slug: course.slug }} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="flex h-40 items-center justify-center overflow-hidden bg-lightGray">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <span className="text-sm text-gray-300">Pas d'image</span>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col pt-6">
          <Badge variant={level.variant}>{level.label}</Badge>
          <h3 className="mt-3 line-clamp-2 min-h-[2.75rem] font-semibold text-dark">{course.title}</h3>
          {course.formateur_name && (
            <p className="mt-1 text-sm text-gray">Par {course.formateur_name}</p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-gray">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              {course.rating_avg > 0 ? course.rating_avg.toFixed(1) : '-'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {course.enrolled_count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {course.duration_hours} h
            </span>
          </div>

          <div className="mt-4 flex flex-1 items-end justify-between">
            <span className="font-semibold text-primary">{formatPrice(course.price_fcfa)}</span>
            <Button size="sm" variant={enrollmentStatus === 'en_attente' ? 'outline' : 'default'} disabled={enrollmentStatus === 'en_attente'}>
              {ctaLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
