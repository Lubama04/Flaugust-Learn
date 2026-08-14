import { Link } from '@tanstack/react-router'
import { Award, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import type { Certificate } from '@/types'

interface CertificateCardProps {
  certificate: Certificate & { courses?: { title?: string } }
}

export function CertificateCard({ certificate }: CertificateCardProps) {
  return (
    <Link to="/certificat/$id" params={{ id: certificate.id }}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-4 pt-6">
          <Award className="h-8 w-8 shrink-0 text-accent" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium text-dark">{certificate.course_title || certificate.courses?.title}</p>
            <p className="text-sm text-gray">
              Délivré le {formatDate(certificate.issued_at)}, score {certificate.final_score}%
            </p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" />
        </CardContent>
      </Card>
    </Link>
  )
}
