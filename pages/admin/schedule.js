import { useEffect, useState, useRef } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
var HOURS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20]

export default function Schedule() {
  var [view, setView] = useState('week')
  var [currentDate, setCurrentDate] = useState(new Date())
  var [sessions, setSessions] = useState([])
  var [appointments, setAppointments] = useState([])
  var [coaches, setCoaches] = useState([])
  var [loading, setLoading] = useState(true)
  var [filterCoach, setFilterCoach] = useState('')
  var [filterType, setFilterType] = useState('all')
  var [hideEmpty, setHideEmpty] = useState(false)
  var [selectedEvent, setSelectedEvent] = useState(null)
  var [error, setError] = useState(null)
  var [editModal, setEditModal] = useState(null)
  var [addRegistrantModal, setAddRegistrantModal] = useState(null)
  var [customers, setCustomers] = useState([])
  var [services, setServices] = useState([])
  var [dragOverSlot, setDragOverSlot] = useState(null)
  var [pendingDrop, setPendingDrop] = useState(null)
  var [checkinModal, setCheckinModal] = useState(null)
  var [enrollments, setEnrollments] = useState([])

  useEffect(function() { loadData() }, [currentDate, view])
  useEffect(function() {
    supabase.from('profiles').select('id,full_name,email').eq('role','customer').eq('is_active',true).then(function(r){setCustomers(r.data||[])})
    supabase.from('services').select('id,name,price,duration_mins').eq('is_active',true).then(function(r){setServices(r.data||[])})
  }, [])

  function getViewStart() {
    var d = new Date(currentDate)
    if (view==='day') { d.setHours(0,0,0,0); return d }
    if (view==='week') { d.setDate(d.getDate()-d.getDay()); d.setHours(0,0,0,0); return d }
    if (view==='month') { d.setDate(1); d.setHours(0,0,0,0); return d }
    d.setHours(0,0,0,0); return d
  }
  function getViewEnd() {
    var d = new Date(currentDate)
    if (view==='day') { d.setHours(23,59,59,999); return d }
    if (view==='week') { d.setDate(d.getDate()-d.getDay()+6); d.setHours(23,59,59,999); return d }
    if (view==='month') { d.setMonth(d.getMonth()+1,0); d.setHours(23,59,59,999); return d }
    d.setDate(d.getDate()+60); return d
  }

  async function loadData() {
    setLoading(true); setError(null)
    try {
      var start = getViewStart(); var end = getViewEnd()
      var [sessR, apptR, coachR] = await Promise.all([
        supabase.from('class_sessions').select('id,starts_at,ends_at,enrolled_count,class_id,classes(name,color,capacity,duration_mins,coach_id),locations(name)').gte('starts_at',start.toISOString()).lte('starts_at',end.toISOString()).order('starts_at'),
        supabase.from('appointments').select('id,starts_at,ends_at,status,total_amount,coach_id,services(name,color,duration_mins),profiles!appointments_customer_id_fkey(full_name)').gte('starts_at',start.toISOString()).lte('starts_at',end.toISOString()).neq('status','cancelled').order('starts_at'),
        supabase.from('profiles').select('id,full_name').in('role',['coach','staff']).eq('is_active',true),
      ])
      setSessions(sessR.data||[]); setAppointments(apptR.data||[]); setCoaches(coachR.data||[])
    } catch(e){ setError(e.message) }
    setLoading(false)
  }

  function fmt(iso) {
    if (!iso) return '—'
    var d = new Date(iso)
    var h = d.getHours(); var m = d.getMinutes()
    return (h%12||12)+':'+(m<10?'0'+m:m)+(h<12?'am':'pm')
  }
  function fmtDate(iso) {
    var d = new Date(iso)
    return DAYS_SHORT[d.getDay()]+' '+MONTHS[d.getMonth()].substring(0,3)+' '+d.getDate()
  }

  var allEvents = []
  sessions.forEach(function(s){
    if (filterCoach && s.classes && s.classes.coach_id !== filterCoach) return
    if (filterType === 'appointments') return
    allEvents.push({ id:s.id, type:'class', title:s.classes?s.classes.name:'Class', color:s.classes?s.classes.color||'#D4A843':'#D4A843', starts_at:s.starts_at, ends_at:s.ends_at, enrolled:s.enrolled_count||0, capacity:s.classes?s.classes.capacity:0, session:s })
  })
  appointments.forEach(function(a){
    if (filterCoach && a.coach_id !== filterCoach) return
    if (filterType === 'classes') return
    allEvents.push({ id:a.id, type:'appointment', title:a.services?a.services.name:'Appointment', color:a.services?a.services.color||'#534AB7':'#534AB7', starts_at:a.starts_at, ends_at:a.ends_at, customer:a.profiles?a.profiles.full_name:'', appt:a })
  })
  allEvents.sort(function(a,b){ return new Date(a.starts_at)-new Date(b.starts_at) })

  function getWeekDays() {
    var start = new Date(currentDate); start.setDate(start.getDate()-start.getDay())
    return Array.from({length:7}, function(_,i){ var d=new Date(start); d.setDate(d.getDate()+i); return d })
  }

  function navigate(dir) {
    var d = new Date(currentDate)
    if (view==='day') d.setDate(d.getDate()+dir)
    else if (view==='week') d.setDate(d.getDate()+(7*dir))
    else if (view==='month') d.setMonth(d.getMonth()+dir)
    else d.setDate(d.getDate()+(7*dir))
    setCurrentDate(d)
  }

  function getHeaderLabel() {
    if (view==='day') return DAYS_SHORT[currentDate.getDay()]+', '+MONTHS[currentDate.getMonth()]+' '+currentDate.getDate()+', '+currentDate.getFullYear()
    if (view==='week') { var days=getWeekDays(); return MONTHS[days[0].getMonth()]+' '+days[0].getDate()+' – '+days[6].getDate()+', '+days[0].getFullYear() }
    return MONTHS[currentDate.getMonth()]+' '+currentDate.getFullYear()
  }

  function eventsForHourDay(date, hour) {
    return allEvents.filter(function(e){
      var d=new Date(e.starts_at); return d.getFullYear()===date.getFullYear()&&d.getMonth()===date.getMonth()&&d.getDate()===date.getDate()&&d.getHours()===hour
    })
  }
  function eventsForDate(date) {
    return allEvents.filter(function(e){
      var d=new Date(e.starts_at); return d.getFullYear()===date.getFullYear()&&d.getMonth()===date.getMonth()&&d.getDate()===date.getDate()
    })
  }

  // Drag and drop
  function handleDragStart(e, event) {
    e.dataTransfer.setData('eventId', event.id)
    e.dataTransfer.setData('eventType', event.type)
  }
  function handleDragOver(e, date, hour) {
    e.preventDefault()
    setDragOverSlot({ date:date.toDateString(), hour })
  }
  function handleDrop(e, date, hour) {
    e.preventDefault()
    setDragOverSlot(null)
    var eventId = e.dataTransfer.getData('eventId')
    var eventType = e.dataTransfer.getData('eventType')
    var newDate = new Date(date); newDate.setHours(hour,0,0,0)
    setPendingDrop({ eventId, eventType, newDate })
  }
  async function confirmDrop() {
    if (!pendingDrop) return
    var iso = pendingDrop.newDate.toISOString()
    if (pendingDrop.eventType === 'class') {
      var sess = sessions.find(function(s){return s.id===pendingDrop.eventId})
      if (sess) {
        var dur = sess.classes?sess.classes.duration_mins*60000:3600000
        var newEnd = new Date(pendingDrop.newDate.getTime()+dur)
        await supabase.from('class_sessions').update({ starts_at:iso, ends_at:newEnd.toISOString() }).eq('id',pendingDrop.eventId)
      }
    } else {
      var appt = appointments.find(function(a){return a.id===pendingDrop.eventId})
      if (appt) {
        var dur2 = appt.services?appt.services.duration_mins*60000:3600000
        var newEnd2 = new Date(pendingDrop.newDate.getTime()+dur2)
        await supabase.from('appointments').update({ starts_at:iso, ends_at:newEnd2.toISOString() }).eq('id',pendingDrop.eventId)
      }
    }
    setPendingDrop(null)
    loadData()
  }

  async function cancelSession(sessionId) {
    if (!confirm('Cancel this session? Enrolled students will need to be notified manually.')) return
    await supabase.from('class_sessions').update({ status:'cancelled' }).eq('id', sessionId)
    setSelectedEvent(null)
    loadData()
  }
  async function cancelAppointment(apptId) {
    if (!confirm('Cancel this appointment?')) return
    await supabase.from('appointments').update({ status:'cancelled' }).eq('id', apptId)
    setSelectedEvent(null)
    loadData()
  }

  async function openCheckin(event) {
    var r = await supabase.from('enrollments').select('id,status,checked_in,checked_in_at,profiles!enrollments_customer_id_fkey(id,full_name,email)').eq('session_id',event.id)
    setEnrollments(r.data||[])
    setCheckinModal(event)
    setSelectedEvent(null)
  }
  async function toggleCheckin(enrollId, current) {
    await supabase.from('enrollments').update({ checked_in:!current, checked_in_at:!current?new Date().toISOString():null }).eq('id',enrollId)
    setEnrollments(function(p){return p.map(function(e){return e.id===enrollId?{...e,checked_in:!current,checked_in_at:!current?new Date().toISOString():null}:e})})
  }

  async function addRegistrant(sessionId, customerId) {
    await supabase.from('enrollments').insert({ session_id:sessionId, customer_id:customerId, status:'enrolled', payment_status:'pending' })
    await supabase.from('class_sessions').update({ enrolled_count:(sessions.find(function(s){return s.id===sessionId})?.enrolled_count||0)+1 }).eq('id',sessionId)
    setAddRegistrantModal(null)
    loadData()
  }

  async function saveEdit(evt) {
    if (evt.type==='class') {
      await supabase.from('class_sessions').update({ starts_at:editModal.starts_at, ends_at:editModal.ends_at }).eq('id',evt.id)
    } else {
      await supabase.from('appointments').update({ starts_at:editModal.starts_at, ends_at:editModal.ends_at, status:editModal.status }).eq('id',evt.id)
    }
    setEditModal(null)
    loadData()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var sel = { padding:'7px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', fontFamily:'inherit' }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  function EventPill({ evt, compact }) {
    var isOver = dragOverSlot && dragOverSlot.date===new Date(evt.starts_at).toDateString()
    return (
      <div draggable onDragStart={function(e){handleDragStart(e,evt)}}
        onClick={function(e){e.stopPropagation();setSelectedEvent(evt)}}
        style={{ background:evt.color+'22', border:'1px solid '+evt.color+'55', borderRadius:'4px', padding:'2px 5px', marginBottom:'2px', cursor:'grab', fontSize:compact?'10px':'11px', fontWeight:600, color:evt.color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', userSelect:'none' }}>
        {fmt(evt.starts_at)} {evt.title}
        {evt.type==='class'&&<span style={{color:'#999',fontWeight:400}}> ({evt.enrolled}/{evt.capacity})</span>}
      </div>
    )
  }

  function DropZone({date, hour}) {
    var isOver = dragOverSlot && dragOverSlot.date===date.toDateString() && dragOverSlot.hour===hour
    return (
      <div onDragOver={function(e){handleDragOver(e,date,hour)}} onDrop={function(e){handleDrop(e,date,hour)}} onDragLeave={function(){setDragOverSlot(null)}}
        style={{ position:'absolute', inset:0, borderRadius:'3px', background:isOver?'rgba(212,168,67,0.15)':'transparent', border:isOver?'1.5px dashed #D4A843':'none', pointerEvents:'all', zIndex:0 }} />
    )
  }

  var isToday = function(d){ var n=new Date(); return d.getDate()===n.getDate()&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear() }

  return (
    <AdminLayout active="schedule">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'10px' }}>
          <div style={{ fontSize:'22px', fontWeight:700 }}>Schedule</div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
            <select style={sel} value={filterCoach} onChange={function(e){setFilterCoach(e.target.value)}}>
              <option value="">All coaches</option>
              {coaches.map(function(c){return <option key={c.id} value={c.id}>{c.full_name}</option>})}
            </select>
            <select style={sel} value={filterType} onChange={function(e){setFilterType(e.target.value)}}>
              <option value="all">All types</option>
              <option value="classes">Classes only</option>
              <option value="appointments">Appointments only</option>
            </select>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#666' }}>
              <div onClick={function(){setHideEmpty(function(v){return !v})}} style={{ width:'34px', height:'18px', borderRadius:'9px', background:hideEmpty?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', transition:'background .15s' }}>
                <div style={{ position:'absolute', width:'14px', height:'14px', borderRadius:'50%', background:'#fff', top:'2px', right:hideEmpty?'2px':'18px', transition:'right .15s' }}></div>
              </div>
              Booked only
            </div>
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'10px 14px', marginBottom:'1rem' }}>
          <div style={{ display:'flex', gap:'6px' }}>
            <button style={btn} onClick={function(){navigate(-1)}}>‹</button>
            <button style={btn} onClick={function(){setCurrentDate(new Date())}}>Today</button>
            <button style={btn} onClick={function(){navigate(1)}}>›</button>
          </div>
          <div style={{ fontSize:'15px', fontWeight:600 }}>{getHeaderLabel()}</div>
          <div style={{ display:'flex', background:'#f5f5f3', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'8px', padding:'3px' }}>
            {['day','week','month','list'].map(function(v){
              return <button key={v} onClick={function(){setView(v)}} style={{ ...btn, border:'none', background:view===v?'#fff':'transparent', fontWeight:view===v?600:400, padding:'5px 12px', fontSize:'12px', borderRadius:'6px', boxShadow:view===v?'0 1px 3px rgba(0,0,0,0.08)':'none' }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
            })}
          </div>
        </div>

        <div style={{ display:'flex', gap:'14px', marginBottom:'1rem', fontSize:'12px', color:'#888', flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:'5px' }}><span style={{ width:'10px', height:'10px', borderRadius:'2px', background:'#D4A843', display:'inline-block' }}></span>Group class</span>
          <span style={{ display:'flex', alignItems:'center', gap:'5px' }}><span style={{ width:'10px', height:'10px', borderRadius:'2px', background:'#534AB7', display:'inline-block' }}></span>Appointment</span>
          <span style={{ marginLeft:'6px' }}>{loading?'Loading...':allEvents.filter(function(e){return !hideEmpty||e.type==='class'?true:true}).length+' events'}</span>
          <span style={{ color:'#aaa', fontSize:'11px' }}>✦ Drag events to reschedule</span>
        </div>

        {error && <div style={{ background:'#FCEBEB', border:'0.5px solid #A32D2D', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#A32D2D', marginBottom:'1rem' }}>{error}</div>}

        {/* DAY VIEW */}
        {view==='day' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ background:'#f9f9f7', padding:'10px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.08)', fontSize:'13px', fontWeight:600, color:'#888' }}>{fmtDate(currentDate.toISOString())}</div>
            {loading ? <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div> : (
              HOURS.map(function(hour){
                var evts = eventsForHourDay(currentDate, hour)
                if (hideEmpty && evts.length===0) return null
                var isNow = new Date().getHours()===hour && isToday(currentDate)
                return (
                  <div key={hour} style={{ display:'grid', gridTemplateColumns:'56px 1fr', borderBottom:'0.5px solid rgba(0,0,0,0.04)', position:'relative' }}>
                    <div style={{ padding:'8px 10px', fontSize:'11px', color:isNow?'#D4A843':'#ccc', textAlign:'right', background:'#f9f9f7', borderRight:'0.5px solid rgba(0,0,0,0.06)', fontWeight:isNow?700:400 }}>{hour>12?hour-12:hour}{hour>=12?'pm':'am'}</div>
                    <div style={{ padding:'4px 8px', minHeight:'50px', background:isNow?'rgba(212,168,67,0.02)':'transparent', position:'relative' }}>
                      <DropZone date={currentDate} hour={hour} />
                      {evts.map(function(evt){return <EventPill key={evt.id} evt={evt} />})}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* WEEK VIEW */}
        {view==='week' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:'56px repeat(7,1fr)', minWidth:'700px' }}>
              <div style={{ background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.08)', borderRight:'0.5px solid rgba(0,0,0,0.06)' }}></div>
              {getWeekDays().map(function(d,i){
                var dayEvts = eventsForDate(d)
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
                var anyEvt = weekDays.some(function(d){return eventsForHourDay(d,hour).length>0})
                if (hideEmpty && !anyEvt) return null
                return [
                  <div key={'h'+hour} style={{ padding:'4px 8px', fontSize:'10px', color:'#ccc', textAlign:'right', background:'#f9f9f7', borderRight:'0.5px solid rgba(0,0,0,0.06)', borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>{hour>12?hour-12:hour}{hour>=12?'pm':'am'}</div>,
                  weekDays.map(function(d,i){
                    var evts = eventsForHourDay(d, hour)
                    var isNowHour = new Date().getHours()===hour&&isToday(d)
                    return (
                      <div key={'c'+i} style={{ padding:'2px 4px', minHeight:'44px', borderBottom:'0.5px solid rgba(0,0,0,0.04)', borderRight:'0.5px solid rgba(0,0,0,0.04)', background:isNowHour?'rgba(212,168,67,0.04)':isToday(d)?'rgba(212,168,67,0.01)':'transparent', position:'relative' }}>
                        <DropZone date={d} hour={hour} />
                        {evts.map(function(evt){return <EventPill key={evt.id} evt={evt} compact />})}
                      </div>
                    )
                  })
                ]
              })}
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {view==='month' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
              {DAYS_SHORT.map(function(d){return <div key={d} style={{ padding:'8px', textAlign:'center', fontSize:'11px', fontWeight:600, color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)', background:'#f9f9f7', textTransform:'uppercase', letterSpacing:'0.04em' }}>{d}</div>})}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
              {(function(){
                var cells = []
                var first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                var startDay = first.getDay()
                for (var i=0;i<startDay;i++) cells.push(<div key={'e'+i} style={{ minHeight:'90px', background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.04)', borderRight:'0.5px solid rgba(0,0,0,0.04)' }}></div>)
                var daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0).getDate()
                for (var day=1;day<=daysInMonth;day++) {
                  var dd = day; var d = new Date(currentDate.getFullYear(), currentDate.getMonth(), dd)
                  var evts = eventsForDate(d)
                  if (hideEmpty && evts.length===0) { cells.push(<div key={'d'+dd} style={{ minHeight:'90px', padding:'5px', borderBottom:'0.5px solid rgba(0,0,0,0.05)', borderRight:'0.5px solid rgba(0,0,0,0.05)', background:'#fafafa' }}><div style={{ fontSize:'12px', fontWeight:700, marginBottom:'4px', width:'22px', height:'22px', borderRadius:'50%', background:isToday(d)?'#D4A843':'transparent', color:isToday(d)?'#0D0D0D':'#bbb', display:'flex', alignItems:'center', justifyContent:'center' }}>{dd}</div></div>); continue }
                  cells.push(
                    <div key={'d'+dd} style={{ minHeight:'90px', padding:'5px', borderBottom:'0.5px solid rgba(0,0,0,0.05)', borderRight:'0.5px solid rgba(0,0,0,0.05)', background:isToday(d)?'rgba(212,168,67,0.04)':'#fff' }}
                      onDragOver={function(e){e.preventDefault()}} onDrop={function(e){handleDrop(e,d,9)}}>
                      <div style={{ fontSize:'12px', fontWeight:700, marginBottom:'4px', width:'22px', height:'22px', borderRadius:'50%', background:isToday(d)?'#D4A843':'transparent', color:isToday(d)?'#0D0D0D':'#888', display:'flex', alignItems:'center', justifyContent:'center' }}>{dd}</div>
                      {evts.slice(0,3).map(function(evt){return <EventPill key={evt.id} evt={evt} compact />})}
                      {evts.length>3&&<div style={{ fontSize:'10px', color:'#aaa', padding:'1px 4px' }}>+{evts.length-3} more</div>}
                    </div>
                  )
                }
                return cells
              })()}
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view==='list' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            {allEvents.length===0&&!loading&&<div style={{ padding:'3rem', textAlign:'center', color:'#aaa' }}><div style={{ fontSize:'32px', marginBottom:'14px' }}>📅</div><div style={{ fontWeight:600, color:'#666', marginBottom:'8px' }}>No events</div></div>}
            {loading&&<div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
            {!loading&&allEvents.length>0&&(
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#f9f9f7' }}>
                  {['Type','Title','Date','Time','Details','Status',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'11px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>})}
                </tr></thead>
                <tbody>
                  {allEvents.map(function(evt,i){
                    var statusColor = evt.type==='class'?['#E1F5EE','#0F6E56']:['#EEEDFE','#534AB7']
                    var statusLabel = evt.type==='class'?'class':'appt'
                    var details = evt.type==='class'?evt.enrolled+'/'+evt.capacity+' enrolled':(evt.customer||'—')
                    return (
                      <tr key={evt.id} onClick={function(){setSelectedEvent(evt)}} style={{ borderBottom:i<allEvents.length-1?'0.5px solid rgba(0,0,0,0.05)':'none', cursor:'pointer' }}>
                        <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:statusColor[0], color:statusColor[1], fontWeight:500 }}>{statusLabel}</span></td>
                        <td style={{ padding:'10px 14px', fontWeight:500 }}><div style={{ display:'flex', alignItems:'center', gap:'8px' }}><div style={{ width:'8px', height:'8px', borderRadius:'50%', background:evt.color, flexShrink:0 }}></div>{evt.title}</div></td>
                        <td style={{ padding:'10px 14px', color:'#666' }}>{fmtDate(evt.starts_at)}</td>
                        <td style={{ padding:'10px 14px', color:'#666', whiteSpace:'nowrap' }}>{fmt(evt.starts_at)}</td>
                        <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{details}</td>
                        <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:statusColor[0], color:statusColor[1], fontWeight:500 }}>{statusLabel}</span></td>
                        <td style={{ padding:'10px 14px' }}><button style={{ ...btn, fontSize:'11px', padding:'3px 8px' }} onClick={function(e){e.stopPropagation();setSelectedEvent(evt)}}>Details</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* EVENT DETAILS PANEL */}
        {selectedEvent && (
          <>
            <div onClick={function(){setSelectedEvent(null)}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.15)', zIndex:99 }}></div>
            <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'360px', background:'#fff', borderLeft:'0.5px solid rgba(0,0,0,0.1)', padding:0, overflowY:'auto', zIndex:100, boxShadow:'-4px 0 20px rgba(0,0,0,0.08)' }}>
              <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f9f9f7', position:'sticky', top:0 }}>
                <div style={{ fontSize:'14px', fontWeight:600 }}>Event details</div>
                <button onClick={function(){setSelectedEvent(null)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#888', lineHeight:1 }}>✕</button>
              </div>
              <div style={{ padding:'1.25rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1.25rem' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:selectedEvent.color+'22', border:'1px solid '+selectedEvent.color+'55', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
                    {selectedEvent.type==='class'?'🎾':'📅'}
                  </div>
                  <div>
                    <div style={{ fontSize:'15px', fontWeight:700 }}>{selectedEvent.title}</div>
                    <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{selectedEvent.type==='class'?'Group class':'Private lesson'}</div>
                  </div>
                </div>
                <div style={{ display:'grid', gap:'2px', marginBottom:'1.25rem' }}>
                  {[
                    ['Date', fmtDate(selectedEvent.starts_at)],
                    ['Time', fmt(selectedEvent.starts_at)+' – '+fmt(selectedEvent.ends_at)],
                    selectedEvent.type==='class'?['Enrollment',selectedEvent.enrolled+' / '+selectedEvent.capacity+' spots filled']:['Customer',selectedEvent.customer||'—'],
                  ].map(function(row,i){return(
                    <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.05)', fontSize:'13px' }}>
                      <div style={{ color:'#888', width:'100px', flexShrink:0 }}>{row[0]}</div>
                      <div style={{ fontWeight:500 }}>{row[1]}</div>
                    </div>
                  )})}
                </div>

                {selectedEvent.type==='class' && (
                  <div style={{ marginBottom:'1.25rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#888', marginBottom:'5px' }}>
                      <span>Capacity</span><span>{Math.round(selectedEvent.enrolled/Math.max(selectedEvent.capacity,1)*100)}% full</span>
                    </div>
                    <div style={{ height:'8px', background:'#f1f1f1', borderRadius:'4px' }}>
                      <div style={{ height:'100%', borderRadius:'4px', background:Math.round(selectedEvent.enrolled/Math.max(selectedEvent.capacity,1)*100)>=90?'#A32D2D':'#1D9E75', width:Math.min(100,Math.round(selectedEvent.enrolled/Math.max(selectedEvent.capacity,1)*100))+'%', transition:'width 0.3s' }}></div>
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  <button style={{ ...btnGold, textAlign:'center' }} onClick={function(){
                    setEditModal({ starts_at:selectedEvent.starts_at, ends_at:selectedEvent.ends_at, status:selectedEvent.appt?selectedEvent.appt.status:'scheduled' })
                  }}>✏️ Edit session</button>
                  {selectedEvent.type==='class' && <>
                    <button style={{ ...btn, textAlign:'center' }} onClick={function(){openCheckin(selectedEvent)}}>✅ Check in students</button>
                    <button style={{ ...btn, textAlign:'center' }} onClick={function(){setAddRegistrantModal(selectedEvent);setSelectedEvent(null)}}>+ Add registrant</button>
                  </>}
                  <button style={{ ...btn, textAlign:'center', color:'#A32D2D' }} onClick={function(){
                    if (selectedEvent.type==='class') cancelSession(selectedEvent.id)
                    else cancelAppointment(selectedEvent.id)
                  }}>🚫 Cancel session</button>
                </div>

                {editModal && (
                  <div style={{ marginTop:'1.25rem', padding:'1.25rem', background:'#f9f9f7', borderRadius:'10px' }}>
                    <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Edit timing</div>
                    <div style={{ display:'grid', gap:'10px', marginBottom:'12px' }}>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Start time</div>
                        <input type="datetime-local" style={inp} value={editModal.starts_at?editModal.starts_at.substring(0,16):''} onChange={function(e){setEditModal(function(p){return{...p,starts_at:e.target.value+':00.000Z'}})}} /></div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>End time</div>
                        <input type="datetime-local" style={inp} value={editModal.ends_at?editModal.ends_at.substring(0,16):''} onChange={function(e){setEditModal(function(p){return{...p,ends_at:e.target.value+':00.000Z'}})}} /></div>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button style={btn} onClick={function(){setEditModal(null)}}>Cancel</button>
                      <button style={btnGold} onClick={function(){saveEdit(selectedEvent)}}>Save changes</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* CHECK-IN MODAL */}
        {checkinModal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:'16px', width:'480px', maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>
              <div style={{ padding:'1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:'15px', fontWeight:700 }}>Check-in: {checkinModal.title}</div>
                <button onClick={function(){setCheckinModal(null)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#888' }}>✕</button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'1rem' }}>
                {enrollments.length===0&&<div style={{ textAlign:'center', color:'#999', fontSize:'13px', padding:'2rem' }}>No students enrolled.</div>}
                {enrollments.map(function(e){
                  var cust = e.profiles||{}
                  var ini = (cust.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                  return (
                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px', borderRadius:'10px', marginBottom:'6px', background:e.checked_in?'rgba(29,158,117,0.06)':'#f9f9f7' }}>
                      <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:e.checked_in?'#E1F5EE':'#F5E6C0', color:e.checked_in?'#0F6E56':'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700 }}>{e.checked_in?'✓':ini}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:500, color:e.checked_in?'#1D9E75':'#1a1a1a' }}>{cust.full_name||'—'}</div>
                        <div style={{ fontSize:'11px', color:'#aaa' }}>{cust.email}</div>
                      </div>
                      <button onClick={function(){toggleCheckin(e.id,e.checked_in)}} style={{ ...btn, fontSize:'12px', padding:'5px 12px', background:e.checked_in?'#FCEBEB':'#E1F5EE', color:e.checked_in?'#A32D2D':'#0F6E56', borderColor:e.checked_in?'#F09595':'#5DCAA5' }}>
                        {e.checked_in?'Undo':'Check in'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ADD REGISTRANT MODAL */}
        {addRegistrantModal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:'16px', width:'440px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'1rem' }}>Add registrant to {addRegistrantModal.title}</div>
              <div style={{ marginBottom:'1rem' }}>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Select customer</div>
                <select style={{ ...inp, fontFamily:'inherit' }} id="reg-select">
                  <option value="">Choose a customer...</option>
                  {customers.map(function(c){return <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>})}
                </select>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button style={btn} onClick={function(){setAddRegistrantModal(null)}}>Cancel</button>
                <button style={btnGold} onClick={function(){
                  var sel = document.getElementById('reg-select')
                  if (sel && sel.value) addRegistrant(addRegistrantModal.id, sel.value)
                }}>Add registrant</button>
              </div>
            </div>
          </div>
        )}

        {/* DRAG CONFIRM MODAL */}
        {pendingDrop && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:'16px', padding:'2rem', maxWidth:'380px', textAlign:'center' }}>
              <div style={{ fontSize:'36px', marginBottom:'14px' }}>📅</div>
              <div style={{ fontSize:'16px', fontWeight:700, marginBottom:'8px' }}>Reschedule this session?</div>
              <div style={{ fontSize:'13px', color:'#666', marginBottom:'1.5rem' }}>
                Move to <strong>{pendingDrop.newDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</strong> at <strong>{pendingDrop.newDate.getHours()>12?pendingDrop.newDate.getHours()-12:pendingDrop.newDate.getHours()}:00{pendingDrop.newDate.getHours()>=12?'pm':'am'}</strong>?
              </div>
              <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
                <button style={btn} onClick={function(){setPendingDrop(null)}}>Cancel</button>
                <button style={btnGold} onClick={confirmDrop}>Yes, reschedule</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
