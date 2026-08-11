import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap } from 'lucide-react'
import { signIn, dashboardPathForRole, requestPasswordReset } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { loginSchema, type LoginInput } from '@/lib/validations'
import { useToast } from '@/hooks/useToast'
import { loginRoute } from '@/router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { redirect } = loginRoute.useSearch()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginInput) => {
    setIsSubmitting(true)
    try {
      const { user } = await signIn(values.email, values.password)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      toast.success('Connexion réussie')
      if (redirect) {
        await navigate({ to: redirect })
      } else {
        await navigate({ to: dashboardPathForRole(profile?.role) })
      }
    } catch {
      // Message générique — ne pas révéler si c'est l'email ou le mot de passe qui est incorrect
      toast.error('Email ou mot de passe incorrect')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    const email = getValues('email')
    if (!email) {
      toast.error("Renseignez d'abord votre email ci-dessus")
      return
    }
    try {
      await requestPasswordReset(email)
      toast.success('Email de réinitialisation envoyé si ce compte existe')
    } catch {
      toast.error('Erreur lors de la demande de réinitialisation')
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="text-center">
        <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-bold text-primary">
          <GraduationCap className="h-7 w-7" /> FlaugustLearn
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-dark">Connexion</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-primary hover:underline"
            >
              Mot de passe oublié ?
            </button>
          </div>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray">
        Pas encore de compte ?{' '}
        <Link to="/inscription" className="font-medium text-primary hover:underline">
          S'inscrire
        </Link>
      </p>
    </div>
  )
}
