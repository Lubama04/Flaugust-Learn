import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Search, BookX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { COURSE_LEVELS } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'

async function fetchPublishedCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'publie')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function CataloguePage() {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<string>('')
  const [priceFilter, setPriceFilter] = useState<'' | 'gratuit' | 'payant'>('')

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses', 'published'],
    queryFn: fetchPublishedCourses,
  })

  const filtered = useMemo(() => {
    if (!courses) return []
    return courses.filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase())
      const matchesLevel = !level || course.level === level
      const matchesPrice =
        !priceFilter || (priceFilter === 'gratuit' ? course.is_free : !course.is_free)
      return matchesSearch && matchesLevel && matchesPrice
    })
  }, [courses, search, level, priceFilter])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-dark">Catalogue des formations</h1>
      <p className="mt-2 text-gray">Découvrez nos formations conçues par des experts africains.</p>

      {/* Barre de recherche + filtres */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher une formation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
        >
          <option value="">Tous niveaux</option>
          {COURSE_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={priceFilter}
          onChange={(e) => setPriceFilter(e.target.value as '' | 'gratuit' | 'payant')}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
        >
          <option value="">Tous les prix</option>
          <option value="gratuit">Gratuit</option>
          <option value="payant">Payant</option>
        </select>
      </div>

      {/* Résultats */}
      <div className="mt-10">
        {isLoading ? (
          <LoadingSpinner label="Chargement des formations…" />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 py-20 text-center">
            <BookX className="h-10 w-10 text-gray-300" aria-hidden="true" />
            <p className="text-gray">Aucune formation disponible pour l'instant. Revenez bientôt !</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <Link key={course.id} to="/formation/$slug" params={{ slug: course.slug }}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <div className="flex h-40 items-center justify-center overflow-hidden bg-lightGray">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-gray-300">Pas d'image</span>
                    )}
                  </div>
                  <CardContent className="pt-6">
                    <Badge variant="gray">{course.level}</Badge>
                    <h3 className="mt-3 font-semibold text-dark">{course.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray">{course.short_description}</p>
                    <p className="mt-3 font-semibold text-primary">{formatPrice(course.price_fcfa)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
