import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldX, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { PublicCertificate } from '@/types'

interface VerifyCertificatePageProps {
  /** Pré-rempli et lance automatiquement la vérification (route /certificat/verifier/$token). */
  initialToken?: string
}

async function verifyToken(token: string): Promise<PublicCertificate | null> {
  const { data, error } = await supabase.rpc('verify_certificate_by_token', { p_token: token })
  if (error) throw error
  return data?.[0] ?? null
}

export function VerifyCertificatePage({ initialToken }: VerifyCertificatePageProps = {}) {
  const [token, setToken] = useState(initialToken ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not-found'>('idle')
  const [result, setResult] = useState<PublicCertificate | null>(null)

  const handleVerify = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) return
    setStatus('loading')
    try {
      const data = await verifyToken(tokenToVerify.trim())
      if (!data) {
        setStatus('not-found')
        setResult(null)
        return
      }
      setResult(data)
      setStatus('found')
    } catch {
      setStatus('not-found')
      setResult(null)
    }
  }

  useEffect(() => {
    if (initialToken) void handleVerify(initialToken)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken])

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
          onKeyDown={(e) => e.key === 'Enter' && handleVerify(token)}
        />
        <Button onClick={() => handleVerify(token)} disabled={status === 'loading'}>
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
                Délivré à {result.student_name} pour la formation « {result.course_title} »
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
