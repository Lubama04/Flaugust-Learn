import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Save, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/useToast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { exportWorksheetPdf } from '@/lib/dossier-pdf'
import type { WorksheetSchema, WorksheetFieldValue, WorksheetData } from '@/types'

const AUTO_SAVE_INTERVAL_MS = 30_000
const DEBOUNCE_MS = 2_000

interface WorksheetPanelProps {
  sessionId: string
  enrollmentId: string
  sessionTitle: string
  schema: WorksheetSchema
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function defaultTableGrid(config: NonNullable<import('@/types').WorksheetField['table_config']>): string[][] {
  if (typeof config.rows === 'number') {
    return Array.from({ length: config.rows }, () => config.cols.map(() => ''))
  }
  // Gabarit pré-rempli : copie profonde, les cellules non vides du gabarit restent des libellés
  // fixes (rendues en lecture seule), seules les cellules vides "" sont éditables.
  return config.rows.map((row) => [...row])
}

function buildInitialValues(schema: WorksheetSchema): Record<string, WorksheetFieldValue> {
  const values: Record<string, WorksheetFieldValue> = {}
  for (const field of schema.fields) {
    values[field.id] = field.type === 'table' && field.table_config ? defaultTableGrid(field.table_config) : ''
  }
  return values
}

async function loadWorksheet(userId: string, sessionId: string) {
  const { data, error } = await supabase
    .from('learner_worksheets')
    .select('worksheet_data')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw error
  return data?.worksheet_data as WorksheetData | undefined
}

export function WorksheetPanel({ sessionId, enrollmentId, sessionTitle, schema }: WorksheetPanelProps) {
  const toast = useToast()
  const userId = useAuthStore((s) => s.session?.user.id)
  const { data: profile } = useProfile()

  const [values, setValues] = useState<Record<string, WorksheetFieldValue>>(() => buildInitialValues(schema))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [loaded, setLoaded] = useState(false)

  const valuesRef = useRef(values)
  valuesRef.current = values
  const dirtyRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recharge depuis le début à chaque changement de session : la fiche affichée doit toujours
  // correspondre à la session active du lecteur, pas à un état résiduel de la précédente.
  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    setValues(buildInitialValues(schema))
    if (!userId) return
    loadWorksheet(userId, sessionId)
      .then((data) => {
        if (cancelled || !data) return
        const restored = buildInitialValues(schema)
        for (const f of data.fields ?? []) {
          if (f.id in restored) restored[f.id] = f.value
        }
        setValues(restored)
      })
      .catch(() => {
        // Pas de fiche sauvegardée pour l'instant, ou erreur réseau ponctuelle : on part d'une
        // fiche vide plutôt que de bloquer l'affichage.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId])

  const save = async (silent: boolean): Promise<boolean> => {
    if (!userId) return false
    setSaveState('saving')
    const worksheetData: WorksheetData = {
      fields: schema.fields.map((f) => ({ id: f.id, value: valuesRef.current[f.id] ?? '' })),
    }
    try {
      const { error } = await supabase.from('learner_worksheets').upsert(
        {
          user_id: userId,
          session_id: sessionId,
          enrollment_id: enrollmentId,
          worksheet_data: worksheetData as unknown as import('@/types/database').Json,
          last_saved_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,session_id' }
      )
      if (error) throw error
      dirtyRef.current = false
      setSaveState('saved')
      if (!silent) toast.success('Fiche enregistrée dans votre dossier')
      return true
    } catch {
      setSaveState('error')
      if (!silent) toast.error("Erreur lors de l'enregistrement de la fiche")
      return false
    }
  }

  // Sauvegarde périodique toutes les 30s tant qu'il y a des changements non sauvegardés.
  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current) void save(true)
    }, AUTO_SAVE_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, enrollmentId])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleFieldChange = (fieldId: string, value: WorksheetFieldValue) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    dirtyRef.current = true
    setSaveState('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void save(true), DEBOUNCE_MS)
  }

  const handleTableCellChange = (fieldId: string, rowIndex: number, colIndex: number, cellValue: string) => {
    const current = valuesRef.current[fieldId]
    const grid = Array.isArray(current) ? current.map((row) => [...row]) : []
    if (!grid[rowIndex]) grid[rowIndex] = []
    grid[rowIndex][colIndex] = cellValue
    handleFieldChange(fieldId, grid)
  }

  const handleExportPdf = () => {
    exportWorksheetPdf({
      schema,
      values,
      learnerName: profile?.full_name ?? '',
      sessionTitle,
    })
  }

  const statusLabel = useMemo(() => {
    switch (saveState) {
      case 'saving':
        return (
          <span className="flex items-center gap-1 text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Enregistrement...
          </span>
        )
      case 'saved':
        return (
          <span className="flex items-center gap-1 text-secondary">
            <Check className="h-3 w-3" /> Enregistré
          </span>
        )
      case 'error':
        return <span className="text-red-500">Non sauvegardé, nouvelle tentative en cours</span>
      default:
        return null
    }
  }, [saveState])

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-dark">{schema.title}</h3>
          {statusLabel}
        </div>

        {!loaded ? (
          <p className="text-sm text-gray-400">Chargement de votre fiche...</p>
        ) : (
          <div className="space-y-5">
            {schema.fields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label className="text-sm font-medium text-dark">{field.label}</Label>

                {field.type === 'text' && (
                  <Input
                    value={typeof values[field.id] === 'string' ? (values[field.id] as string) : ''}
                    placeholder={field.placeholder}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'textarea' && (
                  <Textarea
                    rows={4}
                    value={typeof values[field.id] === 'string' ? (values[field.id] as string) : ''}
                    placeholder={field.placeholder}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'table' && field.table_config && Array.isArray(values[field.id]) && (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          {field.table_config.cols.map((col) => (
                            <th key={col} className="bg-primary px-2 py-2 text-left text-xs font-semibold text-white">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(values[field.id] as string[][]).map((row, rowIdx) => (
                          <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-[#F9F9F9]' : 'bg-white'}>
                            {row.map((cell, colIdx) => {
                              // Une cellule non vide dans un gabarit pré-rempli (table_config.rows
                              // fourni sous forme de grille) est un libellé fixe, pas une valeur
                              // éditable par l'apprenant — seules les cellules vides le sont.
                              const isTemplateLabel =
                                Array.isArray(field.table_config?.rows) && cell !== '' && rowIdx < row.length
                                  ? field.table_config?.rows[rowIdx]?.[colIdx] !== ''
                                  : false
                              return (
                                <td key={colIdx} className="border-t border-gray-100 p-1">
                                  {isTemplateLabel ? (
                                    <span className="block px-2 py-1.5 text-dark">{cell}</span>
                                  ) : (
                                    <input
                                      value={cell}
                                      onChange={(e) => handleTableCellChange(field.id, rowIdx, colIdx, e.target.value)}
                                      className="w-full rounded border-0 bg-transparent px-2 py-1.5 text-dark focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <Button size="sm" variant="outline" onClick={() => void save(false)} disabled={saveState === 'saving'}>
            <Save className="mr-2 h-4 w-4" /> Enregistrer dans mon dossier
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExportPdf}>
            <Download className="mr-2 h-4 w-4" /> Exporter cette fiche en PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
