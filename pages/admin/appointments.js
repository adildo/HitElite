import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
var FREQ_LABELS = { weekly:'Weekly', biweekly:'Every 2 weeks', monthly:'Monthly' }

function Badge({ type }) {
  var s = { pending:['#FAEEDA','#854F0B'], confirmed:['#E1F5EE','#0F6E56'], completed:['#F1EFE8','#5F5E5A'], cancelled:['#FCEBEB','#A32D2D'], waiting:['#EEEDFE','#534AB7'], active:['#E1F5EE','#0F6E56'], paused:['#FAEEDA','#854F0B'] }
  var c = s[type] || s.pending
  return <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'6px', fontSize:'11px', background:c[0], color:c[1], fontWeight:500 }}>{type}</span>
}

export default function Appointments() {
  var [tab, setTab] = useState('reservations')
  var [appointments, setAppointments] = useState([])
  var [waitlist, setWaitlist] = useState([])
  var [recurring, setRecurring] = useState([])
  var [services, setServices] = useState([])
  var [coaches, setCoaches] = useState([])
  var [customers, setCustomers] = useState([])
  var [loading, setLoading] = useState(true)
  var [showCancelled, setShowCancelled] = useState(false)
  var [qf, setQf] = useState('all')
  // Recurring form
  var [showNewRecurring, setShowNewRecurring] = useState(false)
  var [rForm, setRForm] = useState({ customer_id:'', service_id:'', coach_id:'', frequency:'weekly', day_of_week:'1', start_time:'10:00', starts_on:'', ends_on:'', max_occurrences:'', notes:'' })
  var [saving, setSaving] = useState(false)

  useEffect(function() { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var [apptR, wlR, recR, svcR, coachR, custR] = await Promise.all([
      supabase.from('appointments').select('*, profiles!appointments_customer_id_fkey(full_name,email), services(name,color), locations(name)').order('starts_at',{ascending:false}).limit(50),
      supabase.from('waitlist').select('*, profiles!waitlist_customer_id_fkey(full_name,email)').eq('status','waiting').order('created_at'),
      supabase.from('recurring_appointments').select('*, profiles!recurring_appointments_customer_id_fkey(full_name), services(name)').order('created_at',{ascending:false}),
      supabase.from('services').select('id,name').eq('is_active',true),
      supabase.from('profiles').select('id,full_name').in('role',['coach']).eq('is_active',true),
      supabase.from('profiles').select('id,full_name,email').eq('role','customer').eq('is_active',true).order('full_name').limit(200),
    ])
    setAppointments(apptR.data||[])
    setWaitlist(wlR.data||[])
    setRecurring(recR.data||[])
    setServices(svcR.data||[])
    setCoaches(coachR.data||[])
    setCustomers(custR.data||[])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('appointments').update({status}).eq('id',id)
    setAppointments(function(prev){ return prev.map(function(a){ return a.id===id?{...a,status}:a }) })
  }

  async function updateRecurringStatus(id, status) {
    await supabase.from('recurring_appointments').update({status}).eq('id',id)
    setRecurring(function(prev){ return prev.map(function(r){ return r.id===id?{...r,status}:r }) })
  }

  async function convertWaitlist(id) {
    await supabase.from('waitlist').update({status:'converted'}).eq('id',id)
    setWaitlist(function(prev){ return prev.filter(function(w){ return w.id!==id }) })
  }

  function setRField(k,v){ setRForm(function(p){var n={...p};n[k]=v;return n}) }

  async function saveRecurring() {
    setSaving(true)
    await supabase.from('recurring_appointments').insert({
      customer_id:rForm.customer_id, service_id:rForm.service_id, coach_id:rForm.coach_id||null,
      frequency:rForm.frequency, day_of_week:parseInt(rForm.day_of_week), start_time:rForm.start_time,
      starts_on:rForm.starts_on, ends_on:rForm.ends_on||null,
      max_occurrences:parseInt(rForm.max_occurrences)||null, notes:rForm.notes, status:'active'
    })
    setSaving(false); setShowNewRecurring(false)
    setRForm({ customer_id:'', service_id:'', coach_id:'', frequency:'weekly', day_of_week:'1', start_time:'10:00', starts_on:'', ends_on:'', max_occurrences:'', notes:'' })
    loadAll()
  }

  var TIMES = []
  for (var h=6;h<=21;h++){TIMES.push((h<10?'0'+h:h)+':00');TIMES.push((h<10?'0'+h:h)+':30')}

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var btnSm = { padding:'5px 10px', fontSize:'12px', borderRadius:'8px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', fontFamily:'inherit', color:'#1a1a1a' }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { padding:'7px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', fontFamily:'inherit' }

  function tabStyle(t) {
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px', whiteSpace:'nowrap' }
  }

  var filteredRes = appointments.filter(function(a) {
    if (!showCancelled && a.status==='cancelled') return false
    if (qf==='upcoming') return new Date(a.starts_at)>=new Date()
    if (qf==='past') return new Date(a.starts_at)<new Date()
    return true
  })
  var pendingReqs = appointments.filter(function(a){ return a.status==='pending' })
  var confirmedReqs = appointments.filter(function(a){ return a.status==='confirmed' })
  var declinedReqs = appointments.filter(function(a){ return a.status==='cancelled' })
  var activeRecurring = recurring.filter(function(r){ return r.status==='active' })

  return (
    <AdminLayout active="appointments">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Appointments</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Manage sessions, requests, recurring schedules</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {tab==='recurring' && <button style={btnGold} onClick={function(){setShowNewRecurring(function(x){return !x})}}>+ New recurring</button>}
            {tab!=='recurring' && <button style={btnGold}>+ New appointment</button>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.25rem' }}>
          {[
            ['Today\'s sessions', appointments.filter(function(a){return new Date(a.starts_at).toDateString()===new Date().toDateString()}).length, '#D4A843'],
            ['Upcoming', appointments.filter(function(a){return new Date(a.starts_at)>=new Date()&&a.status!=='cancelled'}).length, '#185FA5'],
            ['Pending requests', pendingReqs.length, '#BA7517'],
            ['Recurring schedules', activeRecurring.length, '#534AB7'],
          ].map(function(m,i){
            return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'12px' }}>
              <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div>
              <div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{m[1]}</div>
            </div>
          })}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem', overflowX:'auto' }}>
          {[['reservations','✅ Reservations'],['requests','📋 Requests'],['waitlist','⏳ Waitlist'],['recurring','🔄 Recurring'],['services','🔧 Services']].map(function(t){
            return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0])}}>{t[1]}</button>
          })}
        </div>

        {/* ===== RESERVATIONS ===== */}
        {tab==='reservations' && (
          <div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'1rem' }}>
              <select style={sel}><option>All coaches</option>{coaches.map(function(c){return <option key={c.id}>{c.full_name}</option>})}</select>
              <select style={sel}><option>All payments</option><option>Paid</option><option>Unpaid</option></select>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#888' }}>
                Show cancelled
                <div onClick={function(){setShowCancelled(function(v){return !v})}} style={{ width:'34px', height:'18px', borderRadius:'9px', background:showCancelled?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', transition:'background .15s' }}>
                  <div style={{ position:'absolute', width:'14px', height:'14px', borderRadius:'50%', background:'#fff', top:'2px', right:showCancelled?'2px':'18px', transition:'right .15s' }}></div>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'6px', marginBottom:'1rem' }}>
              {['all','upcoming','past'].map(function(f){
                return <button key={f} onClick={function(){setQf(f)}} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', cursor:'pointer', border:'0.5px solid '+(qf===f?'#D4A843':'rgba(0,0,0,0.15)'), background:qf===f?'#D4A843':'transparent', color:qf===f?'#0D0D0D':'#666', fontFamily:'inherit', fontWeight:qf===f?600:400 }}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              })}
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#f9f9f7' }}>
                  {['Customer','Service','Date & time','Status','Amount',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>{h}</th>})}
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                  {!loading && filteredRes.length===0 && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No appointments found</td></tr>}
                  {filteredRes.map(function(a,i) {
                    var cust = a.profiles?a.profiles.full_name:'—'
                    var svc = a.services?a.services.name:'—'
                    var date = new Date(a.starts_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})
                    var time = new Date(a.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
                    return (
                      <tr key={a.id} style={{ opacity:a.status==='cancelled'?0.55:1, borderBottom:i<filteredRes.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                        <td style={{ padding:'10px 14px', fontWeight:500 }}>{cust}</td>
                        <td style={{ padding:'10px 14px', color:'#666' }}>{svc}</td>
                        <td style={{ padding:'10px 14px', color:'#666', whiteSpace:'nowrap' }}>{date} · {time}</td>
                        <td style={{ padding:'10px 14px' }}><Badge type={a.status} /></td>
                        <td style={{ padding:'10px 14px', fontWeight:600, color:a.payment_status==='paid'?'#1D9E75':'#BA7517' }}>${parseFloat(a.total_amount||0).toFixed(2)}</td>
                        <td style={{ padding:'10px 14px' }}><button style={btnSm}>View</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== REQUESTS ===== */}
        {tab==='requests' && (
          <div style={{ display:'grid', gap:'1rem' }}>
            {[['Pending approval', pendingReqs, true],['Approved', confirmedReqs, false],['Declined', declinedReqs, false]].map(function(group) {
              var label=group[0]; var items=group[1]; var showActions=group[2]
              var labelColors = { 'Pending approval':['#FAEEDA','#854F0B'], 'Approved':['#E1F5EE','#0F6E56'], 'Declined':['#FCEBEB','#A32D2D'] }
              var lc = labelColors[label]
              return (
                <div key={label} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                  <div style={{ padding:'10px 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:'8px', background:'#f9f9f7' }}>
                    <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'6px', fontSize:'11px', background:lc[0], color:lc[1], fontWeight:500 }}>{label}</span>
                    <span style={{ fontSize:'12px', color:'#888' }}>{items.length}</span>
                  </div>
                  {items.length===0 && <div style={{ padding:'1.25rem', textAlign:'center', color:'#999', fontSize:'13px' }}>None</div>}
                  {items.map(function(a,i) {
                    var cust = a.profiles?a.profiles.full_name:'Unknown'
                    var svc = a.services?a.services.name:'Service'
                    var date = new Date(a.starts_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
                    var time = new Date(a.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
                    var ini = cust.split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                    return (
                      <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 1.25rem', borderBottom:i<items.length-1?'0.5px solid rgba(0,0,0,0.06)':'none' }}>
                        <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, flexShrink:0 }}>{ini}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'13px', fontWeight:500 }}>{cust} — {svc}</div>
                          <div style={{ fontSize:'12px', color:'#888' }}>{date} · {time}</div>
                        </div>
                        {showActions && <>
                          <button style={{ ...btnSm, background:'#E1F5EE', color:'#0F6E56', borderColor:'#5DCAA5' }} onClick={function(){updateStatus(a.id,'confirmed')}}>Approve</button>
                          <button style={{ ...btnSm, background:'#FCEBEB', color:'#A32D2D', borderColor:'#F09595' }} onClick={function(){updateStatus(a.id,'cancelled')}}>Decline</button>
                        </>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* ===== WAITLIST ===== */}
        {tab==='waitlist' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'0 1.25rem' }}>
            {waitlist.length===0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No one on the waitlist right now.</div>}
            {waitlist.map(function(w,i) {
              var cust = w.profiles?w.profiles.full_name:'Unknown'
              var ini = cust.split(' ').map(function(n){return n[0]}).join('').substring(0,2)
              return (
                <div key={w.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 0', borderBottom:i<waitlist.length-1?'0.5px solid rgba(0,0,0,0.06)':'none' }}>
                  <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'#EEEDFE', color:'#534AB7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:600, flexShrink:0 }}>#{i+1}</div>
                  <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700 }}>{ini}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:500 }}>{cust}</div>
                    <div style={{ fontSize:'12px', color:'#888' }}>Joined {new Date(w.created_at).toLocaleDateString()}</div>
                  </div>
                  <Badge type="waiting" />
                  <button style={btnSm} onClick={function(){convertWaitlist(w.id)}}>Book now</button>
                  <button style={{ ...btnSm, color:'#A32D2D' }}>Remove</button>
                </div>
              )
            })}
          </div>
        )}

        {/* ===== RECURRING ===== */}
        {tab==='recurring' && (
          <div>
            {showNewRecurring && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Set up recurring appointment</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Customer</div>
                    <select style={inp} value={rForm.customer_id} onChange={function(e){setRField('customer_id',e.target.value)}}>
                      <option value="">Select customer...</option>
                      {customers.map(function(c){return <option key={c.id} value={c.id}>{c.full_name} — {c.email}</option>})}
                    </select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Service</div>
                    <select style={inp} value={rForm.service_id} onChange={function(e){setRField('service_id',e.target.value)}}>
                      <option value="">Select service...</option>
                      {services.map(function(s){return <option key={s.id} value={s.id}>{s.name}</option>})}
                    </select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Coach</div>
                    <select style={inp} value={rForm.coach_id} onChange={function(e){setRField('coach_id',e.target.value)}}>
                      <option value="">Any available</option>
                      {coaches.map(function(c){return <option key={c.id} value={c.id}>{c.full_name}</option>})}
                    </select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Frequency</div>
                    <select style={inp} value={rForm.frequency} onChange={function(e){setRField('frequency',e.target.value)}}>
                      <option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Day of week</div>
                    <select style={inp} value={rForm.day_of_week} onChange={function(e){setRField('day_of_week',e.target.value)}}>
                      {DAYS.map(function(d,i){return <option key={i} value={i}>{d}</option>})}
                    </select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Start time</div>
                    <select style={inp} value={rForm.start_time} onChange={function(e){setRField('start_time',e.target.value)}}>
                      {TIMES.map(function(t){return <option key={t} value={t}>{t}</option>})}
                    </select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Starting from</div>
                    <input type="date" style={inp} value={rForm.starts_on} onChange={function(e){setRField('starts_on',e.target.value)}} />
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Ending on (optional)</div>
                    <input type="date" style={inp} value={rForm.ends_on} onChange={function(e){setRField('ends_on',e.target.value)}} />
                  </div>
                </div>
                <div style={{ background:'#F5E6C0', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#8B6914', marginBottom:'12px' }}>
                  ℹ️ This will create a recurring rule. Appointments repeat {rForm.frequency==='biweekly'?'every 2 weeks':rForm.frequency} on {DAYS[parseInt(rForm.day_of_week)]}s at {rForm.start_time}.
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowNewRecurring(false)}}>Cancel</button>
                  <button style={btnGold} onClick={saveRecurring} disabled={saving||!rForm.customer_id||!rForm.service_id||!rForm.starts_on}>{saving?'Saving...':'Save schedule'}</button>
                </div>
              </div>
            )}

            {!loading && recurring.length===0 && !showNewRecurring && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'14px' }}>🔄</div>
                <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>No recurring appointments</div>
                <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Set up weekly or biweekly standing schedules for regular customers.</div>
                <button style={btnGold} onClick={function(){setShowNewRecurring(true)}}>+ Set up first recurring schedule</button>
              </div>
            )}

            <div style={{ display:'grid', gap:'10px' }}>
              {recurring.map(function(r) {
                var cust = r.profiles?r.profiles.full_name:'—'
                var svc = r.services?r.services.name:'—'
                return (
                  <div key={r.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
                    <div style={{ fontSize:'20px' }}>🔄</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                        <div style={{ fontSize:'14px', fontWeight:600 }}>{cust}</div>
                        <Badge type={r.status} />
                      </div>
                      <div style={{ fontSize:'12px', color:'#888', display:'flex', gap:'12px', flexWrap:'wrap' }}>
                        <span>🎾 {svc}</span>
                        <span>📅 {FREQ_LABELS[r.frequency]} · {DAYS[r.day_of_week]}s at {r.start_time}</span>
                        <span>▶ From {r.starts_on}</span>
                        {r.ends_on && <span>⏹ Until {r.ends_on}</span>}
                        <span>✓ {r.occurrences_booked||0} booked</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'6px' }}>
                      {r.status==='active' && <button style={{ ...btnSm, color:'#BA7517' }} onClick={function(){updateRecurringStatus(r.id,'paused')}}>Pause</button>}
                      {r.status==='paused' && <button style={{ ...btnSm, color:'#0F6E56' }} onClick={function(){updateRecurringStatus(r.id,'active')}}>Resume</button>}
                      <button style={{ ...btnSm, color:'#A32D2D' }} onClick={function(){updateRecurringStatus(r.id,'cancelled')}}>Cancel</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ===== SERVICES ===== */}
        {tab==='services' && (
          <div style={{ textAlign:'center', padding:'2rem' }}>
            <a href="/admin/services" style={{ padding:'11px 24px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:600, textDecoration:'none' }}>
              Manage appointment services →
            </a>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
