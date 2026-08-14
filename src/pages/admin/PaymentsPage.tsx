import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, CheckCircle2, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdminPayments } from '@/hooks/useAdminPayments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatPrice, formatDate } from '@/lib/utils'
import type { Course, Profile } from '@/types'

const PAYMENT_STATUS_LABELS: Record<string, { label: string; variant: 'gray' | 'accent' | 'secondary' | 'default' }> = {
  en_attente: { label: 'En attente', variant: 'accent' },
  valide: { label: 'Validé', variant: 'secondary' },
  rembourse: { label: 'Remboursé', variant: 'gray' },
  echoue: { label: 'Échoué', variant: 'default' },
}

async function searchApprenants(term: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
    .limit(8)
  if (error) throw error
  return data
}

async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from('courses').select('*').order('title', { ascending: true })
  if (error) throw error
  return data
}

function CashPaymentForm({ onRecorded }: { onRecorded: () => void }) {
  const { recordCashPayment } = useAdminPayments()
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [courseId, setCourseId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  const { data: searchResults } = useQuery({
    queryKey: ['apprenant-search', search],
    queryFn: () => searchApprenants(search),
    enabled: search.trim().length >= 2 && !selectedUser,
  })

  const { data: courses } = useQuery({ queryKey: ['admin-all-courses'], queryFn: fetchCourses })

  const selectedCourse = courses?.find((c) => c.id === courseId)

  const canSubmit = !!selectedUser && !!courseId && Number(amount) > 0

  const handleSubmit = async () => {
    if (!canSubmit || !selectedUser) return
    await recordCashPayment.mutateAsync({ userId: selectedUser.id, courseId, amountFcfa: Number(amount), notes })
    setSelectedUser(null)
    setSearch('')
    setCourseId('')
    setAmount('')
    setNotes('')
    onRecorded()
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <p className="flex items-center gap-2 font-semibold text-dark">
          <Wallet className="h-4 w-4 text-primary" /> Enregistrer un paiement en espèces
        </p>

        <div>
          <Label>Apprenant</Label>
          {selectedUser ? (
            <div className="mt-1 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <span>
                {selectedUser.full_name} <span className="text-gray-400">({selectedUser.email})</span>
              </span>
              <button type="button" onClick={() => setSelectedUser(null)} className="text-xs text-primary hover:underline">
                Changer
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom ou email…" className="pl-9" />
              {searchResults && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-100 bg-white shadow-md">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-lightGray"
                    >
                      {u.full_name} <span className="text-gray-400">({u.email})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="payment-course">Formation</Label>
          <select
            id="payment-course"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value)
              const c = courses?.find((course) => course.id === e.target.value)
              if (c) setAmount(String(c.price_fcfa))
            }}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
          >
            <option value="">Sélectionner…</option>
            {(courses ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {selectedCourse && <p className="mt-1 text-xs text-gray-400">Prix catalogue : {formatPrice(selectedCourse.price_fcfa)}</p>}
        </div>

        <div>
          <Label htmlFor="payment-amount">Montant (FCFA)</Label>
          <Input id="payment-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="payment-notes">Notes (optionnel)</Label>
          <Textarea id="payment-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <Button onClick={() => void handleSubmit()} disabled={!canSubmit || recordCashPayment.isPending}>
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Enregistrer et activer l'inscription
        </Button>
      </CardContent>
    </Card>
  )
}

export function PaymentsPage() {
  const { payments, isLoading, validatePayment } = useAdminPayments()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark">Paiements</h1>

      <CashPaymentForm onRecorded={() => {}} />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Historique</h2>
        {isLoading ? (
          <LoadingSpinner label="Chargement…" />
        ) : payments.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucun paiement enregistré" />
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Apprenant</th>
                    <th className="px-6 py-3 font-medium">Formation</th>
                    <th className="px-6 py-3 font-medium">Montant</th>
                    <th className="px-6 py-3 font-medium">Mode</th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const status = PAYMENT_STATUS_LABELS[p.status] ?? PAYMENT_STATUS_LABELS.en_attente!
                    return (
                      <tr key={p.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-6 py-3">{p.profiles?.full_name ?? '-'}</td>
                        <td className="px-6 py-3">{p.courses?.title ?? '-'}</td>
                        <td className="px-6 py-3">{formatPrice(p.amount_fcfa)}</td>
                        <td className="px-6 py-3 text-gray">{p.provider}</td>
                        <td className="px-6 py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-6 py-3 text-gray">{formatDate(p.created_at)}</td>
                        <td className="px-6 py-3">
                          {p.status === 'en_attente' && (
                            <Button size="sm" onClick={() => validatePayment.mutate(p.id)} disabled={validatePayment.isPending}>
                              Valider
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
