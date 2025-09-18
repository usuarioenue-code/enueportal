import nodemailer from 'nodemailer'
const { SMTP_HOST, SMTP_PORT=587, SMTP_USER, SMTP_PASS, EMAIL_FROM='ENUE <no-reply@enue.local>', EMAIL_REPLY_TO='no-reply@enue.local', INTERNAL_NOTIF_EMAIL='' } = process.env
let transporter
if (SMTP_HOST && SMTP_USER && SMTP_PASS) transporter = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT), secure:false, auth: {user:SMTP_USER, pass:SMTP_PASS}})
else transporter = { sendMail: async (o)=>{ console.log('*** EMAIL DEMO solicitud ***',o.subject); return {messageId:'dev'} } }

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).end()
  const { incidentId, kind } = req.body||{}
  if(!(incidentId && (kind==='llamada_responsable' || kind==='visita_responsable'))) return res.status(400).json({error:'datos inválidos'})
  await transporter.sendMail({
    to: req.body.to || undefined,
    from: EMAIL_FROM, replyTo: EMAIL_REPLY_TO,
    subject: `ENUE · Solicitud recibida (${incidentId})`,
    html: `<p>Hemos registrado tu solicitud: <b>${kind==='llamada_responsable'?'Llamada del responsable':'Visita del responsable'}</b>.</p>`,
    ...(INTERNAL_NOTIF_EMAIL ? { bcc: INTERNAL_NOTIF_EMAIL } : {})
  })
  res.json({ requestId:`r_${Date.now()}`, emailSent:true })
}
