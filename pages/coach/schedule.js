import { useEffect, useState } from 'react'
import CoachLayout from '../../components/coach/CoachLayout'
import { supabase } from '../../lib/supabase'

var DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
var TIMES = []
for (var h = 6; h <= 22; h++) {
  TIMES.push((h < 10 ? '0'+h : ''+h) + ':00')
  TIMES.push((h < 10 ? '0'+h : ''+h) + ':30')
}
var SLOT_DURATIONS = [30, 45, 60, 90, 120]

var DEFAULT_HOURS = {
  Monday:    { enabled: true,  start: '09:00', end: '17:00' },
  Tuesday:   { enabled: true,  start: '09:00', end: '17:00' },
  Wednesday: { enabled: true,  start: '09:00', end: '17:00' },
  Thursday:  { enabled: true,  start: '09:00', end: '17:00' },
  Friday:    { enabled: true,  start: '09:00', end: '17:00' },
  Saturday:  { enabled: false, start: '09:00', end: '13:00' },
  Sunday:    { enabled: false, start: '09:00', end: '13:00' },
}

export default function CoachSchedule() {
  var [userId, setUserId] = useState(null)
  var [weeklyHours, setWeeklyHours] = useState(DEFAULT_HOURS)
  var [slotDuration, setSlotDuration] = useState(60)
  var [bufferTime, setBufferTime] = useState(0)
  var [advanceBooking, setAdvanceBooking] = useState(30)
  var [overrides, setOverrides] = useState([])
  var [showAddOverride, setShowAddOverride] = useState(false)
  var [overrideForm, setOverrideForm] = useState({ date:'', type:'unavailable', start:'09:00', end:'17:00', note:'' })
  var [saving, setSaving] = useState(false)
  var [saved, setSaved] = useState(false)
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    async function load() {
      var s = await supabase.auth.getSession()
      if (!s.data.session) return
      setUserId(s.data.session.user.id)
      var result = await supabase.from('staff').select('availability_json').eq('id', s.data.session.user.id).single()
      if (result.data && result.data.availability_json) {
        var av = result.data.availability_json
        if (av.weekly_hours) setWeeklyHours(av.weekly_hours)
        if (av.slot_duration) setSlotDuration(av.slot_duration)
        if (av.buffer_time !== undefined) setBufferTime(av.buffer_time)
        if (av.advance_booking) setAdvanceBooking(av.advance_booking)
        if (av.overrides) setOverrides(av.overrides)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveAvailability() {
    setSaving(true)
    var payload = { weekly_hours: weeklyHours, slot_duration: slotDuration, buffer_time: bufferTime, advance_booking: advanceBooking, overrides: overrides }
    await supabase.from('staff').update({ availability_json: payload }).eq('id', userId)
    setSaving(false); setSaved(true)
    setTimeout(function(){ setSaved(false) }, 2500)
  }

  function setDayField(day, field, value) {
    setWeeklyHours(function(prev) {
      var next = {}
      Object.keys(prev).forEach(function(k){ next[k] = prev[k] })
      next[day] = {}
      Object.keys(prev[day]).forEach(function(k){ next[day][k] = prev[day][k] })
      next[day][field] = value
      return next
    })
  }

  function addOverride() {
    if (!overrideForm.date) return
    setOverrides(function(prev){ return [...prev, { ...overrideForm, id: Date.now() }] })
    setOverrideForm({ date:'', type:'unavailable', start:'09:00', end:'17:00', note:'' })
    setShowAddOverride(false)
  }

  function removeOverride(id) {
    setOverrides(function(prev){ return prev.filter(function(o){ return o.id !== id }) })
  }

  function generateSlots(start, end, duration, buffer) {
    var slots = []
    var toMins = function(t){ var p=t.split(':'); return parseInt(p[0])*60+parseInt(p[1]) }
    var startMins = toMins(start); var endMins = toMins(end); var current = startMins
    while (current + duration <= endMins) {
      var hh = Math.floor(current/60); var mm = current%60
      var ampm = hh < 12 ? 'AM' : 'PM'; var h12 = hh%12||12
      slots.push(h12+':'+(mm===0?'00':mm)+' '+ampm)
      current += duration + buffer
    }
    return slots
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { padding:'7px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', fontFamily:'inherit' }

  var enabledDays = DAYS.filter(function(d){ return weeklyHours[d] && weeklyHours[d].enabled })
  var previewDay = enabledDays[0]
  var previewSlots = previewDay ? generateSlots(weeklyHours[previewDay].start, weeklyHours[previewDay].end, slotDuration, bufferTime) : []

  if (loading) return (
    <CoachLayout active="schedule">
      <div style={{ padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px' }}>Loading your availability...</div>
    </CoachLayout>
  )

  return (
    <CoachLayout active="schedule">
      <div style={{ padding:'1.5rem 2rem', maxWidth:'760px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>My availability</div>
            <div style={{ fontSize:'13px', color:'#888', marginTop:'4px' }}>Set your weekly hours and date-specific overrides</div>
          </div>
          <button style={btnGold} onClick={saveAvailability} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save availability'}
          </button>
        </div>

        {saved && (
          <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'10px 16px', fontSize:'13px', color:'#0F6E56', fontWeight:500, marginBottom:'1rem' }}>
            ✓ Your availability has been saved successfully.
          </div>
        )}

        {/* Weekly Hours */}
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
          <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Weekly schedule</div>
          <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Toggle each day on or off and set your working hours</div>
          <div style={{ display:'grid', gap:'8px' }}>
            {DAYS.map(function(day) {
              var h = weeklyHours[day] || { enabled:false, start:'09:00', end:'17:00' }
              var slots = h.enabled ? generateSlots(h.start, h.end, slotDuration, bufferTime).length : 0
              return (
                <div key={day} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 14px', background:h.enabled?'#FFFBF0':'#f9f9f7', borderRadius:'10px', border:'0.5px solid '+(h.enabled?'rgba(212,168,67,0.3)':'rgba(0,0,0,0.06)') }}>
                  <div onClick={function(){ setDayField(day,'enabled',!h.enabled) }} style={{ width:'38px', height:'21px', borderRadius:'11px', background:h.enabled?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
                    <div style={{ position:'absolute', width:'17px', height:'17px', borderRadius:'50%', background:'#fff', top:'2px', right:h.enabled?'2px':'19px', transition:'right .15s' }}></div>
                  </div>
                  <div style={{ width:'100px', fontSize:'13px', fontWeight:h.enabled?600:400, color:h.enabled?'#1a1a1a':'#aaa', flexShrink:0 }}>{day}</div>
                  {h.enabled ? (
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', flex:1, flexWrap:'wrap' }}>
                      <select style={sel} value={h.start} onChange={function(e){ setDayField(day,'start',e.target.value) }}>
                        {TIMES.map(function(t){ return <option key={t} value={t}>{t}</option> })}
                      </select>
                      <span style={{ fontSize:'13px', color:'#888' }}>to</span>
                      <select style={sel} value={h.end} onChange={function(e){ setDayField(day,'end',e.target.value) }}>
                        {TIMES.map(function(t){ return <option key={t} value={t}>{t}</option> })}
                      </select>
                      <span style={{ fontSize:'12px', color:'#888', background:'#f1f1f1', padding:'3px 8px', borderRadius:'6px' }}>{slots} slot{slots!==1?'s':''}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize:'13px', color:'#aaa', flex:1 }}>Unavailable</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Slot Settings */}
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
          <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Booking slot settings</div>
          <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>How slots are generated from your available hours</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'20px' }}>
            <div>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:500 }}>Session duration</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                {SLOT_DURATIONS.map(function(d){ var a=slotDuration===d; return <button key={d} onClick={function(){setSlotDuration(d)}} style={{ padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(a?'#D4A843':'rgba(0,0,0,0.15)'), background:a?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:a?'#8B6914':'#666', fontWeight:a?600:400 }}>{d}m</button> })}
              </div>
            </div>
            <div>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:500 }}>Buffer between sessions</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                {[0,10,15,30].map(function(b){ var a=bufferTime===b; return <button key={b} onClick={function(){setBufferTime(b)}} style={{ padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(a?'#D4A843':'rgba(0,0,0,0.15)'), background:a?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:a?'#8B6914':'#666', fontWeight:a?600:400 }}>{b===0?'None':b+'m'}</button> })}
              </div>
            </div>
            <div>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:500 }}>Advance booking window</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                {[7,14,30,60].map(function(a){ var ac=advanceBooking===a; return <button key={a} onClick={function(){setAdvanceBooking(a)}} style={{ padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(ac?'#D4A843':'rgba(0,0,0,0.15)'), background:ac?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:ac?'#8B6914':'#666', fontWeight:ac?600:400 }}>{a}d</button> })}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        {previewDay && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Preview — {previewDay}</div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1rem' }}>
              {weeklyHours[previewDay].start} – {weeklyHours[previewDay].end} · {slotDuration}min sessions{bufferTime>0?' · '+bufferTime+'min buffer':''} · {previewSlots.length} slots
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {previewSlots.map(function(slot,i){ return <span key={i} style={{ display:'inline-block', padding:'5px 12px', borderRadius:'8px', border:'0.5px solid rgba(212,168,67,0.4)', background:'#FFFBF0', fontSize:'12px', color:'#8B6914', fontWeight:500 }}>{slot}</span> })}
              {previewSlots.length===0 && <span style={{ fontSize:'13px', color:'#aaa' }}>No slots — adjust your hours or duration</span>}
            </div>
          </div>
        )}

        {/* Date Overrides */}
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
            <div style={{ fontSize:'15px', fontWeight:600 }}>Date overrides</div>
            <button style={btn} onClick={function(){ setShowAddOverride(function(x){ return !x }) }}>+ Add override</button>
          </div>
          <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Block specific dates or set different hours for holidays and special days</div>

          {showAddOverride && (
            <div style={{ background:'#f9f9f7', borderRadius:'10px', padding:'1rem', marginBottom:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Date</div>
                  <input type="date" style={inp} value={overrideForm.date} onChange={function(e){ setOverrideForm(function(p){ return {...p,date:e.target.value} }) }} />
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Type</div>
                  <select style={inp} value={overrideForm.type} onChange={function(e){ setOverrideForm(function(p){ return {...p,type:e.target.value} }) }}>
                    <option value="unavailable">Unavailable all day</option>
                    <option value="custom_hours">Custom hours</option>
                  </select>
                </div>
                {overrideForm.type === 'custom_hours' && (
                  <>
                    <div>
                      <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Start</div>
                      <select style={inp} value={overrideForm.start} onChange={function(e){ setOverrideForm(function(p){ return {...p,start:e.target.value} }) }}>
                        {TIMES.map(function(t){ return <option key={t} value={t}>{t}</option> })}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>End</div>
                      <select style={inp} value={overrideForm.end} onChange={function(e){ setOverrideForm(function(p){ return {...p,end:e.target.value} }) }}>
                        {TIMES.map(function(t){ return <option key={t} value={t}>{t}</option> })}
                      </select>
                    </div>
                  </>
                )}
                <div style={{ gridColumn:'span 2' }}>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Note (optional)</div>
                  <input type="text" style={inp} placeholder="e.g. Holiday, personal appointment..." value={overrideForm.note} onChange={function(e){ setOverrideForm(function(p){ return {...p,note:e.target.value} }) }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button style={btn} onClick={function(){ setShowAddOverride(false) }}>Cancel</button>
                <button style={btnGold} onClick={addOverride}>Add override</button>
              </div>
            </div>
          )}

          {overrides.length === 0 && !showAddOverride && (
            <div style={{ textAlign:'center', padding:'1.5rem', color:'#aaa', fontSize:'13px' }}>
              No overrides yet. Add one to block a day or set special hours.
            </div>
          )}

          <div style={{ display:'grid', gap:'8px' }}>
            {overrides.sort(function(a,b){ return a.date>b.date?1:-1 }).map(function(o) {
              var dateLabel = new Date(o.date+'T12:00:00').toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric', year:'numeric' })
              return (
                <div key={o.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', background:'#f9f9f7', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize:'16px' }}>{o.type==='unavailable'?'🚫':'⏰'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:500 }}>{dateLabel}</div>
                    <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>
                      {o.type==='unavailable'?'Unavailable all day':'Custom hours: '+o.start+' – '+o.end}
                      {o.note?' · '+o.note:''}
                    </div>
                  </div>
                  <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:o.type==='unavailable'?'#FCEBEB':'#E1F5EE', color:o.type==='unavailable'?'#A32D2D':'#0F6E56', fontWeight:500 }}>
                    {o.type==='unavailable'?'Blocked':'Custom'}
                  </span>
                  <button onClick={function(){ removeOverride(o.id) }} style={{ ...btn, padding:'4px 10px', fontSize:'12px', color:'#A32D2D' }}>Remove</button>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ marginTop:'1.25rem', display:'flex', justifyContent:'flex-end' }}>
          <button style={{ ...btnGold, padding:'11px 28px', fontSize:'14px' }} onClick={saveAvailability} disabled={saving}>
            {saving?'Saving...':saved?'✓ Saved!':'Save availability'}
          </button>
        </div>
      </div>
    </CoachLayout>
  )
}
