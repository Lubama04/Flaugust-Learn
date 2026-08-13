import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap, MailCheck } from 'lucide-react'
import { signUp } from '@/hooks/useAuth'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RegisterPage() {
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (values: RegisterInput) => {
    setIsSubmitting(true)
    try {
      await signUp({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      })
      setRegistered(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'inscription'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (registered) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <MailCheck className="h-12 w-12 text-secondary" aria-hidden="true" />
        <h1 className="mt-6 text-2xl font-bold text-dark">Vérifiez votre email</h1>
        <p className="mt-2 text-gray">
          Un email de confirmation vous a été envoyé. Cliquez sur le lien qu'il contient pour
          activer votre compte.
        </p>
        <Link to="/login" className="mt-6 text-sm font-medium text-primary hover:underline">
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="text-center">
        <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-bold text-primary">
          <GraduationCap className="h-7 w-7" /> FlaugustLearn
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-dark">Créer un compte</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input id="fullName" autoComplete="name" {...register('fullName')} />
          {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Numéro de téléphone (optionnel)</Label>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+235 XX XX XX XX" {...register('phone')} />
          {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Inscription…' : "S'inscrire"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray">
        Déjà un compte ?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
