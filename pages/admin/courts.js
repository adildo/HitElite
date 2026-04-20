import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

function Badge({ label, bg, color }) {
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:bg, color:color, fontWeight:500 }}>{label}</span>
}

export default function Courts() {
  var [reservations, setReservations] = useState([])
  var [locations, setLocations] = useState([])
  var [loading, setLoading] = useState(true)
  var [tab, setTab] = useState('all')
  var [showNew, setShowNew] = useState(false)
  var [saving, setSaving] = useState(false)
  var [form, setForm] = useState({ ref_type:'appointment', cost_amount:'', booked_by:'admin', booking_reference:'', location_id:'', cost_status:'estimated', notes:'' })
  var [sessions, setSessions] = useState([])
  var [appointments, setAppointments] = useState([])
  var [selectedRef, setSelectedRef] = useState('')

  useEffect(function(){ loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var [resR, locR, sessR, apptR] = await Promise.all([
      supabase.from('court_reservations').select('*, locations(name)').order('created_at',{ascending:false}).limit(50),
      supabase.from('locations').select('id,name').eq('is_active',true),
      supabase.from('class_sessions').select('id, starts_at, classes(name)').gte('starts_at', new Date().toISOString()).order('starts_at').limit(30),
      supabase.from('appointments').select('id, starts_at, profiles!appointments_customer_id_fkey(full_name), services(name)').gte('starts_at', new Date().toISOString()).order('starts_at').limit(30),
    ])
    setReservations(resR.data||[])
    setLocations(locR.data||[])
    setSessions(sessR.data||[])
    setAppointments(apptR.data||[])
    setLoading(false)
  }

  async function saveReservation() {
    if (!form.cost_amount || !selectedRef) return
    setSaving(true)
    await supabase.from('court_reservations').insert({
      ref_id: selectedRef, ref_type: form.ref_type,
      cost_amount: parseFloat(form.cost_amount),
      booked_by: form.booked_by, booking_reference: form.booking_reference||null,
      location_id: form.location_id||null, cost_status: form.cost_status, notes: form.notes||null
    })
    setSaving(false); setShowNew(false)
    setForm({ ref_type:'appointment', cost_amount:'', booked_by:'admin', booking_reference:'', location_id:'', cost_status:'estimated', notes:'' })
    setSelectedRef('')
    loadAll()
  }

  async function markConfirmed(id) {
    await supabase.from('court_reservations').update({ cost_status:'confirmed' }).eq('id', id)
    setReservations(function(p){ return p.map(function(r){ return r.id===id?{...r,cost_status:'confirmed'}:r }) })
  }

  var filtered = tab === 'all' ? reservations : reservations.filter(function(r){ return r.cost_status === tab })
  var totalCost = reservations.reduce(function(s,r){ return s+parseFloat(r.cost_amount||0) }, 0)
  var confirmedCost = reservations.filter(function(r){return r.cost_status==='confirmed'}).reduce(function(s,r){ return s+parseFloat(r.cost_amount||0) }, 0)

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', fontFamily:'inherit', width:'100%' }

  function tabStyle(t) {
    return { padding:'7px 16px', borderRadius:'8px', fontSize:'12px', cursor:'pointer', border:'none', background:tab===t?'#D4A843':'transparent', color:tab===t?'#0D0D0D':'#666', fontFamily:'inherit', fontWeight:tab===t?600:400 }
  }

  return (
    <AdminLayout active="locations">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Court reservations</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Track court costs per session for accurate P&L reporting</div>
          </div>
          <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ Add court cost</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.25rem' }}>
          {[
            ['Total court costs', '$'+totalCost.toFixed(2), '#A32D2D'],
            ['Confirmed', '$'+confirmedCost.toFixed(2), '#D4A843'],
            ['Estimated pending', '$'+(totalCost-confirmedCost).toFixed(2), '#BA7517'],
            ['Reservations logged', reservations.length.toString(), '#185FA5'],
          ].map(function(m,i){
            return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'14px' }}>
              <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div>
              <div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{m[1]}</div>
            </div>
          })}
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Log court reservation cost</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Link to</div>
                <select style={sel} value={form.ref_type} onChange={function(e){setForm(function(p){return{...p,ref_type:e.target.value}});setSelectedRef('')}}>
                  <option value="appointment">Appointment</option>
                  <option value="session">Class session</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>{form.ref_type === 'appointment' ? 'Select appointment' : 'Select class session'}</div>
                <select style={sel} value={selectedRef} onChange={function(e){setSelectedRef(e.target.value)}}>
                  <option value="">Select...</option>
                  {form.ref_type === 'appointment' && appointments.map(function(a){
                    var cust = a.profiles?a.profiles.full_name:'Unknown'
                    var svc = a.services?a.services.name:'Appointment'
                    var date = new Date(a.starts_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})
                    return <option key={a.id} value={a.id}>{cust} — {svc} ({date})</option>
                  })}
                  {form.ref_type === 'session' && sessions.map(function(s){
                    var cls = s.classes?s.classes.name:'Class'
                    var date = new Date(s.starts_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})
                    return <option key={s.id} value={s.id}>{cls} — {date}</option>
                  })}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Court cost ($)</div>
                <input type="number" style={inp} value={form.cost_amount} onChange={function(e){setForm(function(p){return{...p,cost_amount:e.target.value}})}} placeholder="e.g. 25.00" />
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Location</div>
                <select style={sel} value={form.location_id} onChange={function(e){setForm(function(p){return{...p,location_id:e.target.value}})}}>
                  <option value="">Select location...</option>
                  {locations.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>})}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Booked by</div>
                <select style={sel} value={form.booked_by} onChange={function(e){setForm(function(p){return{...p,booked_by:e.target.value}})}}>
                  <option value="admin">Admin</option>
                  <option value="coach">Coach</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Status</div>
                <select style={sel} value={form.cost_status} onChange={function(e){setForm(function(p){return{...p,cost_status:e.target.value}})}}>
                  <option value="estimated">Estimated</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Booking reference (optional)</div>
                <input type="text" style={inp} value={form.booking_reference} onChange={function(e){setForm(function(p){return{...p,booking_reference:e.target.value}})}} placeholder="e.g. PKRS-2847" />
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Notes (optional)</div>
                <input type="text" style={inp} value={form.notes} onChange={function(e){setForm(function(p){return{...p,notes:e.target.value}})}} placeholder="e.g. Booked via city parks portal, 2hr slot" />
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveReservation} disabled={saving||!form.cost_amount||!selectedRef}>{saving?'Saving...':'Save reservation'}</button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:'4px', background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'10px', padding:'4px', width:'fit-content', marginBottom:'1.25rem' }}>
          {[['all','All'],['estimated','Estimated'],['confirmed','Confirmed']].map(function(t){
            return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0])}}>{t[1]}</button>
          })}
        </div>

        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
          {loading && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding:'3rem', textAlign:'center', color:'#888' }}>
              <div style={{ fontSize:'28px', marginBottom:'12px' }}>🎾</div>
              <div style={{ fontWeight:600, marginBottom:'6px' }}>No court reservations logged</div>
              <div style={{ fontSize:'13px', marginBottom:'1.25rem' }}>Track court costs per session to see accurate P&L reports for each coach and class.</div>
              <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Log first court cost</button>
            </div>
          )}
          {filtered.length > 0 && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Session / Appointment','Location','Cost','Booked by','Ref #','Status',''].map(function(h,i){
                  return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th>
                })}
              </tr></thead>
              <tbody>
                {filtered.map(function(r,i){
                  var loc = r.locations ? r.locations.name : '—'
                  var sc = r.cost_status==='confirmed' ? ['#E1F5EE','#0F6E56'] : ['#FAEEDA','#854F0B']
                  return (
                    <tr key={r.id} style={{ borderBottom:i<filtered.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ fontWeight:500 }}>{r.ref_type==='session'?'Class session':'Appointment'}</div>
                        <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>{r.notes||r.ref_type}</div>
                      </td>
                      <td style={{ padding:'10px 14px', color:'#666' }}>{loc}</td>
                      <td style={{ padding:'10px 14px', fontWeight:700, color:'#A32D2D', fontSize:'15px' }}>${parseFloat(r.cost_amount||0).toFixed(2)}</td>
                      <td style={{ padding:'10px 14px', color:'#666' }}>{r.booked_by}</td>
                      <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{r.booking_reference||'—'}</td>
                      <td style={{ padding:'10px 14px' }}><Badge label={r.cost_status} bg={sc[0]} color={sc[1]} /></td>
                      <td style={{ padding:'10px 14px' }}>
                        {r.cost_status === 'estimated' && (
                          <button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#0F6E56' }} onClick={function(){markConfirmed(r.id)}}>Confirm</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* P&L insight box */}
        <div style={{ marginTop:'1.25rem', background:'#0D0D0D', border:'0.5px solid rgba(212,168,67,0.2)', borderRadius:'12px', padding:'1.25rem', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
          {[['Total court costs','$'+totalCost.toFixed(2),'#A32D2D'],['Estimated pending','$'+(totalCost-confirmedCost).toFixed(2),'#BA7517'],['Confirmed & paid','$'+confirmedCost.toFixed(2),'#1D9E75']].map(function(m,i){
            return <div key={i} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{m[0]}</div>
              <div style={{ fontSize:'24px', fontWeight:800, color:m[2] }}>{m[1]}</div>
            </div>
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
