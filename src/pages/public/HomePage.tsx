import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Award, Smartphone, ShieldCheck, Volume2, BookOpen, Users, GraduationCap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CourseCard } from '@/components/course/CourseCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { AnimatedCounter } from '@/components/shared/AnimatedCounter'
import type { PlatformStats } from '@/types'

const FEATURED_COUNT = 3

async function fetchFeaturedCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*, profiles!courses_formateur_id_fkey(full_name)')
    .eq('status', 'publie')
    .order('enrolled_count', { ascending: false })
    .limit(FEATURED_COUNT)
  if (error) throw error
  return data.map((c) => ({
    ...c,
    formateur_name: (c as unknown as { profiles?: { full_name?: string } }).profiles?.full_name ?? null,
  }))
}

async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc('get_platform_stats')
  if (error) throw error
  return data as unknown as PlatformStats
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Gate System',
    description: "Progression validée étape par étape : impossible d'avancer sans maîtriser le contenu.",
  },
  {
    icon: Award,
    title: 'Certificats',
    description: 'Certificats vérifiables en ligne à la fin de chaque formation réussie.',
  },
  {
    icon: Volume2,
    title: 'TTS',
    description: 'Contenus lisibles à voix haute pour un apprentissage accessible partout.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-first',
    description: 'Application installable, pensée pour une connexion mobile en Afrique francophone.',
  },
]

const STAT_TILES = [
  { key: 'courses' as const, icon: BookOpen, label: 'Formation disponible' },
  { key: 'learners' as const, icon: Users, label: 'Apprenants inscrits' },
  { key: 'enrollments' as const, icon: GraduationCap, label: 'Inscrits actifs' },
  { key: 'certificates' as const, icon: Award, label: 'Certificats délivrés' },
]

export function HomePage() {
  const { data: featuredCourses, isLoading } = useQuery({
    queryKey: ['courses', 'featured'],
    queryFn: fetchFeaturedCourses,
  })

  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: fetchPlatformStats,
  })

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-white">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold text-dark sm:text-5xl">
            Formez-vous avec les meilleurs experts africains
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray">
            FlaugustLearn est la plateforme e-learning professionnelle de l'Établissement Flaugust
            Business, conçue pour l'Afrique francophone.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/catalogue">
              <Button size="lg">Explorer les formations</Button>
            </Link>
            <Link to="/inscription">
              <Button size="lg" variant="outline">
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Nos formations */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-dark">Nos formations</h2>
        {isLoading ? (
          <div className="mt-8">
            <LoadingSpinner label="Chargement des formations…" />
          </div>
        ) : featuredCourses && featuredCourses.length > 0 ? (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link to="/catalogue">
                <Button variant="outline">Voir toutes les formations</Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="flex h-40 items-center justify-center bg-lightGray text-gray-300">
                  <span className="text-sm">Bientôt disponible</span>
                </div>
                <CardContent className="pt-6">
                  <div className="h-4 w-3/4 rounded bg-gray-100" />
                  <div className="mt-3 h-3 w-1/2 rounded bg-gray-100" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pourquoi FlaugustLearn */}
      <section className="bg-lightGray py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-dark">Pourquoi FlaugustLearn ?</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <feature.icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-dark">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chiffres */}
      <section className="bg-primary py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STAT_TILES.map((tile) => {
              const value = stats?.[tile.key] ?? 0
              const label = tile.key === 'courses' && value !== 1 ? 'Formations disponibles' : tile.label
              return (
                <div key={tile.key} className="rounded-xl bg-white/10 p-6 text-center text-white">
                  <tile.icon className="mx-auto h-7 w-7 text-white/80" aria-hidden="true" />
                  <div className="mt-3 font-display text-4xl font-bold">
                    <AnimatedCounter end={value} />
                  </div>
                  <div className="mt-2 text-sm text-white/80">{label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
