import { GraduationCap } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { PublicCertificate } from '@/types'

interface CertificateDisplayProps {
  certificate: PublicCertificate
}

/**
 * Rendu visuel du certificat, entièrement en React/Tailwind (pas de HTML brut injecté) :
 * toutes les données viennent d'une RPC typée et sont donc automatiquement échappées par JSX.
 * Reproduit la mise en page du certificat généré par l'Edge Function generate-certificate.
 */
export function CertificateDisplay({ certificate: c }: CertificateDisplayProps) {
  return (
    <div className="mx-auto aspect-[1123/794] w-full max-w-4xl border-[12px] border-primary bg-white p-8 sm:p-12">
      <div className="flex h-full flex-col items-center justify-between text-center">
        <div className="h-1 w-full rounded bg-gradient-to-r from-primary via-accent to-lime" />

        <div>
          <div className="flex items-center justify-center gap-2 font-display text-sm uppercase tracking-[0.3em] text-primary">
            <GraduationCap className="h-5 w-5" /> FlaugustLearn
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-400">
            Établissement Flaugust Business
          </p>
          <div className="mx-auto mt-4 h-0.5 w-28 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <h1 className="mt-4 font-display text-2xl font-bold leading-tight text-dark sm:text-4xl">
            Certificat de Pratique
            <br />
            Professionnelle
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-gray-400">
            Ce document atteste officiellement
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Décerné à</p>
          <p className="mt-2 inline-block border-b-2 border-accent/30 pb-2 font-display text-2xl font-bold text-primary sm:text-4xl">
            {c.student_name}
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-gray-600 sm:text-base">
            pour avoir complété avec succès la formation
            <br />
            <span className="font-display text-lg font-bold text-secondary sm:text-xl">
              {c.course_title}
            </span>
            <br />
            dispensée par <strong>{c.formateur_name}</strong>
          </p>
        </div>

        <div className="flex items-center justify-center gap-8 sm:gap-12">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Score final</p>
            <div className="mx-auto mt-1 flex h-14 w-14 items-center justify-center rounded-full border-2 border-lime bg-secondary text-sm font-bold text-white sm:h-16 sm:w-16 sm:text-base">
              {c.final_score}%
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Durée</p>
            <p className="mt-1 text-sm font-semibold text-dark sm:text-base">{c.duration_hours}h</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Date d'obtention</p>
            <p className="mt-1 text-sm font-semibold text-dark sm:text-base">{formatDate(c.issued_at)}</p>
          </div>
        </div>

        <div className="flex w-full items-end justify-between text-xs">
          <div className="text-center">
            <div className="mb-1 h-px w-32 bg-gray-800 sm:w-44" />
            <p className="font-semibold text-dark">LUBAMA Jean Chrysostome ZACEI</p>
            <p className="text-gray-400">Directeur Général — Flaugust Business</p>
          </div>
          {c.verify_token && (
            <div className="hidden text-right sm:block">
              <p className="text-gray-400">Vérifier ce certificat</p>
              <p className="font-mono text-primary">{c.verify_token.slice(0, 16).toUpperCase()}</p>
            </div>
          )}
          <div className="text-center">
            <div className="mb-1 h-px w-32 bg-gray-800 sm:w-44" />
            <p className="font-semibold text-dark">{c.formateur_name}</p>
            <p className="text-gray-400">Formateur</p>
          </div>
        </div>

        <div className="h-1 w-full rounded bg-gradient-to-r from-primary via-accent to-lime" />
      </div>
    </div>
  )
}
