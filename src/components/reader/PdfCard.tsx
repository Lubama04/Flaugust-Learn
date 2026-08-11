import { useEffect, useState } from 'react'
import { CheckCircle2, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { upsertSessionProgress } from '@/lib/progress'

interface PdfCardProps {
  sessionId: string
  enrollmentId: string
  contentUrl: string
  isCompleted: boolean
  onCompleted: () => void
}

export function PdfCard({ sessionId, enrollmentId, contentUrl, isCompleted, onCompleted }: PdfCardProps) {
  const toast = useToast()
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)
  const isExternal = contentUrl.startsWith('http')

  useEffect(() => {
    if (isExternal) return
    let cancelled = false
    supabase.functions
      .invoke<{ signedUrl: string }>('get-signed-url', {
        body: { bucket: 'course-documents', path: contentUrl, enrollment_id: enrollmentId },
      })
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setSignedUrl(data.signedUrl)
      })
    return () => {
      cancelled = true
    }
  }, [contentUrl, enrollmentId, isExternal])

  const src = isExternal ? contentUrl : signedUrl

  const handleMarkRead = async () => {
    setMarking(true)
    try {
      await upsertSessionProgress({ enrollmentId, sessionId, isCompleted: true })
      onCompleted()
    } catch {
      toast.error('Erreur lors de la mise à jour de la progression')
    } finally {
      setMarking(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-3 text-primary">
          <FileText className="h-6 w-6" aria-hidden="true" />
          <span className="text-sm font-medium text-dark">Document PDF</span>
          {isCompleted && (
            <span className="ml-auto flex items-center gap-1 text-sm text-lime">
              <CheckCircle2 className="h-4 w-4" /> Complété
            </span>
          )}
        </div>

        {src ? (
          <iframe src={src} title="Document PDF" className="h-[70vh] w-full rounded-lg border border-gray-100" />
        ) : (
          <p className="text-sm text-gray-400">Chargement du document…</p>
        )}

        {!isCompleted && (
          <Button size="sm" onClick={handleMarkRead} disabled={marking}>
            J'ai terminé la lecture
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
