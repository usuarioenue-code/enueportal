import React, { useState } from 'react'

const pretty = (c)=>({carpinteria:'Carpintería',fontaneria:'Fontanería',clima:'Climatización',electricidad:'Electricidad',pintura:'Pintura',albanileria:'Albañilería',ventilacion:'Ventilación',otros:'Otros'})[c]||c
const emailOk = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v||'')
const phoneOk = v => /^[0-9\s+()\-]{7,}$/.test(v||'')

export default function Home(){
  const [text,setText]=useState('')
  const [files,setFiles]=useState([])
  const [triage,setTriage]=useState(null)
  const [contact,setContact]=useState({name:'',email:'',phone:''})
  const [consent,setConsent]=useState(false)
  const [service,setService]=useState('cita') // cita | llamada_responsable | visita_responsable
  const [availability,setAvailability]=useState([])
  const [slot,setSlot]=useState(null)
  const [stage,setStage]=useState('chat') // chat | review | schedule | done
  const [msg,setMsg]=useState('')

  const onFiles = e => setFiles(Array.from(e.target.files||[]).slice(0,6))
  const toB64 = f => new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(f) })

  async function handleSend(){
    if(!text && files.length===0) return
    setMsg('Procesando…')
    const images = await Promise.all(files.map(toB64))
    const r = await fetch('/api/triage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,images})})
    if(!r.ok){ setMsg('Error en triage'); return }
    const data = await r.json()
    setTriage({...data, rawText:text, images})
    setStage('review'); setMsg('')
  }

  async function loadAvailability(){
    if(service!=='cita'){ setStage('done'); return }
    setMsg('Cargando disponibilidad…')
    const r = await fetch(`/api/availability?trade=${triage.category}&durationMin=${triage.durationMin}`)
    const data = await r.json()
    setAvailability(data); setStage('schedule'); setMsg('')
  }

  async function confirm(){
    setMsg('Registrando y enviando emails…')
    // 1) Incidencia (email a cliente + BCC interno)
    const incRes = await fetch('/api/incidents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      client:contact,
      rawText:triage.rawText, category:triage.category, subcategory:triage.subcategory,
      chapter_code:triage.chapter_code, priority:triage.priority, locationText:triage.locationText,
      warrantyEligibility:triage.warrantyEligibility, images:triage.images||[]
    })})
    if(!incRes.ok){ setMsg('No se pudo crear la incidencia'); return }
    const inc = await incRes.json()
    // 2) Según servicio
    if(service==='cita'){
      if(!slot){ setMsg('Elige un hueco'); return }
      const appRes = await fetch('/api/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        incidentId: inc.incidentId, technicianId: slot.technicianId, start: slot.start, end: slot.end
      })})
      if(!appRes.ok){ setMsg('No se pudo reservar la cita'); return }
    } else {
      await fetch('/api/manager-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        incidentId: inc.incidentId, kind: service
      })})
    }
    setStage('done'); setMsg('Listo. Revisa tu email.')
  }

  return (
  <div className="max-w-4xl mx-auto p-6">
    <h1 className="text-2xl font-semibold">ENUE · Portal de Incidencias</h1>
    <p className="text-slate-600">Describe tu problema y elige cómo quieres que actuemos.</p>

    {stage==='chat' && (
      <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <textarea value={text} onChange={e=>setText(e.target.value)}
          className="w-full border rounded-xl p-3" rows={4}
          placeholder="Ej: Me gotea la cisterna del baño desde hace 2 días…" />
        <div className="mt-3 flex items-center gap-3">
          <input type="file" accept="image/*" multiple onChange={onFiles} />
          <span className="text-xs text-slate-500">{files.length} foto(s) (máx. 6)</span>
        </div>
        <div className="mt-3">
          <button onClick={handleSend} className="px-4 py-2 rounded-xl bg-blue-600 text-white" >Continuar</button>
        </div>
        {msg && <p className="mt-2 text-sm text-slate-600">{msg}</p>}
      </div>
    )}

    {stage==='review' && triage && (
      <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Revisa tu solicitud</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Info label="Categoría" value={pretty(triage.category)} />
          <Info label="Subcategoría" value={triage.subcategory} />
          <Info label="Prioridad" value={triage.priority==='urgente'?'Urgente (<48h)':'Estándar'} />
          <Info label="Duración estimada" value={`${triage.durationMin} min`} />
          <Info label="Ubicación" value={triage.locationText || '—'} />
          <Info label="Garantía" value={triage.warrantyEligibility==='in'?'Probablemente entra':'Fuera/Dudosa'} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Nombre" value={contact.name} onChange={v=>setContact({...contact,name:v})} />
          <Input label="Email" value={contact.email} onChange={v=>setContact({...contact,email:v})} />
          <Input label="Teléfono" value={contact.phone} onChange={v=>setContact({...contact,phone:v})} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border rounded-xl p-3">
            <div className="text-xs uppercase text-slate-500">Cómo actuamos</div>
            <select value={service} onChange={e=>setService(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">
              <option value="cita">Reservar una cita con técnico</option>
              <option value="llamada_responsable">Que me llame el responsable</option>
              <option value="visita_responsable">Solicitar visita del responsable</option>
            </select>
          </div>
          <label className="border rounded-xl p-3 flex items-start gap-2">
            <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1" />
            <span className="text-sm">Acepto el tratamiento de mis datos para gestionar la incidencia conforme a la política de privacidad de ENUE.</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={()=>setStage('chat')} className="px-4 py-2 rounded-xl border">Volver</button>
          <button onClick={loadAvailability}
            disabled={!contact.name || !emailOk(contact.email) || !phoneOk(contact.phone) || !consent}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40">
            {service==='cita'?'Elegir fecha y hora':'Enviar solicitud'}
          </button>
        </div>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </div>
    )}

    {stage==='schedule' && (
      <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Elige fecha y hora</h2>
        {availability.length===0
          ? <p className="text-sm text-amber-700">No hay disponibilidad en los próximos días.</p>
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {availability.map((s,i)=>
                <button key={i} onClick={()=>setSlot(s)}
                  className={`text-left rounded-xl border p-3 ${slot===s?'ring-2 ring-blue-600':''}`}>
                  <div className="font-medium">{new Date(s.start).toLocaleDateString()}</div>
                  <div className="text-slate-600 text-sm">
                    {new Date(s.start).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}–
                    {new Date(s.end).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                  </div>
                  <div className="text-xs text-slate-500">{s.technicianName}</div>
                </button>
              )}
            </div>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={()=>setStage('review')} className="px-4 py-2 rounded-xl border">Volver</button>
          <button onClick={confirm} disabled={!slot} className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40">Confirmar cita</button>
        </div>
        {msg && <p className="text-sm text-slate-600 mt-2">{msg}</p>}
      </div>
    )}

    {stage==='done' && (
      <div className="mt-4 bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold">¡Solicitud registrada! ✅</h2>
        <p className="text-slate-700">Hemos enviado un email con el resumen. Si reservaste cita, tienes un .ics adjunto para tu calendario.</p>
      </div>
    )}
  </div>
  )
}

function Info({label,value}){ return (<div className="border rounded-xl p-3"><div className="text-xs uppercase text-slate-500">{label}</div><div className="mt-1">{value}</div></div>) }
function Input({label,value,onChange}){ return (<div className="border rounded-xl p-3"><div className="text-xs uppercase text-slate-500">{label}</div><input className="mt-1 w-full border rounded-lg px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} /></div>) }
