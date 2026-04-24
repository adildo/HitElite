import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
var DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
var DURATIONS = [30,45,60,75,90,120]
var HOURS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]

function Toggle({ on, onToggle, label, desc }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0' }}>
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

export default function Classes() {
  var [classes, setClasses] = useState([])
  var [sessions, setSessions] = useState([])
  var [coaches, setCoaches] = useState([])
  var [locations, setLocations] = useState([])
  var [loading, setLoading] = useState(true)
  var [view, setView] = useState('list') // list, calendar
  var [calView, setCalView] = useState('week') // day, week, month
  var [calDate, setCalDate] = useState(new Date())
  var [filterType, setFilterType] = useState('all') // all, cohort, single
  var [showCreate, setShowCreate] = useState(false)
  var [editingClass, setEditingClass] = useState(null)
  var [selectedSession, setSelectedSession] = useState(null)
  var [saving, setSaving] = useState(false)
  var [form, setForm] = useState({ name:'', price:'', capacity:'10', coach_id:'', location_id:'', duration_mins:60, visibility:'public', description:'', color:'#D4A843', is_recurring:false, recurring_days:[], recurring_start_time:'09:00', recurring_start_date:'', recurring_end_date:'', recurring_occurrences:'8', require_all_sessions:false })

  useEffect(function(){ loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var [clsR, sessR, coachR, locR] = await Promise.all([
      supabase.from('classes').select('*, locations(name), profiles!classes_coach_id_fkey(full_name)').eq('is_active',true).order('name'),
      supabase.from('class_sessions').select('id,starts_at,ends_at,enrolled_count,class_id,classes(id,name,color,capacity,coach_id)').gte('starts_at',new Date(Date.now()-7*24*3600000).toISOString()).order('starts_at'),
      supabase.from('profiles').select('id,full_name').in('role',['coach','staff']).eq('is_active',true),
      supabase.from('locations').select('id,name').eq('is_active',true),
    ])
    setClasses(clsR.data||[])
    setSessions(sessR.data||[])
    setCoaches(coachR.data||[])
    setLocations(locR.data||[])
    setLoading(false)
  }

  function setField(k, v) { setForm(function(p){ return {...p,[k]:v} }) }

  function toggleDay(day) {
    setForm(function(p){
      var days = p.recurring_days.includes(day) ? p.recurring_days.filter(function(d){return d!==day}) : [...p.recurring_days,day]
      return {...p,recurring_days:days}
    })
  }

  var previewSessions = (function(){
    if (!form.is_recurring || !form.recurring_start_date || form.recurring_days.length===0) return []
    var results = []; var d = new Date(form.recurring_start_date+'T'+form.recurring_start_time)
    var endDate = form.recurring_end_date ? new Date(form.recurring_end_date) : null
    var max = parseInt(form.recurring_occurrences)||8
    var attempts = 0
    while (results.length < max && attempts < 500) {
      attempts++
      if (endDate && d > endDate) break
      if (form.recurring_days.includes(DAYS[d.getDay()])) results.push(new Date(d))
      d.setDate(d.getDate()+1)
    }
    return results
  })()

  async function saveClass() {
    if (!form.name.trim()) return
    setSaving(true)
    var payload = { name:form.name, price:parseFloat(form.price)||0, capacity:parseInt(form.capacity)||10, coach_id:form.coach_id||null, location_id:form.location_id||null, duration_mins:form.duration_mins, visibility:form.visibility, description:form.description, color:form.color||'#D4A843', is_recurring:form.is_recurring, recurring_config:form.is_recurring?{days:form.recurring_days,start_time:form.recurring_start_time,start_date:form.recurring_start_date,end_date:form.recurring_end_date,occurrences:parseInt(form.recurring_occurrences)||8,require_all:form.require_all_sessions}:null, is_active:true }
    var classId
    if (editingClass) {
      await supabase.from('classes').update(payload).eq('id',editingClass.id)
      classId = editingClass.id
    } else {
      var r = await supabase.from('classes').insert(payload).select().single()
      classId = r.data?.id
    }
    if (classId && form.is_recurring && previewSessions.length > 0 && !editingClass) {
      var sessionInserts = previewSessions.map(function(dt){
        var end = new Date(dt.getTime() + form.duration_mins*60000)
        return { class_id:classId, starts_at:dt.toISOString(), ends_at:end.toISOString(), enrolled_count:0, status:'scheduled' }
      })
      await supabase.from('class_sessions').insert(sessionInserts)
    }
    setSaving(false); setShowCreate(false); setEditingClass(null)
    resetForm()
    loadAll()
  }

  function resetForm() {
    setForm({ name:'', price:'', capacity:'10', coach_id:'', location_id:'', duration_mins:60, visibility:'public', description:'', color:'#D4A843', is_recurring:false, recurring_days:[], recurring_start_time:'09:00', recurring_start_date:'', recurring_end_date:'', recurring_occurrences:'8', require_all_sessions:false })
  }

  function openEdit(cls) {
    var rc = cls.recurring_config||{}
    setForm({ name:cls.name||'', price:cls.price||'', capacity:cls.capacity||'10', coach_id:cls.coach_id||'', location_id:cls.location_id||'', duration_mins:cls.duration_mins||60, visibility:cls.visibility||'public', description:cls.description||'', color:cls.color||'#D4A843', is_recurring:cls.is_recurring||false, recurring_days:rc.days||[], recurring_start_time:rc.start_time||'09:00', recurring_start_date:rc.start_date||'', recurring_end_date:rc.end_date||'', recurring_occurrences:rc.occurrences||'8', require_all_sessions:rc.require_all||false })
    setEditingClass(cls)
    setShowCreate(true)
  }

  async function deleteClass(id) {
    if (!confirm('Delete this class and all its sessions?')) return
    await supabase.from('class_sessions').delete().eq('class_id',id)
    await supabase.from('classes').update({ is_active:false }).eq('id',id)
    loadAll()
  }

  async function cancelSession(id) {
    if (!confirm('Cancel this session?')) return
    await supabase.from('class_sessions').update({ status:'cancelled' }).eq('id',id)
    setSelectedSession(null)
    loadAll()
  }

  // Calendar helpers
  function getWeekDays() {
    var start = new Date(calDate); start.setDate(start.getDate()-start.getDay())
    return Array.from({length:7}, function(_,i){ var d=new Date(start); d.setDate(d.getDate()+i); return d })
  }
  function isToday(d){ var n=new Date(); return d.getDate()===n.getDate()&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear() }
  function fmt(iso){ if(!iso)return'—'; var d=new Date(iso); var h=d.getHours(); var m=d.getMinutes(); return(h%12||12)+':'+(m<10?'0'+m:m)+(h<12?'am':'pm') }

  function sessionsForDate(d) {
    return sessions.filter(function(s){
      var sd = new Date(s.starts_at)
      return sd.getDate()===d.getDate()&&sd.getMonth()===d.getMonth()&&sd.getFullYear()===d.getFullYear()
    }).filter(function(s){
      if (filterType==='cohort') return s.classes && s.classes.is_recurring
      if (filterType==='single') return s.classes && !s.classes.is_recurring
      return true
    })
  }
  function sessionsForHourDay(d, hour) {
    return sessionsForDate(d).filter(function(s){ return new Date(s.starts_at).getHours()===hour })
  }

  var filteredClasses = classes.filter(function(c){
    if (filterType==='cohort') return c.is_recurring
    if (filterType==='single') return !c.is_recurring
    return true
  })

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { ...inp, fontFamily:'inherit' }

  function SessionPill({ s }) {
    var cls = s.classes||{}
    var col = cls.color||'#D4A843'
    var isCancelled = s.status==='cancelled'
    return (
      <div onClick={function(){setSelectedSession(s)}} style={{ background:col+'22', border:'1px solid '+col+'55', borderRadius:'4px', padding:'2px 5px', marginBottom:'2px', cursor:'pointer', fontSize:'10px', fontWeight:600, color:isCancelled?'#aaa':col, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration:isCancelled?'line-through':'' }}>
        {fmt(s.starts_at)} {cls.name} ({s.enrolled_count||0}/{cls.capacity||0})
      </div>
    )
  }

  return (
    <AdminLayout active="schedule">
      <div style={{ padding:'1.5rem 2rem' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Classes</div>
            <div style={{ fontSize:'13px', color:'#888' }}>{classes.length} active classes</div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
            {/* Type filter */}
            <div style={{ display:'flex', background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'8px', padding:'3px' }}>
              {[['all','All'],['cohort','Cohort'],['single','Single']].map(function(f){
                var active = filterType===f[0]
                return <button key={f[0]} onClick={function(){setFilterType(f[0])}} style={{ ...btn, border:'none', background:active?'#f5f5f3':'transparent', fontWeight:active?600:400, padding:'5px 12px', fontSize:'12px' }}>{f[1]}</button>
              })}
            </div>
            {/* View toggle */}
            <div style={{ display:'flex', background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'8px', padding:'3px' }}>
              {[['list','📋 List'],['calendar','📅 Calendar']].map(function(v){
                var active = view===v[0]
                return <button key={v[0]} onClick={function(){setView(v[0])}} style={{ ...btn, border:'none', background:active?'#D4A843':'transparent', color:active?'#0D0D0D':'#666', fontWeight:active?600:400, padding:'5px 14px', fontSize:'12px' }}>{v[1]}</button>
              })}
            </div>
            <button style={btnGold} onClick={function(){setShowCreate(function(x){return !x});setEditingClass(null);resetForm()}}>+ Create class</button>
          </div>
        </div>

        {/* Clarification banner */}
        <div style={{ background:'#E6F1FB', border:'0.5px solid #85B7EB', borderRadius:'10px', padding:'10px 16px', marginBottom:'1.25rem', fontSize:'13px', color:'#185FA5', display:'flex', gap:'10px', alignItems:'center' }}>
          <span>ℹ️</span>
          <span><strong>List vs Sessions:</strong> "List" shows your class templates (the class definition). "Sessions" shows the individual scheduled occurrences of those classes on specific dates/times — each session is one instance of a class.</span>
        </div>

        {/* Create/Edit form */}
        {showCreate && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'1.25rem' }}>{editingClass?'Edit class':'Create class'}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1rem' }}>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Class name</div><input type="text" style={inp} value={form.name} onChange={function(e){setField('name',e.target.value)}} placeholder="e.g. Monday Tennis Fundamentals" /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price ($)</div><input type="number" style={inp} value={form.price} onChange={function(e){setField('price',e.target.value)}} placeholder="25" /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Capacity</div><input type="number" style={inp} value={form.capacity} onChange={function(e){setField('capacity',e.target.value)}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Coach</div>
                <select style={sel} value={form.coach_id} onChange={function(e){setField('coach_id',e.target.value)}}>
                  <option value="">No coach assigned</option>
                  {coaches.map(function(c){return <option key={c.id} value={c.id}>{c.full_name}</option>})}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Location</div>
                <select style={sel} value={form.location_id} onChange={function(e){setField('location_id',e.target.value)}}>
                  <option value="">No location</option>
                  {locations.map(function(l){return <option key={l.id} value={l.id}>{l.name}</option>})}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'6px' }}>Duration</div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {DURATIONS.map(function(d){ var active=form.duration_mins===d; return <button key={d} onClick={function(){setField('duration_mins',d)}} style={{ padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{d}m</button> })}
                </div>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Visibility</div>
                <select style={sel} value={form.visibility} onChange={function(e){setField('visibility',e.target.value)}}>
                  <option value="public">Public</option><option value="private">Private</option><option value="unlisted">Unlisted</option>
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Color</div>
                <input type="color" value={form.color} onChange={function(e){setField('color',e.target.value)}} style={{ height:'36px', width:'100%', padding:'2px', border:'0.5px solid rgba(0,0,0,0.2)', borderRadius:'8px', cursor:'pointer' }} />
              </div>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div><textarea style={{ ...inp, resize:'none', height:'60px' }} value={form.description} onChange={function(e){setField('description',e.target.value)}} placeholder="What will students learn?" /></div>
            </div>

            {/* Recurring section */}
            <div style={{ background:'#f9f9f7', borderRadius:'10px', padding:'14px 16px', marginBottom:'1rem' }}>
              <Toggle on={form.is_recurring} onToggle={function(){setField('is_recurring',!form.is_recurring)}} label="Recurring class (cohort)" desc="Generate a series of scheduled sessions on a repeating schedule" />
              {form.is_recurring && (
                <div style={{ marginTop:'1rem' }}>
                  <Toggle on={form.require_all_sessions} onToggle={function(){setField('require_all_sessions',!form.require_all_sessions)}} label="Require booking for all sessions" desc="Students must commit to the full cohort, not individual sessions" />
                  <div style={{ marginBottom:'1rem' }}>
                    <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:500 }}>Runs on these days</div>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      {DAYS.map(function(day){
                        var active = form.recurring_days.includes(day)
                        return <button key={day} onClick={function(){toggleDay(day)}} style={{ padding:'6px 12px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{day.substring(0,3)}</button>
                      })}
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'1rem' }}>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Start time</div><input type="time" style={inp} value={form.recurring_start_time} onChange={function(e){setField('recurring_start_time',e.target.value)}} /></div>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Series start date</div><input type="date" style={inp} value={form.recurring_start_date} onChange={function(e){setField('recurring_start_date',e.target.value)}} /></div>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Series end date (optional)</div><input type="date" style={inp} value={form.recurring_end_date} onChange={function(e){setField('recurring_end_date',e.target.value)}} /></div>
                  </div>
                  <div style={{ marginBottom:'1rem' }}>
                    <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:500 }}>Number of sessions to generate</div>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      {['4','6','8','10','12','16','20','24'].map(function(n){ var active=form.recurring_occurrences===n; return <button key={n} onClick={function(){setField('recurring_occurrences',n)}} style={{ padding:'6px 12px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{n}</button> })}
                    </div>
                  </div>
                  {previewSessions.length > 0 && (
                    <div style={{ background:'#fff', borderRadius:'8px', padding:'12px', border:'0.5px solid rgba(212,168,67,0.3)' }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'#8B6914', marginBottom:'8px' }}>Preview: {previewSessions.length} sessions will be created</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                        {previewSessions.slice(0,12).map(function(dt,i){
                          return <span key={i} style={{ display:'inline-block', padding:'3px 9px', borderRadius:'6px', background:'#F5E6C0', color:'#8B6914', fontSize:'11px', fontWeight:500 }}>{DAYS_SHORT[dt.getDay()]} {MONTHS[dt.getMonth()].substring(0,3)} {dt.getDate()}</span>
                        })}
                        {previewSessions.length > 12 && <span style={{ fontSize:'11px', color:'#888', alignSelf:'center' }}>+{previewSessions.length-12} more</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowCreate(false);setEditingClass(null)}}>Cancel</button>
              <button style={btnGold} onClick={saveClass} disabled={saving||!form.name}>{saving?'Saving...':editingClass?'Save changes':'Create class'}</button>
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div>
            {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
            {!loading && filteredClasses.length === 0 && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>🎾</div>
                <div style={{ fontWeight:600, marginBottom:'6px' }}>No classes yet</div>
                <div style={{ fontSize:'13px', color:'#888', marginBottom:'1rem' }}>Create your first class above.</div>
              </div>
            )}
            <div style={{ display:'grid', gap:'10px' }}>
              {filteredClasses.map(function(cls){
                var isRecurring = cls.is_recurring
                var coachName = cls.profiles ? cls.profiles.full_name : null
                var locName = cls.locations ? cls.locations.name : null
                var clsSessions = sessions.filter(function(s){return s.class_id===cls.id})
                return (
                  <div key={cls.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
                    <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                        <div style={{ fontSize:'15px', fontWeight:600 }}>{cls.name}</div>
                        {isRecurring && <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:'6px', fontSize:'11px', background:'#EEEDFE', color:'#534AB7', fontWeight:500 }}>Cohort</span>}
                        {!isRecurring && <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:'6px', fontSize:'11px', background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>Single/Drop-in</span>}
                      </div>
                      <div style={{ fontSize:'12px', color:'#888', display:'flex', gap:'14px', flexWrap:'wrap' }}>
                        <span>💰 ${parseFloat(cls.price||0).toFixed(0)}/session</span>
                        <span>👥 Capacity: {cls.capacity}</span>
                        <span>⏱ {cls.duration_mins}min</span>
                        {coachName && <span>🎾 {coachName}</span>}
                        {locName && <span>📍 {locName}</span>}
                        {isRecurring && <span>📅 {clsSessions.length} sessions scheduled</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button style={{ ...btn, fontSize:'12px', padding:'5px 12px' }} onClick={function(){openEdit(cls)}}>Edit</button>
                      <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:'#A32D2D' }} onClick={function(){deleteClass(cls.id)}}>Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sessions list */}
            {filteredClasses.length > 0 && (
              <div style={{ marginTop:'1.5rem' }}>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem', color:'#888', textTransform:'uppercase', letterSpacing:'0.05em', fontSize:'11px' }}>Upcoming sessions</div>
                <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                    <thead><tr style={{ background:'#f9f9f7' }}>
                      {['Class','Date','Time','Enrolled','Capacity','Status',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>{h}</th> })}
                    </tr></thead>
                    <tbody>
                      {sessions.filter(function(s){
                        if (!s.classes) return false
                        if (filterType==='cohort') return s.classes.is_recurring
                        if (filterType==='single') return !s.classes.is_recurring
                        return true
                      }).slice(0,20).map(function(s,i){
                        var cls = s.classes||{}
                        var date = new Date(s.starts_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
                        var time = fmt(s.starts_at)
                        var pct = Math.round((s.enrolled_count||0)/Math.max(cls.capacity||1,1)*100)
                        var sc = { scheduled:['#E1F5EE','#0F6E56'], cancelled:['#FCEBEB','#A32D2D'], full:['#FAEEDA','#854F0B'] }[s.status]||['#E1F5EE','#0F6E56']
                        return (
                          <tr key={s.id} style={{ borderBottom:'0.5px solid rgba(0,0,0,0.05)', cursor:'pointer' }} onClick={function(){setSelectedSession(s)}}>
                            <td style={{ padding:'10px 14px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div>
                                <span style={{ fontWeight:500 }}>{cls.name}</span>
                                {cls.is_recurring && <span style={{ fontSize:'10px', background:'#EEEDFE', color:'#534AB7', padding:'1px 6px', borderRadius:'5px' }}>Cohort</span>}
                              </div>
                            </td>
                            <td style={{ padding:'10px 14px', color:'#666' }}>{date}</td>
                            <td style={{ padding:'10px 14px', color:'#666' }}>{time}</td>
                            <td style={{ padding:'10px 14px', fontWeight:500, color:pct>=90?'#A32D2D':pct>=70?'#BA7517':'#1D9E75' }}>{s.enrolled_count||0}</td>
                            <td style={{ padding:'10px 14px', color:'#666' }}>{cls.capacity}</td>
                            <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{s.status||'scheduled'}</span></td>
                            <td style={{ padding:'10px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>View</button></td>
                          </tr>
                        )
                      })}
                      {sessions.length===0 && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No upcoming sessions</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CALENDAR VIEW ── */}
        {view === 'calendar' && (
          <div>
            {/* Calendar nav */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'10px 14px', marginBottom:'1rem' }}>
              <div style={{ display:'flex', gap:'6px' }}>
                <button style={btn} onClick={function(){var d=new Date(calDate);if(calView==='day')d.setDate(d.getDate()-1);else if(calView==='week')d.setDate(d.getDate()-7);else if(calView==='month')d.setMonth(d.getMonth()-1);setCalDate(d)}}>‹</button>
                <button style={btn} onClick={function(){setCalDate(new Date())}}>Today</button>
                <button style={btn} onClick={function(){var d=new Date(calDate);if(calView==='day')d.setDate(d.getDate()+1);else if(calView==='week')d.setDate(d.getDate()+7);else if(calView==='month')d.setMonth(d.getMonth()+1);setCalDate(d)}}>›</button>
              </div>
              <div style={{ fontSize:'15px', fontWeight:600 }}>
                {calView==='day'?DAYS_SHORT[calDate.getDay()]+' '+MONTHS[calDate.getMonth()]+' '+calDate.getDate():calView==='week'?(function(){var days=getWeekDays();return MONTHS[days[0].getMonth()].substring(0,3)+' '+days[0].getDate()+' – '+MONTHS[days[6].getMonth()].substring(0,3)+' '+days[6].getDate()+', '+calDate.getFullYear()})():MONTHS[calDate.getMonth()]+' '+calDate.getFullYear()}
              </div>
              <div style={{ display:'flex', gap:'4px' }}>
                {['day','week','month','list'].map(function(v){return <button key={v} onClick={function(){setCalView(v)}} style={{ ...btn, background:calView===v?'#D4A843':'transparent', color:calView===v?'#0D0D0D':'#666', borderColor:calView===v?'#D4A843':'rgba(0,0,0,0.2)', fontSize:'12px', padding:'5px 12px' }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>})}
              </div>
            </div>

            {/* DAY */}
            {calView==='day' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                {HOURS.map(function(hour){
                  var evts = sessionsForHourDay(calDate, hour)
                  var isNow = new Date().getHours()===hour && isToday(calDate)
                  return (
                    <div key={hour} style={{ display:'grid', gridTemplateColumns:'56px 1fr', borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>
                      <div style={{ padding:'8px 10px', fontSize:'11px', color:isNow?'#D4A843':'#ccc', textAlign:'right', background:'#f9f9f7', borderRight:'0.5px solid rgba(0,0,0,0.06)', fontWeight:isNow?700:400 }}>{hour>12?hour-12:hour}{hour>=12?'pm':'am'}</div>
                      <div style={{ padding:'4px 8px', minHeight:'50px', background:isNow?'rgba(212,168,67,0.02)':'transparent' }}>
                        {evts.map(function(s){return <SessionPill key={s.id} s={s} />})}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* WEEK */}
            {calView==='week' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'auto' }}>
                <div style={{ display:'grid', gridTemplateColumns:'56px repeat(7,1fr)', minWidth:'700px' }}>
                  <div style={{ background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.08)', borderRight:'0.5px solid rgba(0,0,0,0.06)' }}></div>
                  {getWeekDays().map(function(d,i){
                    var dayEvts = sessionsForDate(d)
                    return (
                      <div key={i} style={{ padding:'8px 6px', textAlign:'center', borderBottom:'0.5px solid rgba(0,0,0,0.08)', borderRight:'0.5px solid rgba(0,0,0,0.05)', background:'#f9f9f7' }}>
                        <div style={{ fontSize:'10px', color:'#aaa', textTransform:'uppercase', letterSpacing:'0.05em' }}>{DAYS_SHORT[d.getDay()]}</div>
                        <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:isToday(d)?'#D4A843':'transparent', color:isToday(d)?'#0D0D0D':'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, margin:'3px auto 0' }}>{d.getDate()}</div>
                        {dayEvts.length>0&&<div style={{ fontSize:'10px', color:'#D4A843', fontWeight:600, marginTop:'2px' }}>{dayEvts.length}</div>}
                      </div>
                    )
                  })}
                  {HOURS.map(function(hour){
                    var weekDays = getWeekDays()
                    return [
                      <div key={'h'+hour} style={{ padding:'4px 8px', fontSize:'10px', color:'#ccc', textAlign:'right', background:'#f9f9f7', borderRight:'0.5px solid rgba(0,0,0,0.06)', borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>{hour>12?hour-12:hour}{hour>=12?'pm':'am'}</div>,
                      weekDays.map(function(d,i){
                        var evts = sessionsForHourDay(d, hour)
                        var isNowHour = new Date().getHours()===hour&&isToday(d)
                        return (
                          <div key={'c'+i} style={{ padding:'2px 4px', minHeight:'44px', borderBottom:'0.5px solid rgba(0,0,0,0.04)', borderRight:'0.5px solid rgba(0,0,0,0.04)', background:isNowHour?'rgba(212,168,67,0.04)':isToday(d)?'rgba(212,168,67,0.01)':'transparent' }}>
                            {evts.map(function(s){return <SessionPill key={s.id} s={s} />})}
                          </div>
                        )
                      })
                    ]
                  })}
                </div>
              </div>
            )}

            {/* MONTH */}
            {calView==='month' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                  {DAYS_SHORT.map(function(d){return <div key={d} style={{ padding:'8px', textAlign:'center', fontSize:'11px', fontWeight:600, color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)', background:'#f9f9f7', textTransform:'uppercase', letterSpacing:'0.04em' }}>{d}</div>})}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                  {(function(){
                    var cells = []
                    var first = new Date(calDate.getFullYear(), calDate.getMonth(), 1)
                    for (var i=0;i<first.getDay();i++) cells.push(<div key={'e'+i} style={{ minHeight:'90px', background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.04)', borderRight:'0.5px solid rgba(0,0,0,0.04)' }}></div>)
                    var daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth()+1, 0).getDate()
                    for (var day=1;day<=daysInMonth;day++) {
                      var dd=day; var d=new Date(calDate.getFullYear(),calDate.getMonth(),dd)
                      var evts=sessionsForDate(d)
                      cells.push(
                        <div key={'d'+dd} style={{ minHeight:'90px', padding:'5px', borderBottom:'0.5px solid rgba(0,0,0,0.05)', borderRight:'0.5px solid rgba(0,0,0,0.05)', background:isToday(d)?'rgba(212,168,67,0.04)':'#fff' }}>
                          <div style={{ fontSize:'12px', fontWeight:700, marginBottom:'4px', width:'22px', height:'22px', borderRadius:'50%', background:isToday(d)?'#D4A843':'transparent', color:isToday(d)?'#0D0D0D':'#888', display:'flex', alignItems:'center', justifyContent:'center' }}>{dd}</div>
                          {evts.slice(0,3).map(function(s){return <SessionPill key={s.id} s={s} />})}
                          {evts.length>3&&<div style={{ fontSize:'10px', color:'#aaa', padding:'1px 4px' }}>+{evts.length-3} more</div>}
                        </div>
                      )
                    }
                    return cells
                  })()}
                </div>
              </div>
            )}

            {/* CAL LIST */}
            {calView==='list' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                {sessions.filter(function(s){
                  if (filterType==='cohort') return s.classes&&s.classes.is_recurring
                  if (filterType==='single') return s.classes&&!s.classes.is_recurring
                  return true
                }).length===0&&<div style={{ padding:'3rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No sessions to show.</div>}
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <tbody>
                    {sessions.filter(function(s){
                      if (filterType==='cohort') return s.classes&&s.classes.is_recurring
                      if (filterType==='single') return s.classes&&!s.classes.is_recurring
                      return true
                    }).map(function(s,i){
                      var cls=s.classes||{}; var date=new Date(s.starts_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); var time=fmt(s.starts_at)
                      return (
                        <tr key={s.id} style={{ borderBottom:'0.5px solid rgba(0,0,0,0.05)', cursor:'pointer' }} onClick={function(){setSelectedSession(s)}}>
                          <td style={{ padding:'10px 14px' }}><div style={{ display:'flex', alignItems:'center', gap:'8px' }}><div style={{ width:'8px', height:'8px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div><span style={{ fontWeight:500 }}>{cls.name}</span>{cls.is_recurring&&<span style={{ fontSize:'10px', background:'#EEEDFE', color:'#534AB7', padding:'1px 6px', borderRadius:'5px' }}>Cohort</span>}</div></td>
                          <td style={{ padding:'10px 14px', color:'#666' }}>{date}</td>
                          <td style={{ padding:'10px 14px', color:'#666' }}>{time}</td>
                          <td style={{ padding:'10px 14px', color:((s.enrolled_count||0)/Math.max(cls.capacity||1,1))>=0.9?'#A32D2D':'#1D9E75', fontWeight:500 }}>{s.enrolled_count||0}/{cls.capacity} enrolled</td>
                          <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:s.status==='cancelled'?'#FCEBEB':'#E1F5EE', color:s.status==='cancelled'?'#A32D2D':'#0F6E56', fontWeight:500 }}>{s.status||'scheduled'}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SESSION DETAIL MODAL */}
        {selectedSession && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:'16px', width:'440px', overflow:'hidden' }}>
              <div style={{ padding:'1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f9f9f7' }}>
                <div style={{ fontSize:'15px', fontWeight:700 }}>{selectedSession.classes?.name||'Session'}</div>
                <button onClick={function(){setSelectedSession(null)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#888' }}>✕</button>
              </div>
              <div style={{ padding:'1.25rem' }}>
                {[
                  ['Date', new Date(selectedSession.starts_at).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})],
                  ['Time', fmt(selectedSession.starts_at)+' – '+fmt(selectedSession.ends_at)],
                  ['Enrolled', (selectedSession.enrolled_count||0)+' / '+(selectedSession.classes?.capacity||0)+' spots'],
                  ['Status', selectedSession.status||'scheduled'],
                ].map(function(row,i){
                  return <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.05)', fontSize:'13px' }}>
                    <div style={{ color:'#888', width:'80px', flexShrink:0 }}>{row[0]}</div><div style={{ fontWeight:500 }}>{row[1]}</div>
                  </div>
                })}
                <div style={{ display:'flex', gap:'8px', marginTop:'1.25rem' }}>
                  <a href="/admin/checkin" style={{ ...btnGold, textDecoration:'none', textAlign:'center', flex:1 }}>✅ Check-in students</a>
                  {selectedSession.status !== 'cancelled' && (
                    <button style={{ ...btn, color:'#A32D2D' }} onClick={function(){cancelSession(selectedSession.id)}}>🚫 Cancel</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
