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
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
    role: z.enum(['apprenant', 'formateur']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
export type RegisterInput = z.infer<typeof registerSchema>

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nom complet requis').max(200),
  bio: z.string().max(1000).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  organizationName: z.string().max(200).optional().or(z.literal('')),
})
export type ProfileInput = z.infer<typeof profileSchema>
