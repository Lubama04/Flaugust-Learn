import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, BookOpen, ClipboardList, Award } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useToast } from '@/hooks/useToast'
import { ROLE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Profile, UserRole } from '@/types'

async function fetchStats() {
  const [users, courses, enrollments, certificates] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }),
    supabase.from('certificates').select('*', { count: 'exact', head: true }),
  ])
  return {
    users: users.count ?? 0,
    courses: courses.count ?? 0,
    enrollments: enrollments.count ?? 0,
    certificates: certificates.count ?? 0,
  }
}

async function fetchLatestUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}

const ROLES: UserRole[] = ['apprenant', 'formateur', 'institution', 'admin']

export function DashboardAdminPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchStats,
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-latest-users'],
    queryFn: fetchLatestUsers,
  })

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-latest-users'] })
      toast.success('Rôle mis à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour du rôle'),
  })

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-dark">Vue d'ensemble</h1>

      {statsLoading ? (
        <LoadingSpinner label="Chargement des statistiques…" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Utilisateurs" value={stats?.users ?? 0} />
          <StatCard icon={BookOpen} label="Formations" value={stats?.courses ?? 0} />
          <StatCard icon={ClipboardList} label="Inscriptions" value={stats?.enrollments ?? 0} />
          <StatCard icon={Award} label="Certificats" value={stats?.certificates ?? 0} />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-dark">Derniers utilisateurs inscrits</h2>
        {usersLoading ? (
          <LoadingSpinner label="Chargement…" />
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
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-3">{u.full_name || '—'}</td>
                      <td className="px-6 py-3 text-gray">{u.email}</td>
                      <td className="px-6 py-3 text-gray">{formatDate(u.created_at)}</td>
                      <td className="px-6 py-3">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            changeRole.mutate({ id: u.id, role: e.target.value as UserRole })
                          }
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xl font-bold text-dark">{value}</div>
          <div className="text-xs text-gray">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}
