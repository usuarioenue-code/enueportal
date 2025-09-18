import nodemailer from 'nodemailer'

const {
  SMTP_HOST, SMTP_PORT=587, SMTP_USER, SMTP_PASS,
  EMAIL_FROM='ENUE <no-reply@enue.local>',
  EMAIL_REPLY_TO='no-reply@enue.local',
  INTERNAL_NOTIF_EMAIL=''
} = process.env

let transporter
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: Number(SMTP_PORT), secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  })
} else {
  // modo demo: log a consola
  transporter = {
    sendMail: async (opts) => {
      console.log('*** EMAIL DEMO ***', {to:opts.to, subject:opts.subject, attachments:(opts.attachments||[]).map(a=>a.filename)})
      return { messageId: 'dev-'+Date.now() }
    }
  }
}

export async function sendIncidentEmail({ to, incident, ccInternal }) {
  const html = `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
    <h2>ENUE · Confirmación de incidencia</h2>
    <p>Hemos recibido tu solicitud y la estamos gestionando.</p>
    <ul>
      <li><b>Descripción:</b> ${escapeHtml(incident.rawText)}</li>
      <li><b>Categoría:</b> ${incident.category}</li>
      <li><b>Prioridad:</b> ${incident.priority}</li>
      <li><b>Ubicación:</b> ${incident.locationText||'—'}</li>
      <li><b>Garantía:</b> ${incident.warrantyEligibility}</li>
    </ul>
  </div>`
  const attachments=[]
  if(Array.isArray(incident.images)){
    incident.images.slice(0,6).forEach((dataUrl,i)=>{
      const m=/^data:(.+);base64,(.*)$/.exec(dataUrl||'')
      if(m) attachments.push({ filename:`foto_${i+1}.${(m[1].split('/')[1]||'jpg')}`, content: Buffer.from(m[2],'base64'), contentType:m[1] })
    })
  }
  return transporter.sendMail({
    to, from: EMAIL_FROM, replyTo: EMAIL_REPLY_TO,
    subject: `ENUE · Incidencia registrada (${incident.id||'s/n'})`,
    html, attachments, ...(ccInternal && INTERNAL_NOTIF_EMAIL ? { bcc: INTERNAL_NOTIF_EMAIL } : {})
  })
}

export function ics({ uid, start, end, summary, description, location }) {
  const z = (n)=>String(n).padStart(2,'0')
  const toUTC = (d)=>`${d.getUTCFullYear()}${z(d.getUTCMonth()+1)}${z(d.getUTCDate())}T${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}Z`
  const s = new Date(start), e = new Date(end)
  return [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ENUE//Portal//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    `UID:${uid}`,`DTSTAMP:${toUTC(new Date())}`,`DTSTART:${toUTC(s)}`,`DTEND:${toUTC(e)}`,
    `SUMMARY:${summary}`,`DESCRIPTION:${(description||'').replace(/\n/g,'\\n')}`,`LOCATION:${location||''}`,
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n')
}
function escapeHtml(s=''){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }
