import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, BookX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CourseCard } from '@/components/course/CourseCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { COURSE_LEVELS } from '@/lib/constants'
import type { EnrollmentStatus } from '@/types'

const PAGE_SIZE = 12

async function fetchPublishedCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*, profiles!courses_formateur_id_fkey(full_name)')
    .eq('status', 'publie')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((c) => ({
    ...c,
    formateur_name: (c as unknown as { profiles?: { full_name?: string } }).profiles?.full_name ?? null,
  }))
}

async function fetchMyEnrollmentsMap(userId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('course_id, status')
    .eq('user_id', userId)
  if (error) throw error
  return new Map(data.map((e) => [e.course_id, e.status as EnrollmentStatus]))
}

const LANGUAGE_LABELS: Record<string, string> = { fr: 'Français', en: 'Anglais' }

export function CataloguePage() {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<string>('')
  const [language, setLanguage] = useState<string>('')
  const [priceFilter, setPriceFilter] = useState<'' | 'gratuit' | 'payant'>('')
  const [page, setPage] = useState(1)

  const userId = useAuthStore((s) => s.session?.user.id)

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', 'published'],
    queryFn: fetchPublishedCourses,
  })

  const { data: enrollmentsMap } = useQuery({
    queryKey: ['my-enrollments-map', userId],
    queryFn: () => fetchMyEnrollmentsMap(userId!),
    enabled: !!userId,
  })

  const availableLanguages = useMemo(
    () => Array.from(new Set((courses ?? []).map((c) => c.language))).sort(),
    [courses]
  )

  const filtered = useMemo(() => {
    if (!courses) return []
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        course.description.toLowerCase().includes(search.toLowerCase())
      const matchesLevel = !level || course.level === level
      const matchesLanguage = !language || course.language === language
      const matchesPrice =
        !priceFilter || (priceFilter === 'gratuit' ? course.is_free : !course.is_free)
      return matchesSearch && matchesLevel && matchesLanguage && matchesPrice
    })
  }, [courses, search, level, language, priceFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetToPageOne = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-dark">Catalogue des formations</h1>
      <p className="mt-2 text-gray">Découvrez nos formations conçues par des experts africains.</p>
      {!isLoading && (
        <p className="mt-1 text-sm font-medium text-primary">
          {filtered.length} formation{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher une formation…"
            value={search}
            onChange={(e) => resetToPageOne(setSearch)(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={level}
          onChange={(e) => resetToPageOne(setLevel)(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
        >
          <option value="">Tous niveaux</option>
          {COURSE_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        {availableLanguages.length > 1 && (
          <select
            value={language}
            onChange={(e) => resetToPageOne(setLanguage)(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
          >
            <option value="">Toutes les langues</option>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang] ?? lang}
              </option>
            ))}
          </select>
        )}
        <select
          value={priceFilter}
          onChange={(e) => resetToPageOne(setPriceFilter)(e.target.value as '' | 'gratuit' | 'payant')}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
        >
          <option value="">Tous les prix</option>
          <option value="gratuit">Gratuit</option>
          <option value="payant">Payant</option>
        </select>
      </div>

      <div className="mt-10">
        {isLoading ? (
          <LoadingSpinner label="Chargement des formations…" />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 py-20 text-center">
            <BookX className="h-10 w-10 text-gray-300" aria-hidden="true" />
            <p className="text-gray">
              {courses && courses.length > 0
                ? 'Aucune formation ne correspond à votre recherche.'
                : "Les premières formations arrivent très bientôt ! Revenez vite."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollmentStatus={enrollmentsMap?.get(course.id)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <span className="text-sm text-gray">
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
