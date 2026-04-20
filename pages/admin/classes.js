import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
var TIMES = []
for (var h=6;h<=21;h++){TIMES.push((h<10?'0'+h:h)+':00');TIMES.push((h<10?'0'+h:h)+':30')}
var DURATIONS = [30,45,60,75,90,120]

export default function Classes() {
  var [classes, setClasses] = useState([])
  var [sessions, setSessions] = useState([])
  var [locations, setLocations] = useState([])
  var [coaches, setCoaches] = useState([])
  var [loading, setLoading] = useState(true)
  var [view, setView] = useState('list')
  var [showNew, setShowNew] = useState(false)
  var [saving, setSaving] = useState(false)

  // Class form
  var [form, setForm] = useState({
    name:'', description:'', type:'single', color:'#D4A843',
    capacity:8, waitlist_size:3, duration_mins:60, price:25,
    payment_mode:'full', visibility:'public',
    location_id:'', primary_coach_id:'',
    // Recurring
    is_recurring:false, recurring_frequency:'weekly',
    recurring_days:[], recurring_start_time:'09:00',
    recurring_start_date:'', recurring_end_date:'',
    recurring_occurrences:'8',
    // Cohort / require all
    require_all_sessions:false,
  })

  useEffect(function() { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var [clsR, sessR, locR, coachR] = await Promise.all([
      supabase.from('classes').select('*, locations(name), profiles!classes_primary_coach_id_fkey(full_name)').eq('is_active',true).order('created_at',{ascending:false}),
      supabase.from('class_sessions').select('*, classes(name,color,capacity)').gte('starts_at',new Date().toISOString()).order('starts_at').limit(30),
      supabase.from('locations').select('id,name').eq('is_active',true),
      supabase.from('profiles').select('id,full_name').in('role',['coach']).eq('is_active',true),
    ])
    setClasses(clsR.data||[])
    setSessions(sessR.data||[])
    setLocations(locR.data||[])
    setCoaches(coachR.data||[])
    setLoading(false)
  }

  function setField(key,val){ setForm(function(p){var n={...p};n[key]=val;return n}) }

  function toggleDay(day){
    setForm(function(p){
      var days = p.recurring_days.includes(day) ? p.recurring_days.filter(function(d){return d!==day}) : [...p.recurring_days,day]
      return {...p, recurring_days:days}
    })
  }

  // Generate preview sessions based on recurring settings
  function generateRecurringSessions() {
    if (!form.recurring_start_date || form.recurring_days.length === 0) return []
    var sessions = []
    var start = new Date(form.recurring_start_date+'T12:00:00')
    var maxCount = parseInt(form.recurring_occurrences) || 8
    var end = form.recurring_end_date ? new Date(form.recurring_end_date+'T23:59:59') : null
    var current = new Date(start)
    var count = 0
    var maxIterations = 365
    var iter = 0

    while (count < maxCount && iter < maxIterations) {
      iter++
      var dayName = DAYS_OF_WEEK[current.getDay()]
      if (form.recurring_days.includes(dayName)) {
        if (!end || current <= end) {
          var timeParts = form.recurring_start_time.split(':')
          var sessionDate = new Date(current)
          sessionDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0)
          if (sessionDate >= start) {
            sessions.push(new Date(sessionDate))
            count++
          }
        }
      }
      current.setDate(current.getDate()+1)
    }
    return sessions
  }

  async function saveClass() {
    if (!form.name.trim()) return
    setSaving(true)

    // Determine class type
    var classType = form.is_recurring && form.require_all_sessions ? 'cohort' : 'single'

    var clsResult = await supabase.from('classes').insert({
      name: form.name, description: form.description, type: classType,
      color: form.color, capacity: parseInt(form.capacity),
      waitlist_size: parseInt(form.waitlist_size), duration_mins: parseInt(form.duration_mins),
      price: parseFloat(form.price)||0, payment_mode: form.payment_mode,
      visibility: form.visibility, location_id: form.location_id||null,
      primary_coach_id: form.primary_coach_id||null, is_active: true
    }).select().single()

    if (!clsResult.error && clsResult.data) {
      var classId = clsResult.data.id

      if (form.is_recurring) {
        // Create all sessions from recurring rule
        var generatedSessions = generateRecurringSessions()
        var sessionInserts = generatedSessions.map(function(date) {
          var endDate = new Date(date.getTime() + parseInt(form.duration_mins)*60000)
          return {
            class_id: classId,
            starts_at: date.toISOString(),
            ends_at: endDate.toISOString(),
            coach_id: form.primary_coach_id||null,
            location_id: form.location_id||null,
            enrolled_count: 0, status: 'scheduled'
          }
        })
        if (sessionInserts.length > 0) {
          await supabase.from('class_sessions').insert(sessionInserts)
        }
      }
    }

    setSaving(false)
    setShowNew(false)
    setForm({ name:'', description:'', type:'single', color:'#D4A843', capacity:8, waitlist_size:3, duration_mins:60, price:25, payment_mode:'full', visibility:'public', location_id:'', primary_coach_id:'', is_recurring:false, recurring_frequency:'weekly', recurring_days:[], recurring_start_time:'09:00', recurring_start_date:'', recurring_end_date:'', recurring_occurrences:'8', require_all_sessions:false })
    loadAll()
  }

  var previewSessions = form.is_recurring ? generateRecurringSessions() : []

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  function Toggle({ on, onToggle, label, desc }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
        <div>
          <div style={{ fontSize:'13px', fontWeight:500 }}>{label}</div>
          {desc && <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{desc}</div>}
        </div>
        <div onClick={onToggle} style={{ width:'42px', height:'23px', borderRadius:'12px', background:on?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
          <div style={{ position:'absolute', width:'19px', height:'19px', borderRadius:'50%', background:'#fff', top:'2px', right:on?'2px':'21px', transition:'right .15s', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }}></div>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout active="classes">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Classes</div>
            <div style={{ fontSize:'13px', color:'#888' }}>{classes.length} active classes</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <div style={{ display:'flex', background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'8px', padding:'3px' }}>
              {['list','sessions'].map(function(v){ return <button key={v} onClick={function(){setView(v)}} style={{ ...btn, border:'none', background:view===v?'#f5f5f3':'transparent', fontWeight:view===v?600:400, padding:'5px 12px', fontSize:'12px' }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button> })}
            </div>
            <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ New class</button>
          </div>
        </div>

        {/* ===== CLASS CREATION FORM ===== */}
        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'1.25rem' }}>Create class</div>

            {/* Basic info */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1rem' }}>
              <div style={{ gridColumn:'span 2' }}>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Class name</div>
                <input type="text" style={inp} placeholder="e.g. Beginner Tennis — Adult Group" value={form.name} onChange={function(e){setField('name',e.target.value)}} />
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price ($)</div>
                <input type="number" style={inp} value={form.price} onChange={function(e){setField('price',e.target.value)}} />
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Capacity</div>
                <input type="number" style={inp} value={form.capacity} onChange={function(e){setField('capacity',e.target.value)}} />
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Coach</div>
                <select style={inp} value={form.primary_coach_id} onChange={function(e){setField('primary_coach_id',e.target.value)}}>
                  <option value="">Select coach...</option>
                  {coaches.map(function(c){return <option key={c.id} value={c.id}>{c.full_name}</option>})}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Location</div>
                <select style={inp} value={form.location_id} onChange={function(e){setField('location_id',e.target.value)}}>
                  <option value="">Select location...</option>
                  {locations.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>})}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'6px' }}>Duration</div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {DURATIONS.map(function(d){ var active=form.duration_mins===d; return <button key={d} onClick={function(){setField('duration_mins',d)}} style={{ padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{d}m</button> })}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Visibility</div>
                <select style={inp} value={form.visibility} onChange={function(e){setField('visibility',e.target.value)}}>
                  <option value="public">Public</option><option value="private">Private (link only)</option><option value="internal">Internal only</option>
                </select>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div>
                <textarea style={{ ...inp, resize:'vertical', minHeight:'70px' }} value={form.description} onChange={function(e){setField('description',e.target.value)}} placeholder="Describe this class for students..." />
              </div>
            </div>

            {/* ===== RECURRING TOGGLE ===== */}
            <div style={{ background:'#f9f9f7', borderRadius:'10px', padding:'14px 16px', marginBottom:'1rem' }}>
              <Toggle
                on={form.is_recurring}
                onToggle={function(){setField('is_recurring',!form.is_recurring)}}
                label="Recurring class series"
                desc="Auto-generate multiple sessions on a repeating schedule"
              />

              {form.is_recurring && (
                <div style={{ marginTop:'1rem' }}>
                  {/* Days of week */}
                  <div style={{ marginBottom:'1rem' }}>
                    <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:500 }}>Runs on these days</div>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      {DAYS_OF_WEEK.map(function(day) {
                        var active = form.recurring_days.includes(day)
                        return <button key={day} onClick={function(){toggleDay(day)}} style={{ padding:'6px 12px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{day.substring(0,3)}</button>
                      })}
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'1rem' }}>
                    <div>
                      <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Start time</div>
                      <select style={inp} value={form.recurring_start_time} onChange={function(e){setField('recurring_start_time',e.target.value)}}>
                        {TIMES.map(function(t){return <option key={t} value={t}>{t}</option>})}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Series start date</div>
                      <input type="date" style={inp} value={form.recurring_start_date} onChange={function(e){setField('recurring_start_date',e.target.value)}} />
                    </div>
                    <div>
                      <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Series end date (optional)</div>
                      <input type="date" style={inp} value={form.recurring_end_date} onChange={function(e){setField('recurring_end_date',e.target.value)}} />
                    </div>
                  </div>

                  <div style={{ marginBottom:'1rem' }}>
                    <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:500 }}>Number of sessions to generate</div>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      {['4','6','8','10','12','16','20','24'].map(function(n){ var active=form.recurring_occurrences===n; return <button key={n} onClick={function(){setField('recurring_occurrences',n)}} style={{ padding:'6px 12px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{n}</button> })}
                    </div>
                  </div>

                  {/* Preview generated sessions */}
                  {previewSessions.length > 0 && (
                    <div style={{ background:'#fff', borderRadius:'8px', padding:'12px', border:'0.5px solid rgba(212,168,67,0.3)' }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'#8B6914', marginBottom:'8px' }}>
                        {previewSessions.length} sessions will be created
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                        {previewSessions.slice(0,12).map(function(d,i){
                          return <span key={i} style={{ display:'inline-block', padding:'3px 9px', borderRadius:'6px', background:'#F5E6C0', color:'#8B6914', fontSize:'11px', fontWeight:500 }}>
                            {d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · {d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
                          </span>
                        })}
                        {previewSessions.length > 12 && <span style={{ fontSize:'11px', color:'#888', alignSelf:'center' }}>+{previewSessions.length-12} more</span>}
                      </div>
                    </div>
                  )}
                  {form.recurring_days.length > 0 && form.recurring_start_date && previewSessions.length === 0 && (
                    <div style={{ fontSize:'12px', color:'#A32D2D' }}>No sessions generated — check your start date and selected days.</div>
                  )}
                </div>
              )}
            </div>

            {/* ===== REQUIRE ALL SESSIONS TOGGLE (only if recurring) ===== */}
            {form.is_recurring && (
              <div style={{ background:'#f9f9f7', borderRadius:'10px', padding:'14px 16px', marginBottom:'1rem' }}>
                <Toggle
                  on={form.require_all_sessions}
                  onToggle={function(){setField('require_all_sessions',!form.require_all_sessions)}}
                  label="Require sign-up for all sessions (Cohort)"
                  desc="Students must enroll in the full series at once — they cannot drop into individual sessions"
                />
                {form.require_all_sessions && (
                  <div style={{ marginTop:'10px', background:'#EEEDFE', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#534AB7' }}>
                    🎓 <strong>Cohort mode on.</strong> Customers will see all {previewSessions.length} sessions listed and sign up for the complete series. Price shown will be the total cohort price.
                  </div>
                )}
                {!form.require_all_sessions && form.is_recurring && (
                  <div style={{ marginTop:'10px', background:'#E1F5EE', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#0F6E56' }}>
                    ✅ <strong>Drop-in mode.</strong> Customers can book individual sessions from this series. Price shown is per session.
                  </div>
                )}
              </div>
            )}

            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveClass} disabled={saving || !form.name}>
                {saving ? 'Saving...' : form.is_recurring ? 'Create class + '+previewSessions.length+' sessions' : 'Save class'}
              </button>
            </div>
          </div>
        )}

        {/* ===== LIST VIEW ===== */}
        {view === 'list' && (
          <div style={{ display:'grid', gap:'10px' }}>
            {loading && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
            {!loading && classes.length===0 && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>🎾</div>
                <div style={{ fontWeight:600, marginBottom:'6px' }}>No classes yet</div>
                <div style={{ fontSize:'13px', color:'#888', marginBottom:'1rem' }}>Create your first class — with or without a recurring schedule.</div>
                <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Create class</button>
              </div>
            )}
            {classes.map(function(cls) {
              var coach = cls.profiles ? cls.profiles.full_name : 'Unassigned'
              var loc = cls.locations ? cls.locations.name : 'TBD'
              var isRecurring = cls.type === 'cohort'
              return (
                <div key={cls.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                      <div style={{ fontSize:'15px', fontWeight:600 }}>{cls.name}</div>
                      {isRecurring && <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:'6px', fontSize:'11px', background:'#EEEDFE', color:'#534AB7', fontWeight:500 }}>Cohort</span>}
                      {!isRecurring && <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:'6px', fontSize:'11px', background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>Drop-in</span>}
                    </div>
                    <div style={{ fontSize:'12px', color:'#888', display:'flex', gap:'14px', flexWrap:'wrap' }}>
                      <span>👤 {coach}</span>
                      <span>📍 {loc}</span>
                      <span>⏱ {cls.duration_mins}min</span>
                      <span>👥 Cap: {cls.capacity}</span>
                      <span>💳 ${parseFloat(cls.price||0).toFixed(0)}{isRecurring?' total':'/session'}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button style={btn} onClick={function(){setView('sessions')}}>Sessions</button>
                    <button style={btn}>Edit</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ===== SESSIONS VIEW ===== */}
        {view === 'sessions' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Class','Date','Time','Enrolled','Capacity','Status',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                {sessions.map(function(s,i) {
                  var cls = s.classes||{}
                  var date = new Date(s.starts_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
                  var time = new Date(s.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
                  var pct = cls.capacity ? Math.round((s.enrolled_count/cls.capacity)*100) : 0
                  return (
                    <tr key={s.id} style={{ borderBottom:i<sessions.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div>
                          <span style={{ fontWeight:500 }}>{cls.name}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', color:'#666' }}>{date}</td>
                      <td style={{ padding:'10px 14px', color:'#666' }}>{time}</td>
                      <td style={{ padding:'10px 14px', fontWeight:500, color:pct>=90?'#A32D2D':pct>=70?'#BA7517':'#1D9E75' }}>{s.enrolled_count}</td>
                      <td style={{ padding:'10px 14px', color:'#666' }}>{cls.capacity}</td>
                      <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>{s.status||'scheduled'}</span></td>
                      <td style={{ padding:'10px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>Manage</button></td>
                    </tr>
                  )
                })}
                {!loading && sessions.length===0 && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No upcoming sessions</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
