const TECHS = {
  fontaneria: [{ id:'t_f1', name:'Fontanero 1' }],
  electricidad: [{ id:'t_e1', name:'Electricista 1' },{ id:'t_e2', name:'Electricista 2' }],
  carpinteria: [{ id:'t_c1', name:'Carpintero 1' }],
  clima: [{ id:'t_cl1', name:'Técnico Clima 1' }],
  ventilacion: [{ id:'t_v1', name:'Ventilación 1' }],
  pintura: [{ id:'t_p1', name:'Pintor 1' },{ id:'t_p2', name:'Pintor 2' }],
  albanileria: [{ id:'t_a1', name:'Oficial Albañil 1' }],
  otros: [{ id:'t_o1', name:'Técnico 1' }],
}

export default function handler(req,res){
  if(req.method!=='GET') return res.status(405).end()
  const { trade='otros', durationMin='60' } = req.query
  const dur = parseInt(durationMin,10)||60
  const base = new Date(); if(base.getHours()>17) base.setDate(base.getDate()+1); base.setHours(9,0,0,0)
  const slots=[], techs=TECHS[trade]||TECHS.otros
  for(let d=0; d<7; d++){
    for(const h of [9,11,13,16]){
      const start = new Date(base); start.setDate(base.getDate()+d); start.setHours(h,0,0,0)
      if([0,6].includes(start.getDay())) continue
      const end = new Date(start.getTime()+dur*60*1000)
      const t = techs[(d+h)%techs.length]
      slots.push({ start:start.toISOString(), end:end.toISOString(), technicianId:t.id, technicianName:t.name })
    }
  }
  res.json(slots.slice(0,18))
}
