import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import mammoth from 'mammoth'
import {
  Bot,
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Pencil,
  X,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn } from '@/lib/utils'

// Limite pratique, pas les 50 Mo d'un CDC precedent : une Edge Function Supabase refuse les
// requetes bien avant cette taille. 8 Mo par fichier couvre largement un document de cours texte.
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_FILES = 10
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']

interface SessionSummary {
  id: string
  title: string
  order_index: number
  worksheet_schema: unknown
  exercises: Array<{ id: string }>
}
interface ModuleSummary {
  id: string
  title: string
  order_index: number
  sessions: SessionSummary[]
}
interface FormationSummary {
  id: string
  title: string
  slug: string
  status: string
  total_sessions: number
  total_fiches: number
  total_quiz: number
  sessions_sans_quiz: string[]
  sessions_sans_fiche: string[]
}

type FileStatus = 'pending' | 'processing' | 'done' | 'error'
interface FileProgressEntry {
  status: FileStatus
  percent: number
  label: string
  error?: string
}

interface ProcessResult {
  fileName: string | null
  success: boolean
  summary?: string
  stats?: { modules_created: number; sessions_created: number; exercises_created: number; worksheets_created: number }
  course_id?: string
  course_slug?: string
  error?: string
}

// Fichier pas encore traité au moment où le quota Gemini est atteint : mis de côté pour la mise
// en file d'attente plutôt que traité comme une erreur classique du fichier lui-même.
interface PendingQueueItem {
  file: File | null
  textContent: string | null
  fileBase64: string | null
  fileMimeType: string | null
}
interface QuotaState {
  resetAt: string
  targetCourseId: string | null
  remaining: PendingQueueItem[]
}

function formatCountdown(resetAt: string): string {
  const diffMs = new Date(resetAt).getTime() - Date.now()
  if (diffMs <= 0) return 'maintenant'
  const totalMinutes = Math.ceil(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
}

const NO_FILE_KEY = '__instructions_only__'

async function loadFormations(userId: string): Promise<FormationSummary[]> {
  const { data: courses, error } = await supabase
    .from('courses')
    .select(
      `id, title, slug, status,
       modules ( id, title, order_index,
         sessions ( id, title, order_index, worksheet_schema, exercises ( id ) )
       )`
    )
    .eq('formateur_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (courses ?? []).map((course) => {
    const modules = (course.modules as unknown as ModuleSummary[]).slice().sort((a, b) => a.order_index - b.order_index)
    const allSessions = modules.flatMap((m) => [...m.sessions].sort((a, b) => a.order_index - b.order_index))
    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      status: course.status,
      total_sessions: allSessions.length,
      total_fiches: allSessions.filter((s) => s.worksheet_schema !== null).length,
      total_quiz: allSessions.filter((s) => (s.exercises?.length ?? 0) > 0).length,
      sessions_sans_quiz: allSessions.filter((s) => (s.exercises?.length ?? 0) === 0).map((s) => s.title),
      sessions_sans_fiche: allSessions.filter((s) => s.worksheet_schema === null).map((s) => s.title),
    }
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
}

// Gemini ne comprend pas nativement le format binaire DOCX (contrairement au PDF, supporte en
// inline_data) : contrairement à ce que proposait un CDC précédent, on continue d'extraire le
// texte du DOCX côté client avec mammoth.js (déjà validé fonctionnel), et on n'envoie le PDF en
// binaire brut que pour le PDF, seul format à support multimodal natif confirmé.
async function readFileForAi(file: File): Promise<{ text_content: string | null; file_base64: string | null; mime_type: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'txt') {
    return { text_content: await file.text(), file_base64: null, mime_type: 'text/plain' }
  }
  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer()
    const extracted = await mammoth.extractRawText({ arrayBuffer })
    const base64 = await fileToBase64(file)
    return {
      text_content: extracted.value,
      file_base64: base64,
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
  }
  const base64 = await fileToBase64(file)
  return { text_content: null, file_base64: base64, mime_type: 'application/pdf' }
}

