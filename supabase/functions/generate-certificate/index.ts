import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Échappe les caractères HTML spéciaux. Indispensable : studentName/courseName/formateurName
 * viennent de données utilisateur (profils, titres de cours) et sont injectés dans un document
 * HTML stocké puis potentiellement affiché — sans échappement c'est une XSS stockée.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface CertificateData {
  studentName: string
  courseName: string
  formateurName: string
  score: number
  durationHours: number
  issuedAt: string
  verifyToken: string
  verifyUrl: string
}

function generateCertificateHTML(data: CertificateData): string {
  const date = new Date(data.issuedAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const studentName = escapeHtml(data.studentName)
  const courseName = escapeHtml(data.courseName)
  const formateurName = escapeHtml(data.formateurName)
  const verifyUrl = escapeHtml(data.verifyUrl)
  const verifyCode = escapeHtml(data.verifyToken.slice(0, 16).toUpperCase())

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificat : ${courseName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1123px; height: 794px;
    font-family: 'Inter', sans-serif;
    background: #FFFFFF;
    display: flex; align-items: center; justify-content: center;
  }
  .certificate {
    width: 1083px; height: 754px;
    border: 12px solid #7B3415;
    position: relative;
    padding: 50px 70px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
  }
  .corner { position: absolute; width: 60px; height: 60px; background: #7B3415; }
  .corner.tl { top: -12px; left: -12px; }
  .corner.tr { top: -12px; right: -12px; }
  .corner.bl { bottom: -12px; left: -12px; }
  .corner.br { bottom: -12px; right: -12px; }
  .header { text-align: center; }
  .logo-text {
    font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 400;
    color: #7B3415; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 4px;
  }
  .brand { font-size: 11px; color: #888; letter-spacing: 3px; text-transform: uppercase; }
  .divider {
    width: 120px; height: 2px;
    background: linear-gradient(to right, transparent, #7B3415, transparent);
    margin: 16px auto;
  }
  .cert-title {
    font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 700;
    color: #1A1A1A; text-align: center; line-height: 1.2;
  }
  .cert-subtitle {
    font-size: 13px; color: #888; letter-spacing: 4px; text-transform: uppercase;
    text-align: center; margin-top: 4px;
  }
  .body { text-align: center; }
  .presented-to {
    font-size: 14px; color: #666; letter-spacing: 2px; text-transform: uppercase;
    margin-bottom: 12px;
  }
  .student-name {
    font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 700;
    color: #7B3415; border-bottom: 2px solid #E8893055;
    padding-bottom: 8px; margin-bottom: 20px; display: inline-block;
  }
  .completion-text { font-size: 15px; color: #444; line-height: 1.8; max-width: 600px; }
  .course-name {
    font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #1A6B35;
  }
  .meta { display: flex; gap: 48px; justify-content: center; align-items: center; }
  .meta-item { text-align: center; }
  .meta-label {
    font-size: 10px; color: #999; letter-spacing: 2px; text-transform: uppercase;
    margin-bottom: 4px;
  }
  .meta-value { font-size: 16px; font-weight: 600; color: #1A1A1A; }
  .footer { width: 100%; display: flex; justify-content: space-between; align-items: flex-end; }
  .signature-block { text-align: center; }
  .signature-line { width: 180px; height: 1px; background: #333; margin-bottom: 6px; }
  .signature-name { font-size: 13px; font-weight: 600; color: #1A1A1A; }
  .signature-title { font-size: 11px; color: #888; }
  .verify-block { text-align: right; }
  .verify-label { font-size: 10px; color: #999; margin-bottom: 4px; }
  .verify-token { font-size: 11px; color: #7B3415; font-family: monospace; letter-spacing: 1px; }
  .score-badge {
    display: inline-flex; align-items: center; justify-content: center;
    width: 70px; height: 70px; border-radius: 50%;
    background: #1A6B35; color: white; font-size: 20px; font-weight: 700;
    border: 3px solid #6DB535;
  }
  .accent-bar {
    width: 100%; height: 4px;
    background: linear-gradient(to right, #7B3415, #E88930, #1A6B35, #6DB535);
    border-radius: 2px;
  }
</style>
</head>
<body>
<div class="certificate">
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>
  <div class="accent-bar"></div>
  <div class="header">
    <div class="logo-text">FlaugustLearn</div>
    <div class="brand">Établissement Flaugust Business</div>
    <div class="divider"></div>
    <div class="cert-title">Certificat de Pratique<br>Professionnelle</div>
    <div class="cert-subtitle">Ce document atteste officiellement</div>
  </div>
  <div class="body">
    <div class="presented-to">Décerné à</div>
    <div class="student-name">${studentName}</div>
    <div class="completion-text">
      pour avoir complété avec succès la formation<br>
      <span class="course-name">${courseName}</span><br>
      dispensée par <strong>${formateurName}</strong>
    </div>
  </div>
  <div class="meta">
    <div class="meta-item">
      <div class="meta-label">Score final</div>
      <div class="score-badge">${data.score}%</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Durée</div>
      <div class="meta-value">${data.durationHours}h</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Date d'obtention</div>
      <div class="meta-value">${date}</div>
    </div>
  </div>
  <div class="footer">
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-name">LUBAMA Jean Chrysostome ZACEI</div>
      <div class="signature-title">Directeur Général, Flaugust Business</div>
    </div>
    <div class="verify-block">
      <div class="verify-label">Vérifier ce certificat</div>
      <div class="verify-token">${verifyCode}</div>
      <div style="font-size:10px;color:#999;margin-top:2px">${verifyUrl}</div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-name">${formateurName}</div>
      <div class="signature-title">Formateur</div>
    </div>
  </div>
  <div class="accent-bar"></div>
</div>
</body>
</html>`
}

interface EnrollmentRow {
  id: string
  user_id: string
  course_id: string
  course: {
    id: string
    title: string
    duration_hours: number
    pass_score_final: number
    formateur: { full_name: string } | null
  } | null
  student: { full_name: string; email: string } | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { enrollment_id } = await req.json()
    if (!enrollment_id) {
      return new Response(JSON.stringify({ error: 'enrollment_id requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: isComplete } = await supabase.rpc('check_course_completion', { p_enrollment_id: enrollment_id })
    if (!isComplete) {
      return new Response(JSON.stringify({ error: 'Formation non complétée' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select(`
        id, user_id, course_id,
        course:courses(
          id, title, duration_hours, pass_score_final,
          formateur:profiles!courses_formateur_id_fkey(full_name)
        ),
        student:profiles!enrollments_user_id_fkey(full_name, email)
      `)
      .eq('id', enrollment_id)
      .eq('user_id', user.id)
      .single<EnrollmentRow>()

    if (!enrollment || !enrollment.course || !enrollment.student) {
      return new Response(JSON.stringify({ error: 'Inscription introuvable' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: finalExam } = await supabase
      .from('exercises')
      .select('id')
      .eq('course_id', enrollment.course_id)
      .eq('is_final_exam', true)
      .maybeSingle()

    let finalScore = 100
    if (finalExam) {
      const { data: finalResult } = await supabase
        .from('exercise_results')
        .select('score')
        .eq('exercise_id', finalExam.id)
        .eq('enrollment_id', enrollment_id)
        .eq('passed', true)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (finalResult) finalScore = finalResult.score
    }

    const { data: existing } = await supabase
      .from('certificates')
      .select('id, pdf_url, verify_token')
      .eq('enrollment_id', enrollment_id)
      .maybeSingle()

    if (existing?.pdf_url) {
      return new Response(
        JSON.stringify({ success: true, certificate_id: existing.id, pdf_url: existing.pdf_url, verify_token: existing.verify_token, already_existed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'https://flaugustlearn.vercel.app'
    const verifyToken = existing?.verify_token ?? crypto.randomUUID().replace(/-/g, '')
    const verifyUrl = `${appUrl}/certificat/verifier/${verifyToken}`

    let certificateId = existing?.id
    if (!certificateId) {
      const { data: cert, error: certError } = await supabase
        .from('certificates')
        .insert({
          user_id: user.id,
          course_id: enrollment.course_id,
          enrollment_id,
          final_score: finalScore,
          verify_token: verifyToken,
          formateur_name: enrollment.course.formateur?.full_name ?? '',
          course_title: enrollment.course.title,
          duration_hours: enrollment.course.duration_hours,
        })
        .select('id')
        .single()
      if (certError || !cert) {
        return new Response(JSON.stringify({ error: 'Erreur création certificat' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      certificateId = cert.id
    }

    const html = generateCertificateHTML({
      studentName: enrollment.student.full_name,
      courseName: enrollment.course.title,
      formateurName: enrollment.course.formateur?.full_name ?? 'Formateur',
      score: finalScore,
      durationHours: enrollment.course.duration_hours,
      issuedAt: new Date().toISOString(),
      verifyToken,
      verifyUrl,
    })

    // Archive HTML privée (bucket "certificates", lecture réservée au propriétaire/admin) —
    // l'affichage public passe par get_certificate_by_id / verify_certificate_by_token (RPC),
    // pas par ce fichier, donc aucune exposition publique du bucket n'est nécessaire.
    const htmlBlob = new TextEncoder().encode(html)
    const storagePath = `${user.id}/${certificateId}.html`
    await supabase.storage.from('certificates').upload(storagePath, htmlBlob, { contentType: 'text/html', upsert: true })

    const certificatePageUrl = `${appUrl}/certificat/${certificateId}`

    await supabase
      .from('certificates')
      .update({ pdf_url: certificatePageUrl, issued_at: new Date().toISOString() })
      .eq('id', certificateId)

    const resendKey = Deno.env.get('RESEND_API_KEY')
    let emailSent = false
    if (resendKey) {
      const studentNameEsc = escapeHtml(enrollment.student.full_name)
      const courseTitleEsc = escapeHtml(enrollment.course.title)
      const emailHtml = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Inter,sans-serif;background:#f9fafb;padding:40px 0">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#7B3415;padding:32px;text-align:center">
    <h1 style="color:white;font-size:24px;margin:0">FlaugustLearn</h1>
    <p style="color:#E88930;margin:8px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase">Établissement Flaugust Business</p>
  </div>
  <div style="padding:40px">
    <h2 style="color:#1A1A1A;font-size:22px;margin:0 0 16px">🎓 Félicitations, ${studentNameEsc} !</h2>
    <p style="color:#444;line-height:1.8;margin:0 0 24px">
      Vous avez brillamment complété la formation <strong style="color:#7B3415">${courseTitleEsc}</strong>
      avec un score de <strong>${finalScore}%</strong>. Votre certificat de pratique professionnelle est disponible.
    </p>
    <div style="text-align:center;margin:32px 0">
      <a href="${certificatePageUrl}" style="background:#1A6B35;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block">📜 Voir mon certificat</a>
    </div>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-top:24px">
      <p style="color:#888;font-size:12px;margin:0 0 4px">Code de vérification</p>
      <p style="color:#7B3415;font-family:monospace;font-size:14px;font-weight:600;margin:0;letter-spacing:2px">${escapeHtml(verifyToken.slice(0, 16).toUpperCase())}</p>
      <p style="color:#aaa;font-size:11px;margin:4px 0 0">Utilisez ce code sur ${escapeHtml(verifyUrl)} pour authentifier ce certificat</p>
    </div>
  </div>
  <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #eee">
    <p style="color:#aaa;font-size:12px;margin:0">FlaugustLearn, Flaugust Business | Réflexion, Action, Impact</p>
  </div>
</div>
</body></html>`

      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'FlaugustLearn <onboarding@resend.dev>',
            to: [enrollment.student.email],
            subject: `🎓 Votre certificat : ${enrollment.course.title}`,
            html: emailHtml,
          }),
        })
        emailSent = emailRes.ok
      } catch {
        emailSent = false
      }

      if (emailSent) {
        await supabase
          .from('certificates')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', certificateId)
      }
    }

    await supabase
      .from('enrollments')
      .update({ status: 'complete', completed_at: new Date().toISOString(), progress_pct: 100 })
      .eq('id', enrollment_id)

    return new Response(
      JSON.stringify({ success: true, certificate_id: certificateId, pdf_url: certificatePageUrl, verify_token: verifyToken, email_sent: emailSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
