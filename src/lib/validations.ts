import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email requis').email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Nom complet requis (2 caractères min.)').max(200),
    email: z.string().trim().min(1, 'Email requis').email('Email invalide'),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
export type RegisterInput = z.infer<typeof registerSchema>

// Note : les champs numériques utilisent z.number() (pas z.coerce.number()) — avec react-hook-form,
// la coercition est faite via l'option `valueAsNumber` du register(), ce qui évite un mismatch de
// type entre schéma d'entrée et de sortie que provoque z.coerce avec le resolver zod.
export const courseFormSchema = z.object({
  title: z.string().trim().min(5, 'Titre trop court (5 caractères min.)').max(200),
  shortDescription: z.string().trim().min(10, 'Description courte trop courte').max(300),
  description: z.string().trim().min(20, 'Description trop courte (20 caractères min.)'),
  level: z.enum(['debutant', 'intermediaire', 'avance']),
  language: z.string().trim().min(2).max(10),
  durationHours: z.number().min(0).max(1000),
  isFree: z.boolean(),
  priceFcfa: z.number().int().min(0),
  passScoreFinal: z.number().int().min(0).max(100),
  maxAttemptsFinal: z.number().int().min(1).max(20),
  certificateEnabled: z.boolean(),
  tags: z.string(),
  objectives: z.string(),
  prerequisites: z.string(),
})
export type CourseFormInput = z.infer<typeof courseFormSchema>

export const sessionFormSchema = z.object({
  title: z.string().trim().min(2, 'Titre requis').max(200),
  description: z.string().max(1000),
  type: z.enum(['texte', 'video', 'audio', 'pdf', 'slides', 'live']),
  durationMinutes: z.number().int().min(0).max(600),
  isFreePreview: z.boolean(),
})
export type SessionFormInput = z.infer<typeof sessionFormSchema>

export const moduleFormSchema = z.object({
  title: z.string().trim().min(2, 'Titre requis').max(200),
  description: z.string().max(1000),
  isFreePreview: z.boolean(),
})
export type ModuleFormInput = z.infer<typeof moduleFormSchema>

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nom complet requis').max(200),
  bio: z.string().max(1000).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  organizationName: z.string().max(200).optional().or(z.literal('')),
})
export type ProfileInput = z.infer<typeof profileSchema>
