import { useState } from 'react'
import { ShieldCheck, ShieldX, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

interface VerifiedCertificate {
  final_score: number
  issued_at: string
  courses: { title: string } | null
  profiles: { full_name: string } | null
}

export function VerifyCertificatePage() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle')
  const [result, setResult] = useState<VerifiedCertificate | null>(null)

  const handleVerify = async () => {
    if (!token.trim()) return
    setStatus('loading')
    // Note : la lecture publique par jeton nécessitera une policy RLS dédiée (ou une
    // fonction RPC SECURITY DEFINER) — à ajouter en Phase 3 avec la génération des certificats.
    const { data, error } = await supabase
      .from('certificates')
      .select('final_score, issued_at, courses(title), profiles(full_name)')
      .eq('verify_token', token.trim())
      .maybeSingle()

    if (error || !data) {
      setStatus('not-found')
      setResult(null)
      return
    }
    setResult(data as unknown as VerifiedCertificate)
    setStatus('found')
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-center font-display text-2xl font-bold text-dark">
        Vérifier un certificat
      </h1>
      <p className="mt-2 text-center text-gray">
        Entrez le code de vérification présent sur le certificat pour confirmer son authenticité.
      </p>

      <div className="mt-8 flex gap-3">
        <Input
          placeholder="Code de vérification"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <Button onClick={handleVerify} disabled={status === 'loading'}>
          <Search className="mr-2 h-4 w-4" /> Vérifier
        </Button>
      </div>

      {status === 'found' && result && (
        <Card className="mt-8 border-secondary/30 bg-secondary/5">
          <CardContent className="flex items-start gap-4 pt-6">
            <ShieldCheck className="h-8 w-8 shrink-0 text-secondary" aria-hidden="true" />
            <div>
              <p className="font-semibold text-dark">Certificat authentique</p>
              <p className="mt-1 text-sm text-gray">
                Délivré à {result.profiles?.full_name ?? '—'} pour la formation « {result.courses?.title ?? '—'} »
                le {formatDate(result.issued_at)} avec un score de {result.final_score}%.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'not-found' && (
        <Card className="mt-8 border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-4 pt-6">
            <ShieldX className="h-8 w-8 shrink-0 text-red-500" aria-hidden="true" />
            <div>
              <p className="font-semibold text-dark">Certificat introuvable</p>
              <p className="mt-1 text-sm text-gray">
                Vérifiez le code saisi. Aucun certificat correspondant n'a été trouvé.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
