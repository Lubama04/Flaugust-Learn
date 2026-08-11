import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import type { CourseResource } from '@/types'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 Mo — au-delà, l'indexation IA est de toute façon désactivée côté Edge Function.

async function fetchResources(courseId: string): Promise<CourseResource[]> {
  const { data, error } = await supabase
    .from('course_resources')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function useResourceLibrary(courseId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const queryKey = ['course-resources', courseId]

  const resourcesQuery = useQuery({ queryKey, queryFn: () => fetchResources(courseId), enabled: !!courseId })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey })

  const uploadResource = useMutation({
    mutationFn: async (params: { title: string; description: string; file: File; formateurId: string }) => {
      if (params.file.size > MAX_UPLOAD_BYTES) throw new Error('Fichier trop volumineux (max 20 Mo)')
      const ext = params.file.name.split('.').pop() ?? 'bin'
      const path = `${courseId}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('course-resources').upload(path, params.file)
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('course_resources')
        .insert({
          course_id: courseId,
          formateur_id: params.formateurId,
          title: params.title,
          description: params.description,
          file_url: path,
          file_type: ext,
          file_size_bytes: params.file.size,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Ressource ajoutée')
      invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout"),
  })

  const addLinkResource = useMutation({
    mutationFn: async (params: { title: string; description: string; url: string; formateurId: string }) => {
      const { data, error } = await supabase
        .from('course_resources')
        .insert({
          course_id: courseId,
          formateur_id: params.formateurId,
          title: params.title,
          description: params.description,
          file_url: params.url,
          file_type: 'lien',
          file_size_bytes: 0,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Lien ajouté')
      invalidate()
    },
    onError: () => toast.error("Erreur lors de l'ajout du lien"),
  })

  const deleteResource = useMutation({
    mutationFn: async (resource: CourseResource) => {
      const isInternalFile = resource.file_type !== 'lien'
      if (isInternalFile) {
        await supabase.storage.from('course-resources').remove([resource.file_url])
      }
      const { error } = await supabase.from('course_resources').delete().eq('id', resource.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Ressource supprimée')
      invalidate()
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const toggleDownloadable = useMutation({
    mutationFn: async (params: { id: string; isDownloadable: boolean }) => {
      const { error } = await supabase
        .from('course_resources')
        .update({ is_downloadable: params.isDownloadable })
        .eq('id', params.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const triggerIndex = useMutation({
    mutationFn: async (resourceId: string) => {
      const { data, error } = await supabase.functions.invoke<{ error?: string }>('index-resource', {
        body: { resource_id: resourceId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
    },
    onSuccess: () => {
      toast.success('Indexation IA lancée')
      invalidate()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur lors de l'indexation"),
  })

  return {
    resources: resourcesQuery.data ?? [],
    isLoading: resourcesQuery.isLoading,
    uploadResource,
    addLinkResource,
    deleteResource,
    toggleDownloadable,
    triggerIndex,
  }
}
