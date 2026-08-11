import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cette fonction est appelée par un job pg_cron (net.http_post), donc sans JWT utilisateur —
// elle est déployée avec verify_jwt=false. Elle ne fait qu'insérer des lignes de notification
// (aucune lecture de données sensibles n'est renvoyée, aucune action destructive), et chaque
// insertion est dédupliquée avant écriture : un appel répété ou malveillant de cet endpoint
// public reste donc sans effet néfaste au-delà d'un déclenchement inutile.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DAY_NAMES_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function nowInTimezone(timezone: string): { weekday: number; minutesSinceMidnight: number } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  const shortToIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

  return { weekday: shortToIndex[weekdayShort] ?? 0, minutesSinceMidnight: hour * 60 + minute }
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

async function sendFormationReminders(serviceClient: ReturnType<typeof createClient>): Promise<number> {
  const { data: schedules } = await serviceClient
    .from('formation_schedules')
    .select('id, course_id, jours_semaine, heure_debut, timezone, rappel_heures_avant, is_active')
    .eq('is_active', true)

  let sentCount = 0
  for (const schedule of schedules ?? []) {
    const { weekday, minutesSinceMidnight } = nowInTimezone(schedule.timezone)
    if (!schedule.jours_semaine.includes(weekday)) continue

    const startMinutes = parseTimeToMinutes(schedule.heure_debut)
    const reminderWindowStart = startMinutes - schedule.rappel_heures_avant * 60
    // Fenêtre de déclenchement : entre le début de la fenêtre de rappel et l'heure de
    // début elle-même. Le job tournant plusieurs fois par heure, la dédup ci-dessous
    // évite les doublons plutôt que de viser une minute précise.
    if (minutesSinceMidnight < reminderWindowStart || minutesSinceMidnight >= startMinutes) continue

    const { data: alreadySent } = await serviceClient
      .from('notifications')
      .select('id')
      .eq('type', 'formation_reminder')
      .eq('metadata->>schedule_id', schedule.id)
      .gte('created_at', new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
      .limit(1)
    if (alreadySent && alreadySent.length > 0) continue

    const { data: course } = await serviceClient.from('courses').select('title').eq('id', schedule.course_id).single()
    const { data: enrollments } = await serviceClient
      .from('enrollments')
      .select('user_id')
      .eq('course_id', schedule.course_id)
      .eq('status', 'actif')

    const dayLabel = DAY_NAMES_FR[weekday]
    const rows = (enrollments ?? []).map((e) => ({
      user_id: e.user_id,
      type: 'formation_reminder',
      title: 'Rappel de session',
      message: `Votre session de "${course?.title ?? 'votre formation'}" commence ${dayLabel} à ${schedule.heure_debut}.`,
      metadata: { course_id: schedule.course_id, schedule_id: schedule.id },
    }))
    if (rows.length > 0) {
      await serviceClient.from('notifications').insert(rows)
      sentCount += rows.length
    }
  }
  return sentCount
}

async function sendInactivityAlerts(serviceClient: ReturnType<typeof createClient>): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()

  const { data: inactive } = await serviceClient
    .from('enrollments')
    .select('id, user_id, course_id, updated_at, courses(title)')
    .eq('status', 'actif')
    .lt('progress_pct', 100)
    .lt('updated_at', sevenDaysAgo)

  let sentCount = 0
  for (const enrollment of inactive ?? []) {
    const { data: alreadySent } = await serviceClient
      .from('notifications')
      .select('id')
      .eq('type', 'inactivity_alert')
      .eq('metadata->>enrollment_id', enrollment.id)
      .gte('created_at', twentyDaysAgo)
      .limit(1)
    if (alreadySent && alreadySent.length > 0) continue

    const courseTitle = (enrollment as unknown as { courses: { title: string } | null }).courses?.title ?? 'votre formation'
    await serviceClient.from('notifications').insert({
      user_id: enrollment.user_id,
      type: 'inactivity_alert',
      title: 'Ça fait un moment !',
      message: `Vous n'avez pas avancé dans "${courseTitle}" depuis plus d'une semaine. Reprenez quand vous voulez !`,
      metadata: { course_id: enrollment.course_id, enrollment_id: enrollment.id },
    })
    sentCount += 1
  }
  return sentCount
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const [reminders, inactivity] = await Promise.all([
      sendFormationReminders(serviceClient),
      sendInactivityAlerts(serviceClient),
    ])

    return jsonResponse({ success: true, reminders_sent: reminders, inactivity_alerts_sent: inactivity })
  } catch (error) {
    return jsonResponse({ error: 'Erreur serveur', details: String(error) }, 500)
  }
})
