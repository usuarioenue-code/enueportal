export default function handler(req,res){
  if(req.method!=='POST') return res.status(405).end()
  const { text='', images=[] } = req.body || {}
  const urgent = /(fuga|inund|olor a gas|cortocircuito|chispas|humareda)/i.test(text)
  const rules = [
    { rx: /(cisterna|fuga|grifo|sif[oó]n|desag[üu]e|inodoro|wc)/i, cat:'fontaneria', sub:'fontaneria_general', chap:'009', dur:60 },
    { rx: /(mampara|plato ducha)/i, cat:'fontaneria', sub:'equip_bano', chap:'012', dur:60 },
    { rx: /(enchufe|diferencial|corto|luminaria|interruptor|bombilla|cable|l[uú]z)/i, cat:'electricidad', sub:'electricidad_general', chap:'008', dur:60 },
    { rx: /(aire|split|termostato|acs|caldera|bomba de calor)/i, cat:'clima', sub:'clima', chap:'010', dur:90 },
    { rx: /(ventila(ción|cion)|rejilla|conducto)/i, cat:'ventilacion', sub:'ventilacion', chap:'011', dur:60 },
    { rx: /(puerta|bisagra|cerradura|rodapi[eé]|armario)/i, cat:'carpinteria', sub:'carpinteria_interior', chap:'006', dur:60 },
    { rx: /(ventana|persiana|reja|cerramiento|balc[oó]n)/i, cat:'carpinteria', sub:'carpinteria_exterior', chap:'007', dur:60 },
    { rx: /(pintura|mancha|desconchado|grieta|pared)/i, cat:'pintura', sub:'revestimientos', chap:'005', dur:90 },
    { rx: /(tabique|roza|yeso|alicatado|ladrillo|mortero)/i, cat:'albanileria', sub:'albanileria', chap:'003', dur:90 },
    { rx: /(encimera|mueble cocina|lavadero|campana)/i, cat:'otros', sub:'cocina', chap:'013', dur:60 },
  ]
  let out = {
    category:'otros', subcategory:'general', chapter_code:'003', durationMin:60,
    priority: urgent ? 'urgente' : 'estandar',
    locationText: (text.match(/(baño|aseo|cocina|sal[óo]n|habita[cç]i[óo]n|terraza|pasillo)/i)?.[1] ?? null),
    warrantyEligibility: /(golpe|mal uso|romp[ií]|tir[ée])/i.test(text) ? 'out' : 'in',
    imagesCount: Array.isArray(images)?images.length:0
  }
  for(const r of rules){ if(r.rx.test(text)){ out={...out, category:r.cat, subcategory:r.sub, chapter_code:r.chap, durationMin:r.dur}; break } }
  const missing=[]
  if(!out.locationText) missing.push('¿En qué estancia exacta ocurre (baño principal, cocina, etc.)?')
  if(out.category==='fontaneria' && /fuga|cisterna|desag[üu]e/i.test(text)) missing.push('¿Puedes cerrar la llave de paso si hay fuga?')
  if(out.category==='electricidad' && /corto|diferencial|chispas/i.test(text)) missing.push('¿Salta el diferencial o solo ese circuito?')
  res.json({ ...out, missing })
}
