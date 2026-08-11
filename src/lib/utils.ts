import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Fusionne des classes Tailwind en résolvant les conflits (shadcn/ui standard). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Formate une date ISO en date lisible française (ex: "10 août 2026"). */
export function formatDate(dateIso: string | null | undefined): string {
  if (!dateIso) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateIso))
}

/** Formate un montant en francs CFA (XAF), ex: "15 000 FCFA". Gratuit si 0. */
export function formatPrice(priceFcfa: number): string {
  if (priceFcfa === 0) return 'Gratuit'
  return `${new Intl.NumberFormat('fr-FR').format(priceFcfa)} FCFA`
}

/** Convertit un titre en slug URL (ex: "Ma Formation !" -> "ma-formation"). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les diacritiques (accents) après décomposition NFD
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
