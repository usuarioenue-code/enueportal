import { sendIncidentEmail } from './_email'
import { customAlphabet } from 'nanoid'
const nanoid = customAlphabet('1234567890abcdef',10)

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).end()
  const { client, rawText, category, subcategory, chapter_code, priority, locationText, warrantyEligibility, images=[] } = req.body||{}
  if(!(client?.email && rawText && category && subcategory && chapter_code)) return res.status(400).json({error:'faltan campos'})
  const incident = { id: nanoid(), client, rawText, category, subcategory, chapter_code, priority, locationText, warrantyEligibility, images, created_at: new Date().toISOString() }
  try { await sendIncidentEmail({ to: client.email, incident, ccInternal: true }) } catch(e){ console.error('email incidente', e) }
  res.json({ incidentId: incident.id, emailSent: true })
}
