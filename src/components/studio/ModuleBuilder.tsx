import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Video,
  Music,
  FileType,
  Presentation,
  Radio,
  ClipboardCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { moduleFormSchema, type ModuleFormInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { SessionEditor } from '@/components/studio/SessionEditor'
import { ExerciseBuilder } from '@/components/studio/ExerciseBuilder'
import type { Module, CourseSession } from '@/types'

type ModuleWithSessions = Module & { sessions: CourseSession[] }

const SESSION_ICONS: Record<string, typeof FileText> = {
  texte: FileText,
  video: Video,
  audio: Music,
  pdf: FileType,
  slides: Presentation,
  live: Radio,
}

async function fetchModulesWithSessions(courseId: string): Promise<ModuleWithSessions[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('*, sessions(*)')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return (data as ModuleWithSessions[]).map((m) => ({
    ...m,
    sessions: [...m.sessions].sort((a, b) => a.order_index - b.order_index),
  }))
}

interface ModuleBuilderProps {
  courseId: string
}

export function ModuleBuilder({ courseId }: ModuleBuilderProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [addingModule, setAddingModule] = useState(false)
  const [sessionDialog, setSessionDialog] = useState<{ moduleId: string; session?: CourseSession } | null>(null)
  const [exerciseDialog, setExerciseDialog] = useState<{ session: CourseSession } | null>(null)

  const { data: modules, isLoading } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: () => fetchModulesWithSessions(courseId),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] })
    // Le compteur utilisé par l'onglet Publication doit rester synchronisé avec le contenu.
    void queryClient.invalidateQueries({ queryKey: ['course-content-counts', courseId] })
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const reorderModules = useMutation({
    mutationFn: async (ordered: ModuleWithSessions[]) => {
      await Promise.all(
        ordered.map((m, index) => supabase.from('modules').update({ order_index: index }).eq('id', m.id))
      )
    },
    onSuccess: invalidate,
  })

  const reorderSessions = useMutation({
    mutationFn: async (ordered: CourseSession[]) => {
      await Promise.all(
        ordered.map((s, index) => supabase.from('sessions').update({ order_index: index }).eq('id', s.id))
      )
    },
    onSuccess: invalidate,
  })

  const deleteModule = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase.from('modules').delete().eq('id', moduleId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Module supprimé')
      invalidate()
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Session supprimée')
      invalidate()
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const handleModuleDragEnd = (event: DragEndEvent) => {
    if (!modules) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = modules.findIndex((m) => m.id === active.id)
    const newIndex = modules.findIndex((m) => m.id === over.id)
    reorderModules.mutate(arrayMove(modules, oldIndex, newIndex))
  }

  const handleSessionDragEnd = (module: ModuleWithSessions) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = module.sessions.findIndex((s) => s.id === active.id)
    const newIndex = module.sessions.findIndex((s) => s.id === over.id)
    reorderSessions.mutate(arrayMove(module.sessions, oldIndex, newIndex))
  }

  const toggleExpanded = (moduleId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  if (isLoading) return <LoadingSpinner label="Chargement des modules…" />

  return (
    <div className="space-y-4">
      {modules && modules.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {modules.map((module) => (
                <SortableModuleCard
                  key={module.id}
                  module={module}
                  isExpanded={expanded.has(module.id)}
                  onToggle={() => toggleExpanded(module.id)}
                  onDelete={() => deleteModule.mutate(module.id)}
                  onAddSession={() => setSessionDialog({ moduleId: module.id })}
                  onEditSession={(session) => setSessionDialog({ moduleId: module.id, session })}
                  onDeleteSession={(sessionId) => deleteSession.mutate(sessionId)}
                  onManageExercise={(session) => setExerciseDialog({ session })}
                  onSessionDragEnd={handleSessionDragEnd(module)}
                  sensors={sensors}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray">
          Aucun module pour l'instant. Ajoutez votre premier module ci-dessous.
        </p>
      )}

      {addingModule ? (
        <ModuleFormCard
          courseId={courseId}
          nextOrderIndex={modules?.length ?? 0}
          onSaved={() => {
            setAddingModule(false)
            invalidate()
          }}
          onCancel={() => setAddingModule(false)}
        />
      ) : (
        <Button variant="outline" onClick={() => setAddingModule(true)}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un module
        </Button>
      )}

      <Dialog open={!!sessionDialog} onOpenChange={(open) => !open && setSessionDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{sessionDialog?.session ? 'Modifier la session' : 'Nouvelle session'}</DialogTitle>
          </DialogHeader>
          {sessionDialog && (
            <SessionEditor
              moduleId={sessionDialog.moduleId}
              courseId={courseId}
              session={sessionDialog.session}
              nextOrderIndex={
                modules?.find((m) => m.id === sessionDialog.moduleId)?.sessions.length ?? 0
              }
              onSaved={() => {
                setSessionDialog(null)
                invalidate()
              }}
              onCancel={() => setSessionDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!exerciseDialog} onOpenChange={(open) => !open && setExerciseDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exercice de validation — {exerciseDialog?.session.title}</DialogTitle>
          </DialogHeader>
          {exerciseDialog && (
            <ExerciseBuilder
              sessionId={exerciseDialog.session.id}
              courseId={null}
              onSaved={() => setExerciseDialog(null)}
              onCancel={() => setExerciseDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SortableModuleCard({
  module,
  isExpanded,
  onToggle,
  onDelete,
  onAddSession,
  onEditSession,
  onDeleteSession,
  onManageExercise,
  onSessionDragEnd,
  sensors,
}: {
  module: ModuleWithSessions
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  onAddSession: () => void
  onEditSession: (session: CourseSession) => void
  onDeleteSession: (sessionId: string) => void
  onManageExercise: (session: CourseSession) => void
  onSessionDragEnd: (event: DragEndEvent) => void
  sensors: ReturnType<typeof useSensors>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-2">
          <button type="button" {...attributes} {...listeners} className="mt-1 cursor-grab touch-none text-gray-300 hover:text-gray-500">
            <GripVertical className="h-5 w-5" />
          </button>
          <button type="button" onClick={onToggle} className="mt-1 text-gray-400 hover:text-dark">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-dark">{module.title}</p>
              {module.is_free_preview && <Badge variant="secondary">Aperçu gratuit</Badge>}
            </div>
            {module.description && <p className="mt-1 text-sm text-gray">{module.description}</p>}
            <p className="mt-1 text-xs text-gray-400">{module.sessions.length} session(s)</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Supprimer le module">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>

        {isExpanded && (
          <div className="ml-9 mt-4 space-y-2 border-l border-gray-100 pl-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSessionDragEnd}>
              <SortableContext items={module.sessions.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {module.sessions.map((session) => (
                  <SortableSessionRow
                    key={session.id}
                    session={session}
                    onEdit={() => onEditSession(session)}
                    onDelete={() => onDeleteSession(session.id)}
                    onManageExercise={() => onManageExercise(session)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Button variant="ghost" size="sm" onClick={onAddSession}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter une session
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SortableSessionRow({
  session,
  onEdit,
  onDelete,
  onManageExercise,
}: {
  session: CourseSession
  onEdit: () => void
  onDelete: () => void
  onManageExercise: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: session.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const Icon = SESSION_ICONS[session.type] ?? FileText

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg bg-lightGray/60 px-3 py-2">
      <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none text-gray-300 hover:text-gray-500">
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className="h-4 w-4 text-primary" />
      <span className="flex-1 text-sm text-dark">{session.title}</span>
      {session.is_free_preview && <Badge variant="secondary">Gratuit</Badge>}
      <span className="text-xs text-gray-400">{session.duration_minutes} min</span>
      <Button variant="ghost" size="icon" onClick={onManageExercise} aria-label="Exercice de validation">
        <ClipboardCheck className="h-4 w-4 text-secondary" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Modifier la session">
        <Pencil className="h-4 w-4 text-gray-400" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Supprimer la session">
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  )
}

function ModuleFormCard({
  courseId,
  nextOrderIndex,
  onSaved,
  onCancel,
}: {
  courseId: string
  nextOrderIndex: number
  onSaved: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ModuleFormInput>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: { title: '', description: '', isFreePreview: false },
  })

  const onSubmit = async (values: ModuleFormInput) => {
    try {
      const { error } = await supabase.from('modules').insert({
        course_id: courseId,
        title: values.title,
        description: values.description ?? '',
        is_free_preview: values.isFreePreview,
        order_index: nextOrderIndex,
      })
      if (error) throw error
      toast.success('Module ajouté')
      onSaved()
    } catch {
      toast.error("Erreur lors de l'ajout du module")
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="module-title">Titre du module</Label>
            <Input id="module-title" {...register('title')} />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="module-description">Description (optionnelle)</Label>
            <Input id="module-description" {...register('description')} />
          </div>
          <div className="flex items-center gap-2">
            <input id="module-free" type="checkbox" {...register('isFreePreview')} className="h-4 w-4" />
            <Label htmlFor="module-free">Module en aperçu gratuit</Label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              Ajouter
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
