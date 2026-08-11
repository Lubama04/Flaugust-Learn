import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Printer, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { certificateViewerRoute } from '@/router'
import { CertificateDisplay } from '@/components/certificate/CertificateDisplay'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { APP_URL } from '@/lib/constants'
import type { PublicCertificate } from '@/types'

async function fetchCertificateById(id: string): Promise<PublicCertificate | null> {
  const { data, error } = await supabase.rpc('get_certificate_by_id', { p_id: id })
  if (error) throw error
  return data?.[0] ?? null
}

export function CertificateViewerPage() {
  const { id } = certificateViewerRoute.useParams()

  const { data: certificate, isLoading } = useQuery({
    queryKey: ['certificate-viewer', id],
    queryFn: () => fetchCertificateById(id),
  })

  if (isLoading) return <LoadingSpinner label="Chargement du certificat…" />

  if (!certificate) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-gray">Certificat introuvable.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Retour à l'accueil
        </Link>
      </div>
    )
  }

  const verifyUrl = `${APP_URL}/certificat/verifier/${certificate.verify_token ?? ''}`
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-bold text-dark">Certificat de {certificate.student_name}</h1>
        <div className="flex gap-2">
          <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" /> Partager sur LinkedIn
            </Button>
          </a>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Télécharger / Imprimer
          </Button>
        </div>
      </div>

      <CertificateDisplay certificate={certificate} />

      <p className="mt-6 text-center text-xs text-gray-400 print:hidden">
        Vérifiez l'authenticité de ce certificat sur{' '}
        <Link to="/verify-certificat" className="text-primary hover:underline">
          la page de vérification
        </Link>
        .
      </p>
    </div>
  )
}
