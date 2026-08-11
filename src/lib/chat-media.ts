import { supabase } from '@/lib/supabase'

const SIGNED_URL_TTL_SECONDS = 3600

/**
 * Dépose un fichier dans le bucket privé chat-media, sous le chemin
 * {course_id}/{user_id}/{uuid}.{ext} — convention exigée par les policies RLS du bucket
 * (voir migration 025_resource_chat_buckets) : seuls les membres de la formation peuvent
 * ensuite lire ce chemin, et seul l'auteur peut écrire sous son propre segment.
 */
export async function uploadChatMedia(courseId: string, userId: string, file: Blob, extension: string): Promise<string> {
  const path = `${courseId}/${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('chat-media').upload(path, file)
  if (error) throw error
  return path
}

/** URL signée temporaire pour afficher un média de chat (bucket privé, RLS scoped). */
export async function getChatMediaSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('chat-media').createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) throw error ?? new Error("Impossible de générer l'URL du média")
  return data.signedUrl
}

/** Convertit un Blob en base64 brut (sans préfixe data:), pour l'envoi à Gemini. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
