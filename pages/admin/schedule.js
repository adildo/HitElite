import { useEffect, useState } from 'react'
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
  var [selectedEvent, setSelectedEvent] = useState(null)
  var [error, setError] = useState(null)

  useEffect(function() { loadData() }, [currentDate, view])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      var start = getViewStart()
      var end = getViewEnd()

      var [sessR, apptR, coachR] = await Promise.all([
        supabase
          .from('class_sessions')
          .select('id, starts_at, ends_at, enrolled_count, class_id, classes(name, color, capacity, duration_mins), locations(name)')
          .gte('starts_at', start.toISOString())
          .lte('starts_at', end.toISOString())
          .order('starts_at'),
        supabase
          .from('appointments')
          .select('id, starts_at, ends_at, status, total_amount, coach_id, services(name, color, duration_mins), profiles!appointments_customer_id_fkey(full_name)')
          .gte('starts_at', start.toISOString())
          .lte('starts_at', end.toISOString())
          .neq('status', 'cancelled')
          .order('starts_at'),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['coach', 'staff'])
          .eq('is_active', true),
      ])

      setSessions(sessR.data || [])
      setAppointments(apptR.data || [])
      setCoaches(coachR.data || [])
    } catch(e) {
      setError('Failed to load schedule: ' + e.message)
    }
    setLoading(false)
  }

  function getViewStart() {
    var d = new Date(currentDate)
    if (view === 'day') { d.setHours(0,0,0,0); return d }
    if (view === 'week') { d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d }
    if (view === 'month') { d.setDate(1); d.setHours(0,0,0,0); return d }
    // list — next 30 days
    d.setHours(0,0,0,0); return d
  }

  function getViewEnd() {
    var d = new Date(getViewStart())
    if (view === 'day') { d.setHours(23,59,59,999); return d }
    if (view === 'week') { d.setDate(d.getDate()+6); d.setHours(23,59,59,999); return d }
    if (view === 'month') { d.setMonth(d.getMonth()+1); d.setDate(0); d.setHours(23,59,59,999); return d }
    // list — 60 days
    d.setDate(d.getDate()+60); return d
  }

  function navigate(dir) {
    var d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + (dir * 7))
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  function getHeaderLabel() {
    if (view === 'day') return currentDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})
    if (view === 'week') {
      var s = getViewStart()
      var e = new Date(s); e.setDate(e.getDate()+6)
      return s.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' – ' + e.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
    }
    if (view === 'month') return MONTHS[currentDate.getMonth()] + ' ' + currentDate.getFullYear()
    return 'Next 60 days'
  }

  function getAllEvents() {
    var evts = []
    sessions.forEach(function(s) {
      if (filterType === 'appointments') return
      var cls = s.classes || {}
      evts.push({
        id: 'sess-' + s.id, rawId: s.id, type: 'class',
        title: cls.name || 'Class',
        color: cls.color || '#D4A843',
        starts_at: s.starts_at, ends_at: s.ends_at,
        enrolled: s.enrolled_count || 0,
        capacity: cls.capacity || 0,
        location: s.locations ? s.locations.name : '',
        duration: cls.duration_mins || 60,
      })
    })
    appointments.forEach(function(a) {
      if (filterType === 'classes') return
      if (filterCoach && a.coach_id !== filterCoach) return
      var svc = a.services || {}
      evts.push({
        id: 'appt-' + a.id, rawId: a.id, type: 'appointment',
        title: svc.name || 'Appointment',
        color: svc.color || '#534AB7',
        starts_at: a.starts_at, ends_at: a.ends_at,
        customer: a.profiles ? a.profiles.full_name : '',
        status: a.status,
        amount: a.total_amount,
        duration: svc.duration_mins || 60,
      })
    })
    return evts
  }

  function getEventsForDay(date) {
    var ds = date.toDateString()
    return getAllEvents().filter(function(e) { return new Date(e.starts_at).toDateString() === ds })
  }

  function getEventsForHour(date, hour) {
    return getEventsForDay(date).filter(function(e) { return new Date(e.starts_at).getHours() === hour })
  }

  function fmt(dt) {
    return new Date(dt).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var sel = { padding:'7px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', fontFamily:'inherit' }

  function EventPill(props) {
    var evt = props.evt
    var compact = props.compact
    var pct = evt.type === 'class' && evt.capacity > 0 ? Math.round((evt.enrolled / evt.capacity) * 100) : 0
    return (
      <div
        onClick={function(e) { e.stopPropagation(); setSelectedEvent(evt) }}
        style={{
          background: evt.color + '20',
          border: '1px solid ' + evt.color + '55',
          borderLeft: '3px solid ' + evt.color,
          borderRadius: '4px',
          padding: compact ? '2px 5px' : '5px 8px',
          marginBottom: '2px',
          cursor: 'pointer',
          overflow: 'hidden',
        }}>
        <div style={{ fontSize: compact ? '10px' : '11px', fontWeight: 600, color: '#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{evt.title}</div>
        {!compact && (
          <div style={{ fontSize: '10px', color: '#555', marginTop: '1px' }}>
            {fmt(evt.starts_at)}
            {evt.type === 'class' ? ' · ' + evt.enrolled + '/' + evt.capacity : evt.customer ? ' · ' + evt.customer : ''}
          </div>
        )}
        {!compact && evt.type === 'class' && evt.capacity > 0 && (
          <div style={{ height: '3px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', marginTop: '4px' }}>
            <div style={{ height: '100%', borderRadius: '2px', background: pct >= 90 ? '#A32D2D' : pct >= 70 ? '#D4A843' : evt.color, width: pct + '%' }}></div>
          </div>
        )}
      </div>
    )
  }

  var allEvents = getAllEvents()
  var weekStart = getViewStart()

  return (
    <AdminLayout active="schedule">
      <div style={{ padding: '1.5rem 2rem' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'10px' }}>
          <div style={{ fontSize:'22px', fontWeight:700 }}>Schedule</div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
            <select style={sel} value={filterCoach} onChange={function(e){ setFilterCoach(e.target.value) }}>
              <option value="">All coaches</option>
              {coaches.map(function(c){ return <option key={c.id} value={c.id}>{c.full_name}</option> })}
            </select>
            <select style={sel} value={filterType} onChange={function(e){ setFilterType(e.target.value) }}>
              <option value="all">All events</option>
              <option value="classes">Classes only</option>
              <option value="appointments">Appointments only</option>
            </select>
            <a href="/admin/classes" style={{ ...btn, textDecoration:'none' }}>+ New class</a>
            <a href="/admin/appointments" style={{ ...btnGold, textDecoration:'none' }}>+ Appointment</a>
          </div>
        </div>

        {/* Navigation bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'10px 14px', marginBottom:'1rem' }}>
          <div style={{ display:'flex', gap:'6px' }}>
            <button style={btn} onClick={function(){ navigate(-1) }}>← Prev</button>
            <button style={{ ...btn, fontWeight:600 }} onClick={function(){ setCurrentDate(new Date()) }}>Today</button>
            <button style={btn} onClick={function(){ navigate(1) }}>Next →</button>
          </div>
          <div style={{ fontSize:'15px', fontWeight:600 }}>{getHeaderLabel()}</div>
          <div style={{ display:'flex', background:'#f5f5f3', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'8px', padding:'3px' }}>
            {['day','week','month','list'].map(function(v) {
              return (
                <button key={v} onClick={function(){ setView(v) }} style={{ ...btn, border:'none', background:view===v?'#fff':'transparent', fontWeight:view===v?600:400, padding:'5px 12px', fontSize:'12px', borderRadius:'6px', boxShadow:view===v?'0 1px 3px rgba(0,0,0,0.08)':'none' }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend + count */}
        <div style={{ display:'flex', gap:'14px', marginBottom:'1rem', fontSize:'12px', color:'#888', flexWrap:'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap:'5px' }}><span style={{ width:'10px', height:'10px', borderRadius:'2px', background:'#D4A843', display:'inline-block' }}></span>Group class</span>
          <span style={{ display:'flex', alignItems:'center', gap:'5px' }}><span style={{ width:'10px', height:'10px', borderRadius:'2px', background:'#534AB7', display:'inline-block' }}></span>Private lesson</span>
          <span style={{ marginLeft:'6px' }}>{loading ? 'Loading...' : allEvents.length + ' event' + (allEvents.length !== 1 ? 's' : '') + ' this period'}</span>
        </div>

        {error && (
          <div style={{ background:'#FCEBEB', border:'0.5px solid #A32D2D', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#A32D2D', marginBottom:'1rem' }}>{error}</div>
        )}

        {loading && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'4rem', textAlign:'center' }}>
            <div style={{ fontSize:'13px', color:'#999' }}>Loading schedule...</div>
          </div>
        )}

        {/* ── DAY VIEW ── */}
        {!loading && view === 'day' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ background:'#f9f9f7', padding:'10px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.08)', fontSize:'13px', fontWeight:600, color:'#888' }}>
              {currentDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
            </div>
            {HOURS.map(function(hour) {
              var evts = getEventsForHour(currentDate, hour)
              var isNow = new Date().getHours() === hour && currentDate.toDateString() === new Date().toDateString()
              return (
                <div key={hour} style={{ display:'grid', gridTemplateColumns:'56px 1fr', borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ padding:'8px 10px', fontSize:'11px', color:isNow?'#D4A843':'#ccc', textAlign:'right', background:'#f9f9f7', borderRight:'0.5px solid rgba(0,0,0,0.06)', fontWeight:isNow?700:400 }}>
                    {hour % 12 || 12}{hour < 12 ? 'am' : 'pm'}
                  </div>
                  <div style={{ padding:'4px 8px', minHeight:'50px', background:isNow?'rgba(212,168,67,0.02)':'transparent' }}>
                    {evts.map(function(evt){ return <EventPill key={evt.id} evt={evt} compact={false} /> })}
                  </div>
                </div>
              )
            })}
            {allEvents.length === 0 && (
              <div style={{ padding:'3rem', textAlign:'center', color:'#aaa', fontSize:'13px' }}>
                No events on this day.<br />
                <a href="/admin/classes" style={{ color:'#D4A843', marginTop:'8px', display:'inline-block' }}>+ Add a class</a>
              </div>
            )}
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {!loading && view === 'week' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:'50px repeat(7, minmax(0,1fr))', minWidth:'680px' }}>
              {/* Day headers */}
              <div style={{ background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.08)', borderRight:'0.5px solid rgba(0,0,0,0.06)' }}></div>
              {Array.from({length:7}).map(function(_, i) {
                var d = new Date(weekStart); d.setDate(d.getDate() + i)
                var isToday = d.toDateString() === new Date().toDateString()
                var dayEvts = getEventsForDay(d)
                return (
                  <div key={i} style={{ padding:'8px 6px', textAlign:'center', borderBottom:'0.5px solid rgba(0,0,0,0.08)', borderRight:'0.5px solid rgba(0,0,0,0.05)', background:'#f9f9f7' }}>
                    <div style={{ fontSize:'10px', color:'#aaa', textTransform:'uppercase', letterSpacing:'0.05em' }}>{DAYS_SHORT[d.getDay()]}</div>
                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:isToday?'#D4A843':'transparent', color:isToday?'#0D0D0D':'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, margin:'3px auto 0' }}>
                      {d.getDate()}
                    </div>
                    {dayEvts.length > 0 && <div style={{ fontSize:'10px', color:'#D4A843', fontWeight:600, marginTop:'2px' }}>{dayEvts.length}</div>}
                  </div>
                )
              })}
              {/* Hour rows */}
              {HOURS.map(function(hour) {
                return [
                  <div key={'h'+hour} style={{ padding:'4px 8px', fontSize:'10px', color:'#ccc', textAlign:'right', background:'#f9f9f7', borderRight:'0.5px solid rgba(0,0,0,0.06)', borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>
                    {hour % 12 || 12}{hour < 12 ? 'a' : 'p'}
                  </div>,
                  ...Array.from({length:7}).map(function(_, i) {
                    var d = new Date(weekStart); d.setDate(d.getDate() + i)
                    var evts = getEventsForHour(d, hour)
                    var isToday = d.toDateString() === new Date().toDateString()
                    var isNowHour = isToday && new Date().getHours() === hour
                    return (
                      <div key={'c'+i} style={{ padding:'2px 4px', minHeight:'44px', borderBottom:'0.5px solid rgba(0,0,0,0.04)', borderRight:'0.5px solid rgba(0,0,0,0.04)', background:isNowHour?'rgba(212,168,67,0.04)':isToday?'rgba(212,168,67,0.01)':'transparent' }}>
                        {evts.map(function(evt){ return <EventPill key={evt.id} evt={evt} compact={true} /> })}
                      </div>
                    )
                  })
                ]
              }).flat()}
            </div>
            {allEvents.length === 0 && (
              <div style={{ padding:'3rem', textAlign:'center', color:'#aaa', fontSize:'13px', borderTop:'0.5px solid rgba(0,0,0,0.06)' }}>
                No events this week. <a href="/admin/classes" style={{ color:'#D4A843' }}>Add a class</a> or <a href="/admin/appointments" style={{ color:'#D4A843' }}>create an appointment</a>.
              </div>
            )}
          </div>
        )}

        {/* ── MONTH VIEW ── */}
        {!loading && view === 'month' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))' }}>
              {DAYS_SHORT.map(function(d) {
                return <div key={d} style={{ padding:'8px', textAlign:'center', fontSize:'11px', fontWeight:600, color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)', background:'#f9f9f7', textTransform:'uppercase', letterSpacing:'0.04em' }}>{d}</div>
              })}
              {(function() {
                var cells = []
                var yr = currentDate.getFullYear()
                var mo = currentDate.getMonth()
                var firstDay = new Date(yr, mo, 1).getDay()
                var daysInMonth = new Date(yr, mo+1, 0).getDate()
                for (var i = 0; i < firstDay; i++) {
                  cells.push(<div key={'e'+i} style={{ minHeight:'90px', background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.04)', borderRight:'0.5px solid rgba(0,0,0,0.04)' }}></div>)
                }
                for (var day = 1; day <= daysInMonth; day++) {
                  var d = new Date(yr, mo, day)
                  var evts = getEventsForDay(d)
                  var isToday = d.toDateString() === new Date().toDateString()
                  var dd = day
                  cells.push(
                    <div key={'d'+day} style={{ minHeight:'90px', padding:'5px', borderBottom:'0.5px solid rgba(0,0,0,0.05)', borderRight:'0.5px solid rgba(0,0,0,0.05)', background:isToday?'rgba(212,168,67,0.04)':'#fff' }}>
                      <div style={{ fontSize:'12px', fontWeight:700, marginBottom:'4px', width:'22px', height:'22px', borderRadius:'50%', background:isToday?'#D4A843':'transparent', color:isToday?'#0D0D0D':'#888', display:'flex', alignItems:'center', justifyContent:'center' }}>{dd}</div>
                      {evts.slice(0,3).map(function(evt){ return <EventPill key={evt.id} evt={evt} compact={true} /> })}
                      {evts.length > 3 && <div style={{ fontSize:'10px', color:'#aaa', padding:'1px 4px' }}>+{evts.length-3} more</div>}
                    </div>
                  )
                }
                return cells
              })()}
            </div>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {!loading && view === 'list' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            {allEvents.length === 0 && (
              <div style={{ padding:'3rem', textAlign:'center', color:'#aaa' }}>
                <div style={{ fontSize:'32px', marginBottom:'14px' }}>📅</div>
                <div style={{ fontSize:'15px', fontWeight:600, color:'#666', marginBottom:'8px' }}>No events in the next 60 days</div>
                <div style={{ fontSize:'13px', marginBottom:'1.25rem' }}>Create classes with sessions or add appointments to see them here.</div>
                <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
                  <a href="/admin/classes" style={{ ...btnGold, textDecoration:'none' }}>+ Create a class</a>
                  <a href="/admin/appointments" style={{ ...btn, textDecoration:'none' }}>+ Add appointment</a>
                </div>
              </div>
            )}
            {allEvents.length > 0 && (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr style={{ background:'#f9f9f7' }}>
                    {['Type','Event','Date','Time','Details','Status'].map(function(h,i) {
                      return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'11px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
                    })}
                  </tr>
                </thead>
                <tbody>
                  {allEvents.sort(function(a,b){ return new Date(a.starts_at) - new Date(b.starts_at) }).map(function(evt, i) {
                    var date = new Date(evt.starts_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
                    var details = evt.type === 'class' ? (evt.enrolled||0) + '/' + (evt.capacity||0) + ' enrolled' : evt.customer || '—'
                    var statusColor = evt.type === 'class' ? ['#E1F5EE','#0F6E56'] : evt.status === 'confirmed' ? ['#E1F5EE','#0F6E56'] : ['#FAEEDA','#854F0B']
                    var statusLabel = evt.type === 'class' ? 'scheduled' : evt.status || 'pending'
                    return (
                      <tr key={evt.id} onClick={function(){ setSelectedEvent(evt) }} style={{ borderBottom:i<allEvents.length-1?'0.5px solid rgba(0,0,0,0.05)':'none', cursor:'pointer' }}>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:evt.type==='class'?'#F5E6C0':'#EEEDFE', color:evt.type==='class'?'#8B6914':'#534AB7', fontWeight:500 }}>
                            {evt.type === 'class' ? 'Class' : 'Lesson'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', fontWeight:500 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:evt.color, flexShrink:0 }}></div>
                            {evt.title}
                          </div>
                        </td>
                        <td style={{ padding:'10px 14px', color:'#666' }}>{date}</td>
                        <td style={{ padding:'10px 14px', color:'#666', whiteSpace:'nowrap' }}>{fmt(evt.starts_at)}</td>
                        <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{details}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:statusColor[0], color:statusColor[1], fontWeight:500 }}>{statusLabel}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── EVENT DETAIL PANEL ── */}
        {selectedEvent && (
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'340px', background:'#fff', borderLeft:'0.5px solid rgba(0,0,0,0.1)', padding:'0', overflowY:'auto', zIndex:100, boxShadow:'-4px 0 20px rgba(0,0,0,0.08)' }}>
            {/* Panel header */}
            <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f9f9f7', position:'sticky', top:0 }}>
              <div style={{ fontSize:'14px', fontWeight:600 }}>Event details</div>
              <button onClick={function(){ setSelectedEvent(null) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#888', lineHeight:1 }}>✕</button>
            </div>

            <div style={{ padding:'1.25rem' }}>
              {/* Color + title */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1.25rem' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:selectedEvent.color+'22', border:'1px solid '+selectedEvent.color+'55', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
                  {selectedEvent.type === 'class' ? '👥' : '🎾'}
                </div>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:700 }}>{selectedEvent.title}</div>
                  <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{selectedEvent.type === 'class' ? 'Group class' : 'Private lesson'}</div>
                </div>
              </div>

              {/* Details */}
              <div style={{ display:'grid', gap:'2px', marginBottom:'1.25rem' }}>
                {[
                  ['📅 Date', new Date(selectedEvent.starts_at).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})],
                  ['⏰ Time', fmt(selectedEvent.starts_at) + (selectedEvent.ends_at ? ' – ' + fmt(selectedEvent.ends_at) : '')],
                  ['⏱ Duration', (selectedEvent.duration || 60) + ' min'],
                  selectedEvent.type === 'class' ? ['👥 Enrollment', selectedEvent.enrolled + ' / ' + selectedEvent.capacity + ' students'] : null,
                  selectedEvent.customer ? ['👤 Customer', selectedEvent.customer] : null,
                  selectedEvent.location ? ['📍 Location', selectedEvent.location] : null,
                  selectedEvent.status ? ['Status', selectedEvent.status] : null,
                  selectedEvent.amount ? ['💳 Amount', '$' + parseFloat(selectedEvent.amount).toFixed(2)] : null,
                ].filter(Boolean).map(function(row, i) {
                  return (
                    <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.05)', fontSize:'13px' }}>
                      <div style={{ color:'#888', width:'100px', flexShrink:0 }}>{row[0]}</div>
                      <div style={{ fontWeight:500 }}>{row[1]}</div>
                    </div>
                  )
                })}
              </div>

              {/* Capacity bar for classes */}
              {selectedEvent.type === 'class' && selectedEvent.capacity > 0 && (
                <div style={{ marginBottom:'1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#888', marginBottom:'5px' }}>
                    <span>Capacity</span>
                    <span style={{ fontWeight:600, color: Math.round(selectedEvent.enrolled/selectedEvent.capacity*100) >= 90 ? '#A32D2D' : '#1D9E75' }}>
                      {Math.round(selectedEvent.enrolled/selectedEvent.capacity*100)}% full
                    </span>
                  </div>
                  <div style={{ height:'8px', background:'#f1f1f1', borderRadius:'4px' }}>
                    <div style={{ height:'100%', borderRadius:'4px', background: Math.round(selectedEvent.enrolled/selectedEvent.capacity*100) >= 90 ? '#A32D2D' : '#1D9E75', width: Math.min(100,Math.round(selectedEvent.enrolled/selectedEvent.capacity*100)) + '%', transition:'width 0.3s' }}></div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {selectedEvent.type === 'class' && (
                  <>
                    <a href={'/admin/classes'} style={{ ...btnGold, textDecoration:'none', textAlign:'center' }}>✓ Check in students</a>
                    <button style={{ ...btn, textAlign:'center' }}>👥 View registrants</button>
                    <button style={{ ...btn, textAlign:'center' }}>✏️ Edit session</button>
                    <button style={{ ...btn, color:'#A32D2D', textAlign:'center' }}>Cancel session</button>
                  </>
                )}
                {selectedEvent.type === 'appointment' && (
                  <>
                    {selectedEvent.status === 'pending' && (
                      <button style={{ ...btnGold, textAlign:'center' }} onClick={async function(){
                        await supabase.from('appointments').update({status:'confirmed'}).eq('id',selectedEvent.rawId)
                        setAppointments(function(prev){return prev.map(function(a){return 'appt-'+a.id===selectedEvent.id?{...a,status:'confirmed'}:a})})
                        setSelectedEvent(function(e){return e?{...e,status:'confirmed'}:e})
                      }}>✓ Approve appointment</button>
                    )}
                    <a href={'/admin/appointments'} style={{ ...btn, textDecoration:'none', textAlign:'center' }}>View in appointments</a>
                    <button style={{ ...btn, color:'#A32D2D', textAlign:'center' }} onClick={async function(){
                      if (!confirm('Cancel this appointment?')) return
                      await supabase.from('appointments').update({status:'cancelled'}).eq('id',selectedEvent.rawId)
                      setSelectedEvent(null)
                      loadData()
                    }}>Cancel appointment</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {selectedEvent && <div onClick={function(){setSelectedEvent(null)}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.15)', zIndex:99 }}></div>}
      </div>
    </AdminLayout>
  )
}
