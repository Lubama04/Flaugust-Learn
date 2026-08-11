import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { FormationSchedule as FormationScheduleRow } from '@/types'

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
]

async function fetchSchedule(courseId: string): Promise<FormationScheduleRow | null> {
  const { data, error } = await supabase.from('formation_schedules').select('*').eq('course_id', courseId).maybeSingle()
  if (error) throw error
  return data
}

interface FormationScheduleProps {
  courseId: string
}

/** Configuration du rythme d'une formation : jours/heures récurrents + rappels aux apprenants. */
export function FormationSchedule({ courseId }: FormationScheduleProps) {
  const userId = useAuthStore((s) => s.session?.user.id)
  const toast = useToast()
  const queryClient = useQueryClient()
  const queryKey = ['formation-schedule', courseId]

  const { data: schedule, isLoading } = useQuery({ queryKey, queryFn: () => fetchSchedule(courseId) })

  const [jours, setJours] = useState<number[]>([])
  const [heureDebut, setHeureDebut] = useState('18:00')
  const [heureFin, setHeureFin] = useState('20:00')
  const [rappel, setRappel] = useState(2)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (schedule) {
      setJours(schedule.jours_semaine)
      setHeureDebut(schedule.heure_debut.slice(0, 5))
      setHeureFin(schedule.heure_fin.slice(0, 5))
      setRappel(schedule.rappel_heures_avant)
      setIsActive(schedule.is_active)
    }
  }, [schedule])

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('formation_schedules').upsert(
        {
          course_id: courseId,
          formateur_id: userId!,
          jours_semaine: jours,
          heure_debut: heureDebut,
          heure_fin: heureFin,
          rappel_heures_avant: rappel,
          is_active: isActive,
        },
        { onConflict: 'course_id' }
      )
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Rythme enregistré')
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  })

  const toggleDay = (day: number) => {
    setJours((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day].sort()))
  }

  if (isLoading) return <LoadingSpinner label="Chargement…" />

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-gray">
        Définissez les créneaux récurrents de cette formation. Les apprenants inscrits reçoivent une
        notification de rappel avant chaque session.
      </p>

      <div>
        <Label>Jours de la semaine</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                jours.includes(day.value)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-primary/40'
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="heure-debut">Heure de début</Label>
          <Input id="heure-debut" type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="heure-fin">Heure de fin</Label>
          <Input id="heure-fin" type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="rappel">Rappel avant le début (heures)</Label>
        <Input
          id="rappel"
          type="number"
          min={0}
          max={48}
          value={rappel}
          onChange={(e) => setRappel(Number(e.target.value))}
          className="w-24"
        />
      </div>

      <Button variant="outline" onClick={() => setIsActive((a) => !a)} className="w-full">
        {isActive ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
        Notifications {isActive ? 'activées' : 'désactivées'}
      </Button>

      <Button onClick={() => save.mutate()} disabled={save.isPending || jours.length === 0}>
        Enregistrer le rythme
      </Button>
    </div>
  )
}
