import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RISK_META, type RiskLevel } from '@/lib/tracking'
import { cn } from '@/lib/utils'

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const meta = RISK_META[risk]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.className)}>
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  )
}

export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div
      className={cn('h-2 w-full rounded-full bg-gray-100', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-2 rounded-full bg-lime" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold text-dark">{value}</div>
          <div className="text-xs text-gray">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400" />
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : 'Erreur lors du chargement des données.'}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  )
}

/** Histogramme simple en barres (SVG-free) pour les petites séries, sans dépendance de graphique. */
export function MiniBarChart({
  data,
  formatValue,
}: {
  data: { label: string; value: number }[]
  formatValue?: (v: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex h-36 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-gray">{d.value > 0 ? (formatValue ? formatValue(d.value) : d.value) : ''}</span>
          <div
            className="w-full rounded-t bg-primary/80"
            style={{ height: `${Math.max(d.value > 0 ? 4 : 1, (d.value / max) * 100)}%`, opacity: d.value > 0 ? 1 : 0.2 }}
          />
          <span className="text-[10px] text-gray">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
