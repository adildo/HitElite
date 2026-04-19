import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
var FREQ_LABELS = { weekly:'Weekly', biweekly:'Every 2 weeks', monthly:'Monthly' }

export default function Recurring() {
  var [recurring, setRecurring] = useState([])
  var [services, setServices] = useState([])
  var [coaches, setCoaches] = useState([])
  var [customers, setCustomers] = useState([])
  var [loading, setLoading] = useState(true)
  var [showNew, setShowNew] = useState(false)
  var [saving, setSaving] = useState(false)
  var [form, setForm] = useState({ customer_id:'', service_id:'', coach_id:'', frequency:'weekly', day_of_week:'1', start_time:'10:00', starts_on:'', ends_on:'', max_occurrences:'', notes:'' })

  useEffect(function(){
    async function load(){
      var [recR, svcR, coachR, custR] = await Promise.all([
        supabase.from('recurring_appointments').select('*, profiles!recurring_appointments_customer_id_fkey(full_name), profiles!recurring_appointments_coach_id_fkey(full_name) , services(name)').order('created_at',{ascending:false}),
        supabase.from('services').select('id,name').eq('is_active',true).eq('visibility','public'),
        supabase.from('profiles').select('id,full_name').in('role',['coach']).eq('is_active',true),
        supabase.from('profiles').select('id,full_name,email').eq('role','customer').eq('is_active',true).order('full_name').limit(200),
      ])
      setRecurring(recR.data||[])
      setServices(svcR.data||[])
      setCoaches(coachR.data||[])
      setCustomers(custR.data||[])
      setLoading(false)
    }
    load()
  },[])

  function setField(k,v){ setForm(function(p){var n={...p};n[k]=v;return n}) }

  async function saveRecurring(){
    setSaving(true)
    await supabase.from('recurring_appointments').insert({
      customer_id:form.customer_id, service_id:form.service_id, coach_id:form.coach_id||null,
      frequency:form.frequency, day_of_week:parseInt(form.day_of_week), start_time:form.start_time,
      starts_on:form.starts_on, ends_on:form.ends_on||null,
      max_occurrences:parseInt(form.max_occurrences)||null, notes:form.notes, status:'active'
    })
    setSaving(false); setShowNew(false)
    var r = await supabase.from('recurring_appointments').select('*, profiles!recurring_appointments_customer_id_fkey(full_name), services(name)').order('created_at',{ascending:false})
    setRecurring(r.data||[])
  }

  async function updateStatus(id, status){
    await supabase.from('recurring_appointments').update({status}).eq('id',id)
    setRecurring(function(p){return p.map(function(r){return r.id===id?{...r,status}:r})})
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  var TIMES = []
  for (var h=6;h<=21;h++){TIMES.push((h<10?'0'+h:h)+':00');TIMES.push((h<10?'0'+h:h)+':30')}

  var statusColors = { active:['#E1F5EE','#0F6E56'], paused:['#FAEEDA','#854F0B'], cancelled:['#F1EFE8','#5F5E5A'] }

  return (
    <AdminLayout active="appointments">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Recurring appointments</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Manage standing weekly or biweekly lesson schedules</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <a href="/admin/appointments" style={{ ...btn, textDecoration:'none' }}>← Back to appointments</a>
            <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ New recurring</button>
          </div>
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Set up recurring appointment</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Customer</div>
                <select style={inp} value={form.customer_id} onChange={function(e){setField('customer_id',e.target.value)}}>
                  <option value="">Select customer...</option>
                  {customers.map(function(c){ return <option key={c.id} value={c.id}>{c.full_name} — {c.email}</option> })}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Service</div>
                <select style={inp} value={form.service_id} onChange={function(e){setField('service_id',e.target.value)}}>
                  <option value="">Select service...</option>
                  {services.map(function(s){ return <option key={s.id} value={s.id}>{s.name}</option> })}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Coach</div>
                <select style={inp} value={form.coach_id} onChange={function(e){setField('coach_id',e.target.value)}}>
                  <option value="">Any available coach</option>
                  {coaches.map(function(c){ return <option key={c.id} value={c.id}>{c.full_name}</option> })}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Frequency</div>
                <select style={inp} value={form.frequency} onChange={function(e){setField('frequency',e.target.value)}}>
                  <option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option>
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Day of week</div>
                <select style={inp} value={form.day_of_week} onChange={function(e){setField('day_of_week',e.target.value)}}>
                  {DAYS.map(function(d,i){ return <option key={i} value={i}>{d}</option> })}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Start time</div>
                <select style={inp} value={form.start_time} onChange={function(e){setField('start_time',e.target.value)}}>
                  {TIMES.map(function(t){ return <option key={t} value={t}>{t}</option> })}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Starting from</div>
                <input type="date" style={inp} value={form.starts_on} onChange={function(e){setField('starts_on',e.target.value)}} />
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Ending on (optional)</div>
                <input type="date" style={inp} value={form.ends_on} onChange={function(e){setField('ends_on',e.target.value)}} />
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Max occurrences (optional)</div>
                <input type="number" style={inp} value={form.max_occurrences} onChange={function(e){setField('max_occurrences',e.target.value)}} placeholder="e.g. 12" />
              </div>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Notes</div>
                <textarea style={{ ...inp, resize:'none', height:'60px' }} value={form.notes} onChange={function(e){setField('notes',e.target.value)}} placeholder="Any notes about this recurring schedule..." />
              </div>
            </div>
            <div style={{ background:'#F5E6C0', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#8B6914', marginBottom:'12px' }}>
              ℹ️ Saving this will create a recurring rule. Individual appointments will be booked automatically each {form.frequency==='weekly'?'week':form.frequency==='biweekly'?'2 weeks':'month'} on {DAYS[parseInt(form.day_of_week)]} at {form.start_time}.
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveRecurring} disabled={saving||!form.customer_id||!form.service_id||!form.starts_on}>{saving?'Saving...':'Save recurring schedule'}</button>
            </div>
          </div>
        )}

        {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}

        {!loading && recurring.length === 0 && !showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'14px' }}>🔄</div>
            <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>No recurring appointments</div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Set up weekly or biweekly standing lesson schedules for your regular customers.</div>
            <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Set up first recurring schedule</button>
          </div>
        )}

        <div style={{ display:'grid', gap:'10px' }}>
          {recurring.map(function(r) {
            var customer = r.profiles ? r.profiles.full_name : '—'
            var service = r.services ? r.services.name : '—'
            var sc = statusColors[r.status]||statusColors.active
            return (
              <div key={r.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ fontSize:'22px' }}>🔄</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                    <div style={{ fontSize:'14px', fontWeight:600 }}>{customer}</div>
                    <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize:'12px', color:'#888', display:'flex', gap:'14px', flexWrap:'wrap' }}>
                    <span>🎾 {service}</span>
                    <span>📅 {FREQ_LABELS[r.frequency]} on {DAYS[r.day_of_week]}s at {r.start_time}</span>
                    <span>▶ From {r.starts_on}</span>
                    {r.ends_on && <span>⏹ Until {r.ends_on}</span>}
                    <span>✓ {r.occurrences_booked} booked</span>
                  </div>
                  {r.notes && <div style={{ fontSize:'12px', color:'#aaa', marginTop:'4px' }}>{r.notes}</div>}
                </div>
                <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                  {r.status==='active' && <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:'#BA7517' }} onClick={function(){updateStatus(r.id,'paused')}}>Pause</button>}
                  {r.status==='paused' && <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:'#0F6E56' }} onClick={function(){updateStatus(r.id,'active')}}>Resume</button>}
                  <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:'#A32D2D' }} onClick={function(){updateStatus(r.id,'cancelled')}}>Cancel</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
