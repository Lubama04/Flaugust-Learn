import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useProfile, useInvalidateProfile } from '@/hooks/useProfile'
import { signOut } from '@/hooks/useAuth'
import { profileSchema, type ProfileInput } from '@/lib/validations'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { LogOut } from 'lucide-react'

const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2 MB, aligné sur le bucket "avatars"
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function ProfilPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const userId = useAuthStore((s) => s.session?.user.id)
  const { data: profile, isLoading } = useProfile()
  const invalidateProfile = useInvalidateProfile()
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) })

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.full_name,
        bio: profile.bio ?? '',
        phone: profile.phone ?? '',
        organizationName: profile.organization_name ?? '',
      })
    }
  }, [profile, reset])

  const onSubmit = async (values: ProfileInput) => {
    if (!userId) return
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: values.fullName,
        bio: values.bio || null,
        phone: values.phone || null,
        organization_name: values.organizationName || null,
      })
      .eq('id', userId)
    if (error) {
      toast.error('Erreur lors de la mise à jour du profil')
      return
    }
    invalidateProfile()
    toast.success('Profil mis à jour')
  }

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format non autorisé (JPEG, PNG ou WebP uniquement)')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('Image trop volumineuse (2 Mo max)')
      return
    }

    setUploadingAvatar(true)
    try {
      const ext = file.type.split('/')[1]
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', userId)
      if (updateError) throw updateError

      invalidateProfile()
      toast.success('Photo de profil mise à jour')
    } catch {
      toast.error("Erreur lors de l'envoi de l'image")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!profile?.email) return
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) {
      toast.error("Erreur lors de l'envoi de l'email")
      return
    }
    toast.success('Email de changement de mot de passe envoyé')
  }

  const handleSignOut = async () => {
    await signOut()
    await navigate({ to: '/' })
  }

  if (isLoading || !profile) return <LoadingSpinner label="Chargement du profil…" />

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-dark">Mon profil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer text-sm text-primary hover:underline">
                {uploadingAvatar ? 'Envoi en cours…' : 'Changer la photo'}
              </Label>
              <input
                id="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" {...register('fullName')} />
              {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" {...register('bio')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organisation</Label>
              <Input id="organizationName" {...register('organizationName')} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={handlePasswordReset}>
            Changer le mot de passe
          </Button>
          <Button variant="ghost" onClick={handleSignOut} className="text-red-600 hover:bg-red-50">
            <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
