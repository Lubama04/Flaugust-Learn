import { useRef, useState, type DragEvent } from 'react'
import { Link } from '@tanstack/react-router'
import mammoth from 'mammoth'
import { Bot, UploadCloud, FileText, CheckCircle2, ExternalLink, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { COURSE_LEVELS } from '@/lib/constants'

// Limite pratique, pas les 50 Mo annoncés dans le CDC : une Edge Function Supabase refuse les
// requêtes bien avant cette taille. 8 Mo de fichier source couvre largement un document de cours
// texte, même riche, tout en restant sous la limite réelle de la fonction (voir ai-course-organizer).
const MAX_FILE_BYTES = 8 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']

const PROGRESS_STAGES = [
  { pct: 15, label: 'Lecture du document...' },
  { pct: 40, label: 'Analyse du document par l\'IA...' },
  { pct: 75, label: 'Structuration de la formation...' },
  { pct: 92, label: 'Création des modules et sessions...' },
]

interface OrganizerResult {
  success: boolean
  course_id: string
  course_slug: string
  stats: { modules: number; sessions: number; exercises: number }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
}

export function AssistantIAPage() {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [courseName, setCourseName] = useState('')
  const [price, setPrice] = useState(0)
  const [level, setLevel] = useState<'debutant' | 'intermediaire' | 'avance'>('debutant')
  const [optExercises, setOptExercises] = useState(true)
  const [optFinalExam, setOptFinalExam] = useState(true)
  const [optResources, setOptResources] = useState(true)
  const [optWorksheets, setOptWorksheets] = useState(true)

  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ pct: 0, label: '' })
  const [result, setResult] = useState<OrganizerResult | null>(null)

  const validateAndSetFile = (candidate: File | undefined) => {
    if (!candidate) return
    const ext = `.${candidate.name.split('.').pop()?.toLowerCase()}`
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error('Format non pris en charge (PDF, DOCX ou TXT uniquement)')
      return
    }
    if (candidate.size > MAX_FILE_BYTES) {
      toast.error(`Fichier trop volumineux (${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} Mo max)`)
      return
    }
    setFile(candidate)
    setResult(null)
    if (!courseName) setCourseName(candidate.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    validateAndSetFile(e.dataTransfer.files[0])
  }

  const advanceProgress = () => {
    let i = 0
    setProgress({ pct: 0, label: 'Préparation...' })
    const interval = setInterval(() => {
      const stage = PROGRESS_STAGES[i]
      if (!stage) {
        clearInterval(interval)
        return
      }
      setProgress(stage)
      i += 1
    }, 1800)
    return () => clearInterval(interval)
  }

  const handleLaunch = async () => {
    if (!file) {
      toast.error('Sélectionnez un document à analyser')
      return
    }
    if (!courseName.trim()) {
      toast.error('Indiquez un nom pour la formation')
      return
    }

    setIsRunning(true)
    setResult(null)
    const stopProgress = advanceProgress()

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const isPdf = ext === 'pdf'
      const isDocx = ext === 'docx'

      let textContent: string | undefined
      if (isDocx) {
        const arrayBuffer = await file.arrayBuffer()
        const extracted = await mammoth.extractRawText({ arrayBuffer })
        textContent = extracted.value
      } else if (!isPdf) {
        textContent = await file.text()
      }

      const fileBase64 = await fileToBase64(file)

      const { data, error } = await supabase.functions.invoke<OrganizerResult | { error: string }>(
        'ai-course-organizer',
        {
          body: {
            file_base64: fileBase64,
            file_mime_type: isPdf ? 'application/pdf' : file.type || 'application/octet-stream',
            file_extension: ext,
            text_content: textContent,
            course_name: courseName.trim(),
            price,
            level,
            options: {
              exercises: optExercises,
              final_exam: optFinalExam,
              resources: optResources,
              worksheets: optWorksheets,
            },
          },
        }
      )

      if (error) throw error
      if (!data || 'error' in data) throw new Error((data as { error?: string })?.error ?? 'Erreur inconnue')

      setProgress({ pct: 100, label: 'Formation créée' })
      setResult(data)
      toast.success('Formation créée avec succès')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'organisation IA")
    } finally {
      stopProgress()
      setIsRunning(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark">Assistant IA formateur</h1>
          <p className="text-sm text-gray">
            Uploadez votre cours complet et laissez l'IA organiser tout pour vous automatiquement.
          </p>
        </div>
      </div>

      {result ? (
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
            <h2 className="text-lg font-semibold text-dark">Votre formation a été créée</h2>
            <p className="text-sm text-gray">
              {result.stats.modules} module(s), {result.stats.sessions} session(s), {result.stats.exercises} exercice(s).
              Elle est en brouillon, vous pouvez la revoir avant de la publier.
            </p>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Link to="/formateur/formations/$courseId/editer" params={{ courseId: result.course_id }}>
                <Button className="w-full sm:w-auto">
                  <Pencil className="mr-2 h-4 w-4" /> Modifier avant publication
                </Button>
              </Link>
              <Link to="/formation/$slug" params={{ slug: result.course_slug }}>
                <Button variant="outline" className="w-full sm:w-auto">
                  <ExternalLink className="mr-2 h-4 w-4" /> Voir ma formation
                </Button>
              </Link>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setResult(null); setFile(null) }}>
              Organiser un autre document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}
            >
              {file ? (
                <>
                  <FileText className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium text-dark">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} Mo</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-gray-300" />
                  <p className="text-sm text-dark">Glissez votre fichier ici ou cliquez pour sélectionner</p>
                  <p className="text-xs text-gray-400">PDF, DOCX ou TXT, 8 Mo max</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0])}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseName">Nom de la formation</Label>
              <Input id="courseName" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Prix (FCFA)</Label>
                <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Niveau</Label>
                <select
                  id="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as typeof level)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
                >
                  {COURSE_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Options IA</Label>
              <div className="space-y-2">
                {[
                  { checked: optExercises, set: setOptExercises, label: 'Créer les exercices automatiquement' },
                  { checked: optFinalExam, set: setOptFinalExam, label: "Créer l'évaluation finale" },
                  { checked: optResources, set: setOptResources, label: 'Déposer le fichier dans les ressources' },
                  { checked: optWorksheets, set: setOptWorksheets, label: 'Générer les fiches interactives' },
                ].map((opt) => (
                  <label key={opt.label} className="flex items-center gap-2 text-sm text-dark">
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.set(e.target.checked)}
                      className="h-4 w-4"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {isRunning && (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-lightGray">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {progress.label} ({progress.pct}%)
                </p>
              </div>
            )}

            <Button className="w-full" disabled={isRunning || !file} onClick={() => void handleLaunch()}>
              <Bot className="mr-2 h-4 w-4" /> {isRunning ? 'Organisation en cours...' : "Lancer l'organisation IA"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