export function AssistantIAPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const userId = useAuthStore((s) => s.session?.user.id)
  const inputRef = useRef<HTMLInputElement>(null)

  const [formations, setFormations] = useState<FormationSummary[]>([])
  const [loadingFormations, setLoadingFormations] = useState(true)

  const [instructions, setInstructions] = useState('')
  const [mode, setMode] = useState<'new' | 'existing'>('existing')
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)

  const [optExercises, setOptExercises] = useState(true)
  const [optWorksheets, setOptWorksheets] = useState(true)
  const [optResources, setOptResources] = useState(true)
  const [optPublish, setOptPublish] = useState(false)

  const [isProcessing, setIsProcessing] = useState(false)
  const [fileProgress, setFileProgress] = useState<Record<string, FileProgressEntry>>({})
  const [results, setResults] = useState<ProcessResult[] | null>(null)
  const [quotaState, setQuotaState] = useState<QuotaState | null>(null)
  const [queueing, setQueueing] = useState(false)
  // Force un nouveau rendu chaque minute pour que le compte à rebours reste à jour sans
  // dépendre d'une horloge côté serveur.
  const [, setCountdownTick] = useState(0)

  useEffect(() => {
    if (!quotaState) return
    const interval = setInterval(() => setCountdownTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [quotaState])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    loadFormations(userId)
      .then((data) => {
        if (cancelled) return
        setFormations(data)
        if (data[0]) setSelectedCourseId(data[0].id)
        else setMode('new')
      })
      .catch(() => toast.error('Erreur lors du chargement de vos formations'))
      .finally(() => {
        if (!cancelled) setLoadingFormations(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const selectedFormation = formations.find((f) => f.id === selectedCourseId) ?? null

  const addFiles = (incoming: FileList | File[]) => {
    const candidates = Array.from(incoming)
    const accepted: File[] = []
    for (const candidate of candidates) {
      const ext = `.${candidate.name.split('.').pop()?.toLowerCase()}`
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        toast.error(`${candidate.name} : format non pris en charge (PDF, DOCX ou TXT)`)
        continue
      }
      if (candidate.size > MAX_FILE_BYTES) {
        toast.error(`${candidate.name} : trop volumineux (8 Mo max)`)
        continue
      }
      accepted.push(candidate)
    }
    setSelectedFiles((prev) => {
      const combined = [...prev, ...accepted]
      if (combined.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} fichiers à la fois`)
        return combined.slice(0, MAX_FILES)
      }
      return combined
    })
  }

  const removeFile = (name: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name))
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
  }

  const updateProgress = (key: string, entry: FileProgressEntry) => {
    setFileProgress((prev) => ({ ...prev, [key]: entry }))
  }

  const handleLaunch = async () => {
    if (!instructions.trim() && selectedFiles.length === 0) {
      toast.error('Ajoutez des instructions ou au moins un fichier')
      return
    }
    if (mode === 'existing' && !selectedCourseId) {
      toast.error('Sélectionnez une formation existante')
      return
    }

    setIsProcessing(true)
    setResults(null)
    setQuotaState(null)
    setFileProgress({})

    const filesToProcess: Array<File | null> = selectedFiles.length > 0 ? selectedFiles : [null]
    // Cible mise à jour au fil du traitement : si on part d'une nouvelle formation, le premier
    // fichier la crée, et les fichiers suivants du même lot doivent s'y ajouter au lieu de créer
    // chacun leur propre formation séparée.
    let effectiveTargetCourseId: string | null = mode === 'existing' ? selectedCourseId : null
    const collected: ProcessResult[] = []

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i] ?? null
      const key = file?.name ?? NO_FILE_KEY
      updateProgress(key, { status: 'processing', percent: 15, label: file ? 'Lecture du fichier...' : 'Préparation...' })

      let text_content: string | null = null
      let file_base64: string | null = null
      let file_mime_type: string | null = null

      try {
        if (file) {
          const extracted = await readFileForAi(file)
          text_content = extracted.text_content
          file_base64 = extracted.file_base64
          file_mime_type = extracted.mime_type
        }
        updateProgress(key, { status: 'processing', percent: 45, label: "Analyse par l'IA..." })

        const { data, error } = await supabase.functions.invoke<
          | { success: true; summary: string; stats: ProcessResult['stats']; course_id: string; course_slug: string }
          | { error: string; message?: string; reset_at?: string }
        >('ai-course-organizer', {
          body: {
            instructions: instructions.trim() || null,
            file_name: file?.name ?? null,
            text_content,
            file_base64,
            file_mime_type,
            target_course_id: effectiveTargetCourseId,
            options: {
              create_exercises: optExercises,
              create_worksheets: optWorksheets,
              add_to_resources: optResources,
              auto_publish: optPublish,
            },
          },
        })

        // supabase-js renvoie un FunctionsHttpError (pas de data) sur tout statut non-2xx : il
        // faut relire le corps JSON depuis error.context pour distinguer un quota épuisé d'une
        // autre panne, un cas non couvert par le typage générique de invoke().
        if (error) {
          const context = (error as { context?: Response }).context
          if (context?.status === 429) {
            let quotaBody: { error?: string; reset_at?: string } = {}
            try {
              quotaBody = await context.clone().json()
            } catch {
              // corps illisible, on retombe sur un message générique ci-dessous
            }
            if (quotaBody.error === 'quota_exceeded' && quotaBody.reset_at) {
              updateProgress(key, { status: 'pending', percent: 0, label: 'Quota atteint, en attente' })
              // Tous les fichiers restants (celui-ci inclus) rejoignent la file d'attente : les
              // retraiter maintenant échouerait identiquement, le quota journalier est épuisé
              // pour tout le monde, pas seulement pour ce fichier.
              const remaining: PendingQueueItem[] = filesToProcess.slice(i).map((f) => ({
                file: f,
                textContent: f === file ? text_content : null,
                fileBase64: f === file ? file_base64 : null,
                fileMimeType: f === file ? file_mime_type : null,
              }))
              setQuotaState({ resetAt: quotaBody.reset_at, targetCourseId: effectiveTargetCourseId, remaining })
              setResults(collected.length > 0 ? collected : null)
              setIsProcessing(false)
              return
            }
          }
          throw error
        }
        if (!data || 'error' in data) throw new Error((data as { error?: string } | undefined)?.error ?? 'Erreur inconnue')

        if (!effectiveTargetCourseId) effectiveTargetCourseId = data.course_id

        collected.push({
          fileName: file?.name ?? null,
          success: true,
          summary: data.summary,
          stats: data.stats,
          course_id: data.course_id,
          course_slug: data.course_slug,
        })
        updateProgress(key, { status: 'done', percent: 100, label: 'Terminé' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        collected.push({ fileName: file?.name ?? null, success: false, error: message })
        updateProgress(key, { status: 'error', percent: 0, label: 'Erreur', error: message })
        // On continue avec le fichier suivant plutôt que d'abandonner tout le lot.
      }
    }

    setResults(collected)
    setIsProcessing(false)
    const successCount = collected.filter((r) => r.success).length
    if (successCount > 0) toast.success(`${successCount} élément(s) traité(s) avec succès`)
    if (successCount < collected.length) toast.error(`${collected.length - successCount} élément(s) en erreur`)
  }

  const handleQueueRemaining = async () => {
    if (!quotaState || !userId) return
    if (!quotaState.targetCourseId) {
      toast.error('La mise en file d\'attente nécessite une formation existante ciblée')
      return
    }
    setQueueing(true)
    try {
      const rows = quotaState.remaining.map((item) => ({
        formateur_id: userId,
        course_id: quotaState.targetCourseId as string,
        file_name: item.file?.name ?? 'Instructions seules',
        file_content: item.textContent,
        file_base64: item.fileBase64,
        file_mime_type: item.fileMimeType,
        instructions: instructions.trim() || null,
        options: {
          create_exercises: optExercises,
          create_worksheets: optWorksheets,
          add_to_resources: optResources,
          auto_publish: optPublish,
        },
        status: 'pending' as const,
      }))
      const { error } = await supabase.from('pending_ai_sessions').insert(rows)
      if (error) throw error
      toast.success(
        rows.length === 1
          ? "1 fichier mis en file d'attente. Vous recevrez une notification une fois traité."
          : `${rows.length} fichiers mis en file d'attente. Vous recevrez une notification une fois traités.`
      )
      setQuotaState(null)
      setSelectedFiles([])
    } catch {
      toast.error("Erreur lors de la mise en file d'attente")
    } finally {
      setQueueing(false)
    }
  }

  const lastSuccess = results?.slice().reverse().find((r) => r.success) ?? null
  const aggregatedStats = (results ?? [])
    .filter((r) => r.success && r.stats)
    .reduce(
      (acc, r) => ({
        modules_created: acc.modules_created + (r.stats?.modules_created ?? 0),
        sessions_created: acc.sessions_created + (r.stats?.sessions_created ?? 0),
        exercises_created: acc.exercises_created + (r.stats?.exercises_created ?? 0),
        worksheets_created: acc.worksheets_created + (r.stats?.worksheets_created ?? 0),
      }),
      { modules_created: 0, sessions_created: 0, exercises_created: 0, worksheets_created: 0 }
    )

  const handleApprove = async () => {
    if (!lastSuccess?.course_id) return
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'publie', published_at: new Date().toISOString() })
        .eq('id', lastSuccess.course_id)
      if (error) throw error
      toast.success('Formation publiée')
      void navigate({ to: '/formation/$slug', params: { slug: lastSuccess.course_slug ?? '' } })
    } catch {
      toast.error('Erreur lors de la publication')
    }
  }

  const handleReview = () => {
    if (!lastSuccess?.course_id) return
    void navigate({ to: '/formateur/formations/$courseId/editer', params: { courseId: lastSuccess.course_id } })
  }

  const resetAll = () => {
    setResults(null)
    setSelectedFiles([])
    setInstructions('')
    setFileProgress({})
    if (userId) {
      setLoadingFormations(true)
      loadFormations(userId)
        .then(setFormations)
        .finally(() => setLoadingFormations(false))
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark">🤖 Assistant IA Formateur</h1>
          <p className="text-sm text-gray">Votre collaborateur intelligent pour créer et enrichir vos formations.</p>
        </div>
      </div>

      {quotaState ? (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 text-center">
              <Clock className="mx-auto h-10 w-10 text-accent" />
              <h2 className="mt-2 text-lg font-semibold text-dark">⏳ Limite quotidienne atteinte</h2>
              <p className="mt-2 text-sm text-gray">
                L'IA a traité beaucoup de contenu aujourd'hui ! Le quota gratuit permet un nombre limité de générations
                par jour.
              </p>
              <p className="mt-3 text-sm font-medium text-dark">
                Réinitialisation automatique dans : {formatCountdown(quotaState.resetAt)}
              </p>
              <p className="mt-3 text-sm text-gray">
                Vos fichiers sont conservés. {quotaState.targetCourseId ? 'Mettez-les en file d\'attente pour un traitement automatique dès demain, ou revenez plus tard pour continuer exactement où vous en étiez.' : 'Revenez plus tard pour continuer, la mise en file d\'attente nécessite une formation déjà existante en cible.'}
              </p>
              <div className="mt-2 space-y-1 text-left text-xs text-gray">
                {quotaState.remaining.map((item, i) => (
                  <div key={i} className="rounded bg-white/60 px-2 py-1">
                    {item.file?.name ?? 'Instructions seules'}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                {quotaState.targetCourseId && (
                  <Button disabled={queueing} onClick={() => void handleQueueRemaining()}>
                    {queueing ? 'Mise en file...' : "✅ Mettre en file d'attente"}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setQuotaState(null)}>
                  Plus tard
                </Button>
              </div>
            </div>
            {results && results.length > 0 && (
              <p className="text-center text-xs text-gray">
                {results.filter((r) => r.success).length} fichier(s) déjà traité(s) avec succès avant l'atteinte du quota.
              </p>
            )}
          </CardContent>
        </Card>
      ) : results ? (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="text-center">
              {results.every((r) => r.success) ? (
                <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
              ) : (
                <AlertTriangle className="mx-auto h-12 w-12 text-accent" />
              )}
              <h2 className="mt-2 text-lg font-semibold text-dark">
                {results.every((r) => r.success) ? 'Traitement terminé' : 'Traitement terminé avec des erreurs'}
              </h2>
              {lastSuccess?.summary && <p className="mt-2 text-sm text-gray">{lastSuccess.summary}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Modules créés', value: aggregatedStats.modules_created },
                { label: 'Sessions créées', value: aggregatedStats.sessions_created },
                { label: 'Quiz créés', value: aggregatedStats.exercises_created },
                { label: 'Fiches créées', value: aggregatedStats.worksheets_created },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-lightGray p-3 text-center">
                  <div className="text-xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-gray">{stat.label}</div>
                </div>
              ))}
            </div>

            {results.length > 1 && (
              <div className="space-y-1.5">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-lightGray/60 px-3 py-2 text-sm">
                    {r.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                    )}
                    <span className="truncate text-dark">{r.fileName ?? 'Instructions'}</span>
                    {!r.success && <span className="truncate text-xs text-red-500">{r.error}</span>}
                  </div>
                ))}
              </div>
            )}

            {lastSuccess && (
              <div className="flex flex-col justify-center gap-2 pt-2 sm:flex-row">
                <Button className="w-full sm:w-auto" onClick={() => void handleApprove()}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approuver et publier
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleReview}>
                  <Pencil className="mr-2 h-4 w-4" /> Réviser d'abord
                </Button>
              </div>
            )}
            {lastSuccess && (
              <div className="text-center">
                <Link to="/formation/$slug" params={{ slug: lastSuccess.course_slug ?? '' }} className="text-sm text-primary hover:underline">
                  <ExternalLink className="mr-1 inline h-3.5 w-3.5" /> Voir la formation
                </Link>
              </div>
            )}
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={resetAll}>
                Lancer une nouvelle tâche
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Instructions */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-dark">💬 Que voulez-vous faire ?</label>
              <Textarea
                rows={8}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={`Dites-moi ce que vous voulez faire...

Exemples :
• Ajoute les Sessions 3 à 6 à ma formation Import-Export avec fiches interactives et quiz
• Complète les sessions qui n'ont pas encore de quiz
• Crée une nouvelle formation sur la comptabilité pour PME
• Génère les fiches manquantes pour toute la formation`}
              />
            </div>

            {/* Sélection formation */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-dark">Formation concernée</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                <label className="flex items-center gap-2 text-sm text-dark">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'existing'}
                    disabled={formations.length === 0}
                    onChange={() => setMode('existing')}
                  />
                  Travailler sur une formation existante
                </label>
                <label className="flex items-center gap-2 text-sm text-dark">
                  <input type="radio" name="mode" checked={mode === 'new'} onChange={() => setMode('new')} />
                  Créer une nouvelle formation
                </label>
              </div>

              {mode === 'existing' && (
                <div className="space-y-2 pt-1">
                  {loadingFormations ? (
                    <LoadingSpinner label="Chargement de vos formations..." />
                  ) : formations.length === 0 ? (
                    <p className="text-sm text-gray-400">Vous n'avez pas encore de formation. Créez-en une nouvelle.</p>
                  ) : (
                    <>
                      <select
                        value={selectedCourseId ?? ''}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
                      >
                        {formations.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.title}
                          </option>
                        ))}
                      </select>

                      {selectedFormation && (
                        <div className="rounded-lg bg-lightGray p-3 text-sm">
                          <p className="font-medium text-dark">{selectedFormation.title}</p>
                          <p className="mt-0.5 text-gray">
                            {selectedFormation.total_sessions} session{selectedFormation.total_sessions !== 1 ? 's' : ''} ·{' '}
                            {selectedFormation.total_fiches} fiche{selectedFormation.total_fiches !== 1 ? 's' : ''} ·{' '}
                            {selectedFormation.total_quiz} quiz ·{' '}
                            {selectedFormation.status === 'publie' ? 'Publiée' : 'Brouillon'}
                          </p>
                          {selectedFormation.sessions_sans_quiz.length > 0 && (
                            <p className="mt-1.5 text-xs text-accent">
                              Sessions sans quiz : {selectedFormation.sessions_sans_quiz.join(', ')}
                            </p>
                          )}
                          {selectedFormation.sessions_sans_fiche.length > 0 && (
                            <p className="mt-1 text-xs text-accent">
                              Sessions sans fiche interactive : {selectedFormation.sessions_sans_fiche.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Upload multi-fichiers */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-dark">Documents (optionnel)</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                  dragOver ? 'border-primary bg-primary/5' : 'border-gray-200'
                )}
              >
                <UploadCloud className="h-8 w-8 text-gray-300" />
                <p className="text-sm text-dark">Glissez vos fichiers ici ou cliquez pour sélectionner</p>
                <p className="text-xs text-gray-400">PDF, DOCX, TXT · jusqu'à {MAX_FILES} fichiers · 8 Mo max par fichier</p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {selectedFiles.map((f) => (
                    <div key={f.name} className="flex items-center gap-2 rounded-lg bg-lightGray/60 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="flex-1 truncate text-dark">{f.name}</span>
                      <span className="shrink-0 text-xs text-gray-400">{(f.size / 1024 / 1024).toFixed(1)} Mo</span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.name)}
                        className="shrink-0 text-gray-400 hover:text-red-500"
                        aria-label={`Retirer ${f.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-dark">Options</label>
              <div className="space-y-2">
                {[
                  { checked: optExercises, set: setOptExercises, label: 'Créer les exercices QCM automatiquement' },
                  { checked: optWorksheets, set: setOptWorksheets, label: 'Créer les fiches interactives' },
                  { checked: optResources, set: setOptResources, label: 'Ajouter les fichiers en ressources téléchargeables' },
                  { checked: optPublish, set: setOptPublish, label: 'Publier automatiquement (sinon : brouillon)' },
                ].map((opt) => (
                  <label key={opt.label} className="flex items-center gap-2 text-sm text-dark">
                    <input type="checkbox" checked={opt.checked} onChange={(e) => opt.set(e.target.checked)} className="h-4 w-4" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Progression */}
            {isProcessing && (
              <div className="space-y-3 rounded-lg bg-lightGray p-4">
                <p className="text-xs font-medium text-gray">Traitement en cours... Ne fermez pas cette page.</p>
                {(selectedFiles.length > 0 ? selectedFiles.map((f) => f.name) : [NO_FILE_KEY]).map((key) => {
                  const entry = fileProgress[key] ?? { status: 'pending' as FileStatus, percent: 0, label: 'En attente' }
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-dark">
                        <span className="truncate">{key === NO_FILE_KEY ? 'Instructions' : key}</span>
                        <span className="text-gray-400">
                          {entry.percent}% {entry.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            entry.status === 'error' ? 'bg-red-500' : 'bg-primary'
                          )}
                          style={{ width: `${entry.percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <Button
              className="w-full"
              disabled={isProcessing || (!instructions.trim() && selectedFiles.length === 0)}
              onClick={() => void handleLaunch()}
            >
              <Bot className="mr-2 h-4 w-4" /> {isProcessing ? "L'IA travaille..." : "🚀 Lancer l'IA"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
