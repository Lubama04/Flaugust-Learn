export const COLORS = {
  primary: '#7B3415', // Maroon — CTA, titres, boutons principaux
  secondary: '#1A6B35', // Vert forêt — succès, validation, boutons secondaires
  accent: '#E88930', // Orange — alertes, badges, gamification
  lime: '#6DB535', // Vert lime — progression, complétion
  magenta: '#B83080', // Magenta — nouveautés, live sessions
  dark: '#1A1A1A',
  gray: '#6B7280',
  lightGray: '#F9FAFB',
} as const

export const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'FlaugustLearn'
export const APP_URL =
  (import.meta.env.VITE_APP_URL as string | undefined) ?? 'https://flaugustlearn.vercel.app'

export const COURSE_LEVELS = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
] as const

export const ROLE_LABELS: Record<string, string> = {
  apprenant: 'Apprenant',
  formateur: 'Formateur',
  institution: 'Institution',
  admin: 'Administrateur',
}
