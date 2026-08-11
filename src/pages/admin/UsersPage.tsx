import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { exportToExcel } from '@/lib/xlsx-export'
import { ROLE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Profile, UserRole } from '@/types'

const ROLES: UserRole[] = ['apprenant', 'formateur', 'institution', 'admin']

async function fetchAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function UsersPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'tous'>('tous')

  const { data: users, isLoading } = useQuery({ queryKey: ['admin-all-users'], queryFn: fetchAllUsers })

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-all-users'] })
      toast.success('Rôle mis à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour du rôle'),
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-all-users'] })
      toast.success('Statut mis à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const filtered = (users ?? []).filter((u) => {
    const matchesRole = roleFilter === 'tous' || u.role === roleFilter
    const matchesSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchesRole && matchesSearch
  })

  const handleExport = async () => {
    try {
      await exportToExcel(
        filtered.map((u) => ({
          Nom: u.full_name,
          Email: u.email,
          Téléphone: u.phone ?? '',
          Rôle: ROLE_LABELS[u.role] ?? u.role,
          Actif: u.is_active ? 'Oui' : 'Non',
          'Inscrit le': formatDate(u.created_at),
        })),
        `flaugustlearn-utilisateurs-${new Date().toISOString().slice(0, 10)}`,
        'Utilisateurs'
      )
    } catch {
      toast.error("Erreur lors de l'export")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-dark">Utilisateurs</h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="mr-1.5 h-4 w-4" /> Exporter en Excel
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'tous')}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark"
        >
          <option value="tous">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Chargement…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Aucun utilisateur trouvé" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Nom</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Inscrit le</th>
                  <th className="px-6 py-3 font-medium">Rôle</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3">{u.full_name || '—'}</td>
                    <td className="px-6 py-3 text-gray">{u.email}</td>
                    <td className="px-6 py-3 text-gray">{formatDate(u.created_at)}</td>
                    <td className="px-6 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value as UserRole })}
                        disabled={changeRole.isPending}
                        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-dark"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <Button
                        variant={u.is_active ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.is_active })}
                        disabled={toggleActive.isPending}
                      >
                        {u.is_active ? 'Actif' : 'Désactivé'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
