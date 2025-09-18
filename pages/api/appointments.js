import { ics } from './_email'
import nodemailer from 'nodemailer'

const { SMTP_HOST, SMTP_PORT=587, SMTP_USER, SMTP_PASS, EMAIL_FROM='ENUE <no-reply@enue.local>', EMAIL_REPLY_TO='no-reply@enue.local', INTERNAL_NOTIF_EMAIL='' } = process.env
let transporter
if (SMTP_HOST && SMTP_USER && SMTP_PASS) transporter = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT), secure:false, auth: {user:SMTP_USER, pass:SMTP_PASS}})
else transporter = { sendMail: async (o)=>{ console.log('*** EMAIL DEMO cita ***',o.subject); return {messageId:'dev'} } }

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).end()
  const { incidentId, technicianId, start, end } = req.body||{}
  if(!(incidentId && technicianId && start && end)) return res.status(400).json({error:'faltan campos'})
  const file = ics({ uid:`enue-${incidentId}-${Date.now()}`, start, end, summary:'ENUE · Visita de garantía', description:`Cita confirmada (Incidencia ${incidentId})`, location:'Valencia (zona centro)' })
  await transporter.sendMail({
    to: req.body.to || undefined, // opcional: no lo usamos porque cogemos el email del cliente en el primer correo; la demo envía sólo confirmación
    from: EMAIL_FROM, replyTo: EMAIL_REPLY_TO, subject: `ENUE · Cita confirmada (${incidentId})`,
    html: `<p>Adjuntamos un archivo .ics con la cita.</p><p><b>Inicio:</b> ${new Date(start).toLocaleString()}<br/><b>Fin:</b> ${new Date(end).toLocaleString()}</p>`,
    attachments: [{ filename:'cita-enue.ics', content: file, contentType:'text/calendar' }],
    ...(INTERNAL_NOTIF_EMAIL ? { bcc: INTERNAL_NOTIF_EMAIL } : {})
  })
  res.json({ appointmentId:`a_${Date.now()}`, emailSent:true })
}
