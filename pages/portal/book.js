import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

var STEPS = ['type','service','datetime','addons','questions','waiver','confirm']
var STEP_LABELS = { type:'What to book', service:'Pick a service', datetime:'Choose time', addons:'Add-ons', questions:'A few questions', waiver:'Agreement', confirm:'Confirm' }

var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function NavBar({ profile }) {
  return (
    <nav style={{ background:'#0D0D0D', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
      <a href="/portal" style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', textDecoration:'none' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></a>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <a href="/portal" style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', padding:'6px 12px' }}>← My portal</a>
        {profile && <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'#D4A843', color:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700 }}>
          {(profile.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)}
        </div>}
      </div>
    </nav>
  )
}

function StepIndicator({ steps, current }) {
  var idx = steps.indexOf(current)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, padding:'1rem 2rem', background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,0.08)', overflowX:'auto' }}>
      {steps.filter(function(s){return s!=='type'}).map(function(step, i) {
        var stepIdx = steps.indexOf(step)
        var isDone = stepIdx < idx
        var isCurrent = step === current
        return (
          <div key={step} style={{ display:'flex', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'7px', whiteSpace:'nowrap' }}>
              <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:isDone?'#1D9E75':isCurrent?'#D4A843':'#f1f1f1', color:isDone||isCurrent?'#fff':'#aaa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0 }}>
                {isDone ? '✓' : i+1}
              </div>
              <span style={{ fontSize:'12px', fontWeight:isCurrent?600:400, color:isCurrent?'#1a1a1a':'#aaa' }}>{STEP_LABELS[step]}</span>
            </div>
            {i < steps.filter(function(s){return s!=='type'}).length - 1 && <div style={{ width:'32px', height:'1px', background:'rgba(0,0,0,0.1)', margin:'0 8px', flexShrink:0 }}></div>}
          </div>
        )
      })}
    </div>
  )
}

export default function Book() {
  var [profile, setProfile] = useState(null)
  var [userId, setUserId] = useState(null)
  var [step, setStep] = useState('type')
  var [bookingType, setBookingType] = useState(null) // 'class' or 'appointment'

  // Data
  var [services, setServices] = useState([])
  var [classes, setClasses] = useState([])
  var [upcomingSessions, setUpcomingSessions] = useState([])
  var [addons, setAddons] = useState([])
  var [waivers, setWaivers] = useState([])
  var [coaches, setCoaches] = useState([])

  // Selections
  var [selectedService, setSelectedService] = useState(null)
  var [selectedClass, setSelectedClass] = useState(null)
  var [selectedSession, setSelectedSession] = useState(null)
  var [selectedDate, setSelectedDate] = useState(null)
  var [selectedSlot, setSelectedSlot] = useState(null)
  var [selectedCoach, setSelectedCoach] = useState(null)
  var [selectedAddons, setSelectedAddons] = useState([])
  var [answers, setAnswers] = useState({})
  var [waiverSigned, setWaiverSigned] = useState({})
  var [waiverSignature, setWaiverSignature] = useState('')
  var [availableSlots, setAvailableSlots] = useState([])
  var [calendarDates, setCalendarDates] = useState([])

  var [loading, setLoading] = useState(true)
  var [submitting, setSubmitting] = useState(false)
  // Recurring
  var [makeRecurring, setMakeRecurring] = useState(false)
  var [recurringFrequency, setRecurringFrequency] = useState('weekly')
  var [recurringEndsOn, setRecurringEndsOn] = useState('')
  var [recurringOccurrences, setRecurringOccurrences] = useState('8')
  var [success, setSuccess] = useState(false)
  var [bookingRef, setBookingRef] = useState(null)

  useEffect(function(){
    async function init(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href='/login'; return }
      setUserId(s.data.session.user.id)
      var p = await supabase.from('profiles').select('*').eq('id',s.data.session.user.id).single()
      setProfile(p.data)
      var [svcR, clsR, addonR, waiverR, coachR] = await Promise.all([
        supabase.from('services').select('*, service_categories(name), addons:addon_ids').eq('is_active',true).eq('visibility','public').order('name'),
        supabase.from('classes').select('*, locations(name)').eq('is_active',true).eq('visibility','public').order('name'),
        supabase.from('addons').select('*').eq('is_active',true),
        supabase.from('terms_documents').select('*').eq('is_active',true),
        supabase.from('profiles').select('id,full_name,staff(availability_json,booking_approval_required)').in('role',['coach']).eq('is_active',true),
      ])
      setServices(svcR.data||[])
      setClasses(clsR.data||[])
      setAddons(addonR.data||[])
      setWaivers(waiverR.data||[])
      setCoaches(coachR.data||[])
      setLoading(false)
    }
    init()
  },[])

  // Generate available slots from coach availability
  function generateSlots(coach, date) {
    if (!coach || !coach.staff || !coach.staff[0]) return []
    var av = coach.staff[0].availability_json
    if (!av || !av.weekly_hours) return []
    var dayName = DAYS[date.getDay()]
    var dayHours = av.weekly_hours[dayName]
    if (!dayHours || !dayHours.enabled) return []
    // Check overrides
    var dateStr = date.toISOString().split('T')[0]
    var overrides = av.overrides || []
    var override = overrides.find(function(o){ return o.date === dateStr })
    if (override && override.type === 'unavailable') return []
    var start = override && override.type === 'custom_hours' ? override.start : dayHours.start
    var end = override && override.type === 'custom_hours' ? override.end : dayHours.end
    var duration = av.slot_duration || 60
    var buffer = av.buffer_time || 0
    var slots = []
    var toMins = function(t){ var p=t.split(':'); return parseInt(p[0])*60+parseInt(p[1]) }
    var startMins = toMins(start); var endMins = toMins(end); var cur = startMins
    while (cur + duration <= endMins) {
      var h = Math.floor(cur/60); var m = cur%60
      var ampm = h<12?'AM':'PM'; var h12 = h%12||12
      slots.push({ time: h12+':'+(m===0?'00':m)+' '+ampm, hour:h, minute:m })
      cur += duration + buffer
    }
    return slots
  }

  // Build calendar for next 30 days
  function buildCalendar(coach) {
    var dates = []
    var today = new Date(); today.setHours(0,0,0,0)
    var advance = 30
    if (coach && coach.staff && coach.staff[0] && coach.staff[0].availability_json && coach.staff[0].availability_json.advance_booking) {
      advance = coach.staff[0].availability_json.advance_booking
    }
    for (var i=1; i<=advance; i++) {
      var d = new Date(today); d.setDate(d.getDate()+i)
      var slots = generateSlots(coach, d)
      if (slots.length > 0) dates.push({ date:d, slots:slots })
    }
    return dates
  }

  function selectCoachAndBuildCalendar(coach) {
    setSelectedCoach(coach)
    var cal = buildCalendar(coach)
    setCalendarDates(cal)
    setSelectedDate(null)
    setSelectedSlot(null)
    setAvailableSlots([])
  }

  function selectDate(dateObj) {
    setSelectedDate(dateObj.date)
    setAvailableSlots(dateObj.slots)
    setSelectedSlot(null)
  }

  // Load upcoming class sessions
  useEffect(function(){
    if (bookingType !== 'class' || !selectedClass) return
    supabase.from('class_sessions').select('*').eq('class_id', selectedClass.id).gte('starts_at', new Date().toISOString()).order('starts_at').limit(20)
      .then(function(r){ setUpcomingSessions(r.data||[]) })
  }, [selectedClass, bookingType])

  function toggleAddon(addon) {
    setSelectedAddons(function(prev){
      var exists = prev.find(function(a){return a.id===addon.id})
      if (exists) return prev.filter(function(a){return a.id!==addon.id})
      return [...prev, addon]
    })
  }

  var totalPrice = function() {
    var base = bookingType === 'class' ? (selectedClass ? parseFloat(selectedClass.price||0) : 0) : (selectedService ? parseFloat(selectedService.price||0) : 0)
    var addonTotal = selectedAddons.reduce(function(s,a){return s+parseFloat(a.price||0)},0)
    return (base + addonTotal).toFixed(2)
  }

  var activeWaivers = waivers.filter(function(w){return w.is_active})
  var serviceAddons = bookingType === 'appointment' && selectedService
    ? addons.filter(function(a){ return selectedService.addon_ids && selectedService.addon_ids.includes(a.id) })
    : addons.slice(0,4) // show first 4 for classes

  var customQuestions = bookingType === 'appointment' && selectedService && selectedService.custom_questions
    ? (Array.isArray(selectedService.custom_questions) ? selectedService.custom_questions : [])
    : []

  async function submitBooking() {
    setSubmitting(true)
    var ref = 'HE-'+Math.random().toString(36).substring(2,8).toUpperCase()
    setBookingRef(ref)
    try {
      if (bookingType === 'class' && selectedSession) {
        await supabase.from('enrollments').insert({
          class_id: selectedClass.id, session_id: selectedSession.id,
          customer_id: userId, status:'enrolled', payment_status: parseFloat(selectedClass.price||0)===0?'free':'unpaid',
          intake_answers_json: answers
        })
        await supabase.from('class_sessions').update({ enrolled_count: (selectedSession.enrolled_count||0)+1 }).eq('id', selectedSession.id)
      } else if (bookingType === 'appointment' && selectedService && selectedSlot && selectedDate && selectedCoach) {
        var startDate = new Date(selectedDate)
        startDate.setHours(selectedSlot.hour, selectedSlot.minute, 0, 0)
        var duration = selectedService.duration_mins || 60
        var endDate = new Date(startDate.getTime() + duration*60000)
        var status = selectedService.booking_mode === 'request' ? 'pending' : 'confirmed'
        var apptResult = await supabase.from('appointments').insert({
          service_id: selectedService.id, customer_id: userId, coach_id: selectedCoach.id,
          starts_at: startDate.toISOString(), ends_at: endDate.toISOString(),
          status: status, total_amount: parseFloat(totalPrice()),
          payment_status: 'unpaid', intake_answers_json: answers,
          addons_json: selectedAddons
        })
        // If recurring, create the recurring rule
        if (makeRecurring) {
          var endsOn = recurringEndsOn || null
          await supabase.from('recurring_appointments').insert({
            customer_id: userId, service_id: selectedService.id, coach_id: selectedCoach.id,
            frequency: recurringFrequency, day_of_week: startDate.getDay(),
            start_time: selectedSlot.hour + ':' + (selectedSlot.minute === 0 ? '00' : selectedSlot.minute),
            starts_on: startDate.toISOString().split('T')[0],
            ends_on: endsOn, max_occurrences: parseInt(recurringOccurrences) || null,
            status: 'active'
          })
        }
        // Save waiver signatures
        for (var waiverId of Object.keys(waiverSigned)) {
          if (waiverSigned[waiverId]) {
            var doc = waivers.find(function(w){return w.id===waiverId})
            if (doc) {
              await supabase.from('signed_agreements').insert({
                customer_id: userId, document_id: waiverId,
                document_version: doc.version||1, signature_data: waiverSignature,
                ip_address: 'web'
              })
            }
          }
        }
      }
      setSuccess(true)
    } catch(e) { console.error(e) }
    setSubmitting(false)
  }

  var btn = { padding:'10px 20px', borderRadius:'8px', fontSize:'14px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:700 }
  var btnGoldLg = { ...btnGold, padding:'13px 32px', fontSize:'15px', width:'100%' }

  var steps = bookingType === 'class'
    ? ['type','service','datetime','questions','waiver','confirm']
    : ['type','service','datetime','addons','questions','waiver','confirm']

  // Success screen
  if (success) return (
    <>
      <Head><title>Booking confirmed — Hit Elite</title></Head>
      <NavBar profile={profile} />
      <div style={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', background:'#f5f5f3' }}>
        <div style={{ textAlign:'center', maxWidth:'460px' }}>
          <div style={{ width:'70px', height:'70px', borderRadius:'50%', background:'#E1F5EE', color:'#1D9E75', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', margin:'0 auto 1.25rem' }}>✓</div>
          <div style={{ fontSize:'24px', fontWeight:700, marginBottom:'8px' }}>
            {bookingType==='appointment' && selectedService && selectedService.booking_mode==='request' ? 'Request submitted!' : 'You\'re booked!'}
          </div>
          <div style={{ fontSize:'14px', color:'#666', lineHeight:1.7, marginBottom:'1.5rem' }}>
            {bookingType === 'class' ? (
              <>Your spot in <strong>{selectedClass&&selectedClass.name}</strong> on <strong>{selectedSession&&new Date(selectedSession.starts_at).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</strong> is confirmed.</>
            ) : selectedService && selectedService.booking_mode === 'request' ? (
              <>Your request for <strong>{selectedService&&selectedService.name}</strong> has been submitted. Your coach will confirm shortly.</>
            ) : (
              <>Your <strong>{selectedService&&selectedService.name}</strong> with <strong>{selectedCoach&&selectedCoach.full_name}</strong> on <strong>{selectedDate&&selectedDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</strong> at <strong>{selectedSlot&&selectedSlot.time}</strong> is confirmed.</>
            )}
          </div>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.5rem', textAlign:'left', fontSize:'13px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}><span style={{ color:'#888' }}>Booking reference</span><span style={{ fontFamily:'monospace', fontWeight:700, background:'#f5f5f3', padding:'2px 8px', borderRadius:'4px' }}>{bookingRef}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', borderTop:'0.5px solid rgba(0,0,0,0.06)', paddingTop:'8px' }}><span style={{ fontWeight:600 }}>Total</span><span style={{ fontWeight:700, color:'#1D9E75' }}>{parseFloat(totalPrice())===0?'Free':'$'+totalPrice()}</span></div>
          </div>
          <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
            <a href="/portal/bookings" style={{ ...btnGold, textDecoration:'none' }}>View my bookings</a>
            <a href="/portal" style={{ ...btn, textDecoration:'none' }}>Back to portal</a>
          </div>
        </div>
      </div>
    </>
  )

  // Loading
  if (loading) return (
    <>
      <Head><title>Book a session — Hit Elite</title></Head>
      <NavBar profile={profile} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
        <div style={{ textAlign:'center', color:'#888', fontSize:'13px' }}>Loading...</div>
      </div>
    </>
  )

  return (
    <>
      <Head><title>Book a session — Hit Elite</title></Head>
      <NavBar profile={profile} />
      {step !== 'type' && <StepIndicator steps={steps} current={step} />}

      <div style={{ maxWidth:'720px', margin:'0 auto', padding:'2rem 1.5rem' }}>

        {/* STEP: Type */}
        {step === 'type' && (
          <div>
            <div style={{ fontSize:'26px', fontWeight:700, marginBottom:'6px' }}>What would you like to book?</div>
            <div style={{ fontSize:'14px', color:'#888', marginBottom:'2rem' }}>Choose between group classes and one-on-one private lessons</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              {[
                { type:'class', icon:'👥', title:'Group class', desc:'Join a scheduled group session with other players. Drop-in or cohort formats.', color:'#D4A843', count:classes.length },
                { type:'appointment', icon:'🎾', title:'Private lesson', desc:'Book a one-on-one session with a coach at a time that works for you.', color:'#534AB7', count:services.length },
              ].map(function(opt) {
                return (
                  <div key={opt.type} onClick={function(){ setBookingType(opt.type); setStep('service') }}
                    style={{ background:'#fff', border:'2px solid rgba(0,0,0,0.08)', borderRadius:'16px', padding:'2rem', cursor:'pointer', textAlign:'center', transition:'border-color 0.15s' }}>
                    <div style={{ fontSize:'48px', marginBottom:'16px' }}>{opt.icon}</div>
                    <div style={{ fontSize:'18px', fontWeight:700, marginBottom:'8px' }}>{opt.title}</div>
                    <div style={{ fontSize:'13px', color:'#666', lineHeight:1.6, marginBottom:'14px' }}>{opt.desc}</div>
                    <div style={{ fontSize:'12px', color:opt.color, fontWeight:600 }}>{opt.count} available →</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP: Service */}
        {step === 'service' && (
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, marginBottom:'4px' }}>{bookingType==='class'?'Choose a class':'Choose a service'}</div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>{bookingType==='class'?classes.length:services.length} available</div>
            <div style={{ display:'grid', gap:'10px' }}>
              {bookingType === 'class' && classes.map(function(cls) {
                var loc = cls.locations ? cls.locations.name : 'TBD'
                return (
                  <div key={cls.id} onClick={function(){setSelectedClass(cls);setStep('datetime')}}
                    style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer' }}>
                    <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>{cls.name}</div>
                      <div style={{ fontSize:'12px', color:'#888', display:'flex', gap:'14px', flexWrap:'wrap' }}>
                        <span>⏱ {cls.duration_mins}min</span>
                        <span>📍 {loc}</span>
                        <span>👥 Max {cls.capacity}</span>
                        <span style={{ color:'#1D9E75', fontWeight:600 }}>{parseFloat(cls.price||0)===0?'Free':'$'+parseFloat(cls.price||0).toFixed(0)}/session</span>
                      </div>
                      {cls.description && <div style={{ fontSize:'12px', color:'#aaa', marginTop:'5px', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{cls.description}</div>}
                    </div>
                    <div style={{ color:'#D4A843', fontSize:'18px', flexShrink:0 }}>→</div>
                  </div>
                )
              })}
              {bookingType === 'appointment' && services.map(function(svc) {
                var cat = svc.service_categories ? svc.service_categories.name : ''
                return (
                  <div key={svc.id} onClick={function(){setSelectedService(svc);setStep('datetime')}}
                    style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer' }}>
                    <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:svc.color||'#534AB7', flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>{svc.name}</div>
                      <div style={{ fontSize:'12px', color:'#888', display:'flex', gap:'14px', flexWrap:'wrap' }}>
                        {cat && <span>📂 {cat}</span>}
                        <span>⏱ {svc.duration_mins}min</span>
                        <span style={{ color:'#1D9E75', fontWeight:600 }}>${parseFloat(svc.price||0).toFixed(0)}</span>
                        <span style={{ display:'inline-block', padding:'1px 7px', borderRadius:'5px', fontSize:'11px', background:svc.booking_mode==='request'?'#FAEEDA':'#E1F5EE', color:svc.booking_mode==='request'?'#854F0B':'#0F6E56', fontWeight:500 }}>
                          {svc.booking_mode==='request'?'Request':'Instant book'}
                        </span>
                      </div>
                      {svc.description && <div style={{ fontSize:'12px', color:'#aaa', marginTop:'5px', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{svc.description}</div>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:'18px', fontWeight:700, color:'#534AB7' }}>${parseFloat(svc.price||0).toFixed(0)}</div>
                      <div style={{ fontSize:'11px', color:'#aaa' }}>{svc.duration_mins}min</div>
                    </div>
                  </div>
                )
              })}
              {bookingType==='class' && classes.length===0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>No classes available right now.</div>}
              {bookingType==='appointment' && services.length===0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>No services available right now.</div>}
            </div>
            <button style={{ ...btn, marginTop:'1.25rem' }} onClick={function(){setStep('type')}}>← Back</button>
          </div>
        )}

        {/* STEP: Date/Time */}
        {step === 'datetime' && (
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, marginBottom:'4px' }}>Choose a date and time</div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>
              {bookingType==='class' ? 'Pick an upcoming session for '+selectedClass.name : 'Select a coach and available slot'}
            </div>

            {/* CLASSES: show upcoming sessions */}
            {bookingType === 'class' && (
              <div style={{ display:'grid', gap:'10px' }}>
                {upcomingSessions.length === 0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px' }}>No upcoming sessions scheduled. Check back soon.</div>}
                {upcomingSessions.map(function(sess) {
                  var spotsLeft = (selectedClass.capacity||0) - (sess.enrolled_count||0)
                  var date = new Date(sess.starts_at).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})
                  var time = new Date(sess.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
                  var full = spotsLeft <= 0
                  return (
                    <div key={sess.id} onClick={function(){if(!full){setSelectedSession(sess);var next=steps[steps.indexOf('datetime')+1];setStep(next)}}}
                      style={{ background:full?'#f9f9f7':'#fff', border:'0.5px solid '+(selectedSession&&selectedSession.id===sess.id?'#D4A843':'rgba(0,0,0,0.08)'), borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px', cursor:full?'not-allowed':'pointer', opacity:full?0.6:1 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'5px' }}>{date}</div>
                        <div style={{ fontSize:'13px', color:'#888', display:'flex', gap:'14px', flexWrap:'wrap' }}>
                          <span>⏰ {time}</span>
                          <span style={{ color:spotsLeft<=2?'#A32D2D':spotsLeft<=5?'#BA7517':'#1D9E75', fontWeight:500 }}>
                            {full ? 'Full' : spotsLeft+' spot'+(spotsLeft!==1?'s':'')+' left'}
                          </span>
                        </div>
                      </div>
                      {full ? <span style={{ fontSize:'12px', color:'#A32D2D', fontWeight:500 }}>Full</span> : <div style={{ color:'#D4A843', fontSize:'18px' }}>→</div>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* APPOINTMENTS: coach + date + time picker */}
            {bookingType === 'appointment' && (
              <div>
                {/* Coach selection */}
                <div style={{ marginBottom:'1.25rem' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px', color:'#666' }}>Select a coach</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'10px' }}>
                    {coaches.map(function(coach) {
                      var initials = (coach.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                      var isSelected = selectedCoach && selectedCoach.id === coach.id
                      var hasAvailability = coach.staff && coach.staff[0] && coach.staff[0].availability_json && coach.staff[0].availability_json.weekly_hours
                      return (
                        <div key={coach.id} onClick={function(){selectCoachAndBuildCalendar(coach)}}
                          style={{ background:'#fff', border:'2px solid '+(isSelected?'#D4A843':'rgba(0,0,0,0.08)'), borderRadius:'12px', padding:'1rem', textAlign:'center', cursor:'pointer' }}>
                          <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:isSelected?'#D4A843':'#0D0D0D', color:isSelected?'#0D0D0D':'#D4A843', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:700, margin:'0 auto 8px' }}>{initials}</div>
                          <div style={{ fontSize:'13px', fontWeight:600 }}>{coach.full_name}</div>
                          <div style={{ fontSize:'11px', color:hasAvailability?'#1D9E75':'#aaa', marginTop:'3px' }}>{hasAvailability?'Available':'No availability set'}</div>
                        </div>
                      )
                    })}
                    {coaches.length === 0 && <div style={{ gridColumn:'span 3', textAlign:'center', color:'#888', fontSize:'13px', padding:'1rem' }}>No coaches available.</div>}
                  </div>
                </div>

                {/* Calendar */}
                {selectedCoach && calendarDates.length === 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px' }}>
                    {selectedCoach.full_name} hasn't set their availability yet. Please contact us to book manually.
                  </div>
                )}

                {selectedCoach && calendarDates.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                    {/* Date list */}
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px', color:'#666' }}>Available dates</div>
                      <div style={{ display:'grid', gap:'6px', maxHeight:'320px', overflowY:'auto' }}>
                        {calendarDates.map(function(dateObj, i) {
                          var d = dateObj.date
                          var isSelected = selectedDate && selectedDate.toDateString() === d.toDateString()
                          return (
                            <div key={i} onClick={function(){selectDate(dateObj)}}
                              style={{ padding:'10px 14px', borderRadius:'10px', border:'0.5px solid '+(isSelected?'#D4A843':'rgba(0,0,0,0.08)'), background:isSelected?'#FFFBF0':'#fff', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <div>
                                <div style={{ fontSize:'13px', fontWeight:isSelected?600:400 }}>{DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}</div>
                                <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>{dateObj.slots.length} slot{dateObj.slots.length!==1?'s':''} available</div>
                              </div>
                              <div style={{ color:isSelected?'#D4A843':'#ccc' }}>→</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Time slots */}
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px', color:'#666' }}>
                        {selectedDate ? 'Available times — '+DAYS[selectedDate.getDay()]+', '+MONTHS[selectedDate.getMonth()]+' '+selectedDate.getDate() : 'Select a date first'}
                      </div>
                      {selectedDate && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                          {availableSlots.map(function(slot, i) {
                            var isSelected = selectedSlot && selectedSlot.time === slot.time
                            return (
                              <div key={i} onClick={function(){setSelectedSlot(slot)}}
                                style={{ padding:'10px 12px', borderRadius:'8px', border:'0.5px solid '+(isSelected?'#D4A843':'rgba(0,0,0,0.1)'), background:isSelected?'#FFFBF0':'#fff', cursor:'pointer', textAlign:'center', fontSize:'13px', fontWeight:isSelected?600:400, color:isSelected?'#8B6914':'#1a1a1a' }}>
                                {slot.time}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {!selectedDate && <div style={{ background:'#f9f9f7', borderRadius:'10px', padding:'2rem', textAlign:'center', color:'#aaa', fontSize:'13px' }}>← Pick a date to see available times</div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display:'flex', gap:'10px', marginTop:'1.5rem' }}>
              <button style={btn} onClick={function(){setStep('service')}}>← Back</button>
              {bookingType==='appointment' && selectedSlot && (
                <button style={btnGold} onClick={function(){setStep(steps[steps.indexOf('datetime')+1])}}>Continue →</button>
              )}
            </div>
          </div>
        )}

        {/* STEP: Add-ons */}
        {step === 'addons' && (
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, marginBottom:'4px' }}>Enhance your session</div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>Optional add-ons to make the most of your time on court</div>

            {serviceAddons.length === 0 && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px', marginBottom:'1.25rem' }}>
                No add-ons available for this service.
              </div>
            )}

            <div style={{ display:'grid', gap:'10px', marginBottom:'1.5rem' }}>
              {serviceAddons.map(function(addon) {
                var isSelected = selectedAddons.find(function(a){return a.id===addon.id})
                return (
                  <div key={addon.id} onClick={function(){toggleAddon(addon)}}
                    style={{ background:'#fff', border:'2px solid '+(isSelected?'#D4A843':'rgba(0,0,0,0.08)'), borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer' }}>
                    <div style={{ width:'22px', height:'22px', borderRadius:'50%', border:'2px solid '+(isSelected?'#D4A843':'rgba(0,0,0,0.2)'), background:isSelected?'#D4A843':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {isSelected && <div style={{ color:'#0D0D0D', fontSize:'12px', fontWeight:700 }}>✓</div>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'3px' }}>{addon.name}</div>
                      {addon.description && <div style={{ fontSize:'12px', color:'#888' }}>{addon.description}</div>}
                      {addon.duration_added_mins > 0 && <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>+{addon.duration_added_mins} min to session</div>}
                    </div>
                    <div style={{ fontSize:'15px', fontWeight:700, color:'#1D9E75', flexShrink:0 }}>+${parseFloat(addon.price||0).toFixed(0)}</div>
                  </div>
                )
              })}
            </div>

            {selectedAddons.length > 0 && (
              <div style={{ background:'#f9f9f7', borderRadius:'10px', padding:'12px 16px', marginBottom:'1.25rem', fontSize:'13px' }}>
                <div style={{ fontWeight:600, marginBottom:'6px' }}>Selected add-ons</div>
                {selectedAddons.map(function(a){ return <div key={a.id} style={{ display:'flex', justifyContent:'space-between', color:'#666', marginBottom:'3px' }}><span>{a.name}</span><span>+${parseFloat(a.price||0).toFixed(2)}</span></div> })}
              </div>
            )}

            <div style={{ display:'flex', gap:'10px' }}>
              <button style={btn} onClick={function(){setStep(steps[steps.indexOf('addons')-1])}}>← Back</button>
              <button style={btnGold} onClick={function(){setStep(steps[steps.indexOf('addons')+1])}}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP: Questions */}
        {step === 'questions' && (
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, marginBottom:'4px' }}>A few questions</div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>Help your coach prepare for your session</div>

            {customQuestions.length === 0 ? (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px', marginBottom:'1.5rem' }}>
                No intake questions for this booking. You're good to go!
              </div>
            ) : (
              <div style={{ display:'grid', gap:'16px', marginBottom:'1.5rem' }}>
                {customQuestions.map(function(q, i) {
                  return (
                    <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                      <div style={{ fontSize:'14px', fontWeight:500, marginBottom:'10px' }}>{q.question||q.label||'Question '+(i+1)}{q.required && <span style={{ color:'#A32D2D', marginLeft:'4px' }}>*</span>}</div>
                      {(!q.type || q.type === 'text') && (
                        <textarea style={{ width:'100%', padding:'10px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', resize:'none', height:'70px', outline:'none', fontFamily:'inherit' }}
                          value={answers[i]||''} onChange={function(e){var v=e.target.value;setAnswers(function(p){var n={...p};n[i]=v;return n})}} placeholder="Your answer..." />
                      )}
                      {q.type === 'select' && q.options && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                          {q.options.map(function(opt){ return (
                            <button key={opt} onClick={function(){setAnswers(function(p){var n={...p};n[i]=opt;return n})}}
                              style={{ padding:'7px 14px', borderRadius:'8px', border:'0.5px solid '+(answers[i]===opt?'#D4A843':'rgba(0,0,0,0.15)'), background:answers[i]===opt?'#F5E6C0':'transparent', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', color:answers[i]===opt?'#8B6914':'#666', fontWeight:answers[i]===opt?600:400 }}>{opt}</button>
                          )})}
                        </div>
                      )}
                      {q.type === 'yesno' && (
                        <div style={{ display:'flex', gap:'10px' }}>
                          {['Yes','No'].map(function(opt){ return (
                            <button key={opt} onClick={function(){setAnswers(function(p){var n={...p};n[i]=opt;return n})}}
                              style={{ padding:'9px 28px', borderRadius:'8px', border:'0.5px solid '+(answers[i]===opt?'#D4A843':'rgba(0,0,0,0.15)'), background:answers[i]===opt?'#F5E6C0':'transparent', fontSize:'14px', cursor:'pointer', fontFamily:'inherit', color:answers[i]===opt?'#8B6914':'#666', fontWeight:answers[i]===opt?600:400 }}>{opt}</button>
                          )})}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ display:'flex', gap:'10px' }}>
              <button style={btn} onClick={function(){setStep(steps[steps.indexOf('questions')-1])}}>← Back</button>
              <button style={btnGold} onClick={function(){setStep(steps[steps.indexOf('questions')+1])}}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP: Waiver */}
        {step === 'waiver' && (
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, marginBottom:'4px' }}>Terms & agreements</div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>Please read and sign the following before confirming your booking</div>

            {activeWaivers.length === 0 ? (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px', marginBottom:'1.5rem' }}>
                No agreements required. You're all set!
              </div>
            ) : (
              <div style={{ display:'grid', gap:'14px', marginBottom:'1.5rem' }}>
                {activeWaivers.map(function(doc) {
                  var isSigned = waiverSigned[doc.id]
                  return (
                    <div key={doc.id} style={{ background:'#fff', border:'0.5px solid '+(isSigned?'#5DCAA5':'rgba(0,0,0,0.08)'), borderRadius:'12px', overflow:'hidden' }}>
                      <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontSize:'14px', fontWeight:600 }}>{doc.title}</div>
                          <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>{doc.type} · Version {doc.version||1}</div>
                        </div>
                        {isSigned && <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'#1D9E75', fontWeight:600 }}>✓ Signed</span>}
                      </div>
                      {doc.content_html && (
                        <div style={{ padding:'1.25rem', maxHeight:'180px', overflowY:'auto', fontSize:'13px', color:'#444', lineHeight:1.7, background:'#fafafa', whiteSpace:'pre-wrap' }}>
                          {doc.content_html}
                        </div>
                      )}
                      {!isSigned && (
                        <div style={{ padding:'1rem 1.25rem', borderTop:'0.5px solid rgba(0,0,0,0.06)', background:'#f9f9f7' }}>
                          <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px' }}>Type your full name to sign:</div>
                          <div style={{ display:'flex', gap:'10px' }}>
                            <input type="text" placeholder={profile ? profile.full_name : 'Your full name'}
                              style={{ flex:1, padding:'9px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', outline:'none', fontFamily:'inherit' }}
                              value={waiverSignature} onChange={function(e){setWaiverSignature(e.target.value)}} />
                            <button style={{ ...btnGold, padding:'9px 18px', whiteSpace:'nowrap' }}
                              onClick={function(){
                                if (!waiverSignature.trim()) return
                                setWaiverSigned(function(p){var n={...p};n[doc.id]=true;return n})
                              }}>I agree & sign</button>
                          </div>
                          <div style={{ fontSize:'11px', color:'#aaa', marginTop:'6px' }}>Your signature, timestamp, and IP address will be recorded for this agreement.</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ display:'flex', gap:'10px' }}>
              <button style={btn} onClick={function(){setStep(steps[steps.indexOf('waiver')-1])}}>← Back</button>
              <button style={btnGold}
                disabled={activeWaivers.length > 0 && activeWaivers.some(function(w){return !waiverSigned[w.id]})}
                onClick={function(){setStep('confirm')}}
                style={{ ...btnGold, opacity: activeWaivers.length > 0 && activeWaivers.some(function(w){return !waiverSigned[w.id]})?0.5:1 }}>
                Continue →
              </button>
            </div>
            {activeWaivers.length > 0 && activeWaivers.some(function(w){return !waiverSigned[w.id]}) && (
              <div style={{ fontSize:'12px', color:'#A32D2D', marginTop:'8px' }}>Please sign all agreements above to continue.</div>
            )}
          </div>
        )}

        {/* STEP: Confirm */}
        {step === 'confirm' && (
          <div>
            <div style={{ fontSize:'20px', fontWeight:700, marginBottom:'4px' }}>Review your booking</div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>Double-check everything before confirming</div>

            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem', paddingBottom:'10px', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>Booking summary</div>
              <div style={{ display:'grid', gap:'10px', fontSize:'13px' }}>
                {[
                  ['Type', bookingType==='class'?'Group class':'Private lesson'],
                  bookingType==='class' ? ['Class', selectedClass&&selectedClass.name] : ['Service', selectedService&&selectedService.name],
                  bookingType==='class' ? ['Date', selectedSession&&new Date(selectedSession.starts_at).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})] : ['Date', selectedDate&&selectedDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})],
                  bookingType==='class' ? ['Time', selectedSession&&new Date(selectedSession.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})] : ['Time', selectedSlot&&selectedSlot.time],
                  bookingType==='appointment' ? ['Coach', selectedCoach&&selectedCoach.full_name] : null,
                  bookingType==='appointment' && selectedService && selectedService.booking_mode==='request' ? ['Booking type', 'Request — awaiting coach approval'] : null,
                ].filter(Boolean).map(function(row,i){ return (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ color:'#888' }}>{row[0]}</span>
                    <span style={{ fontWeight:500 }}>{row[1]}</span>
                  </div>
                )})}

                {selectedAddons.length > 0 && selectedAddons.map(function(a,i){ return (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', paddingLeft:'12px', fontSize:'12px' }}>
                    <span style={{ color:'#888' }}>+ {a.name}</span>
                    <span>+${parseFloat(a.price||0).toFixed(2)}</span>
                  </div>
                )})}

                <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', borderTop:'1.5px solid rgba(0,0,0,0.1)', marginTop:'4px' }}>
                  <span style={{ fontWeight:700, fontSize:'15px' }}>Total</span>
                  <span style={{ fontWeight:800, fontSize:'18px', color:parseFloat(totalPrice())===0?'#1D9E75':'#1a1a1a' }}>{parseFloat(totalPrice())===0?'Free':'$'+totalPrice()}</span>
                </div>
              </div>
            </div>

            {parseFloat(totalPrice()) > 0 && (
              <div style={{ background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#8B6914', marginBottom:'1.25rem', display:'flex', gap:'10px', alignItems:'center' }}>
                <span style={{ fontSize:'18px' }}>💳</span>
                <span>Payment of <strong>${totalPrice()}</strong> will be collected at the session or via invoice. Online payments coming soon.</span>
              </div>
            )}

            {/* Recurring toggle for appointments */}
            {bookingType === 'appointment' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:makeRecurring?'1rem':'0' }}>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:600 }}>Make this a recurring booking</div>
                    <div style={{ fontSize:'12px', color:'#888', marginTop:'3px' }}>Automatically repeat this session at the same time</div>
                  </div>
                  <div onClick={function(){setMakeRecurring(function(v){return !v})}} style={{ width:'42px', height:'23px', borderRadius:'12px', background:makeRecurring?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
                    <div style={{ position:'absolute', width:'19px', height:'19px', borderRadius:'50%', background:'#fff', top:'2px', right:makeRecurring?'2px':'21px', transition:'right .15s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}></div>
                  </div>
                </div>
                {makeRecurring && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', paddingTop:'1rem', borderTop:'0.5px solid rgba(0,0,0,0.08)' }}>
                    <div>
                      <div style={{ fontSize:'12px', color:'#666', marginBottom:'6px', fontWeight:500 }}>Repeat</div>
                      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                        {[['weekly','Weekly'],['biweekly','Every 2 weeks'],['monthly','Monthly']].map(function(f){
                          var active = recurringFrequency === f[0]
                          return <button key={f[0]} onClick={function(){setRecurringFrequency(f[0])}} style={{ padding:'6px 12px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{f[1]}</button>
                        })}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:'12px', color:'#666', marginBottom:'6px', fontWeight:500 }}>Number of sessions</div>
                      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                        {['4','8','12','24','ongoing'].map(function(n){
                          var active = recurringOccurrences === n
                          return <button key={n} onClick={function(){setRecurringOccurrences(n)}} style={{ padding:'6px 12px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{n==='ongoing'?'Ongoing':n}</button>
                        })}
                      </div>
                    </div>
                    <div style={{ gridColumn:'span 2' }}>
                      <div style={{ background:'#E1F5EE', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#0F6E56' }}>
                        ✓ Your coach will receive {recurringOccurrences==='ongoing'?'an ongoing':'a '+recurringOccurrences+'-session'} {recurringFrequency==='biweekly'?'biweekly':recurringFrequency} recurring schedule starting {selectedDate&&selectedDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} at {selectedSlot&&selectedSlot.time}.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recurring toggle for class sessions */}
            {bookingType === 'class' && selectedClass && selectedClass.type !== 'cohort' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:makeRecurring?'1rem':'0' }}>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:600 }}>Book multiple upcoming sessions</div>
                    <div style={{ fontSize:'12px', color:'#888', marginTop:'3px' }}>Reserve your spot for several sessions at once</div>
                  </div>
                  <div onClick={function(){setMakeRecurring(function(v){return !v})}} style={{ width:'42px', height:'23px', borderRadius:'12px', background:makeRecurring?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
                    <div style={{ position:'absolute', width:'19px', height:'19px', borderRadius:'50%', background:'#fff', top:'2px', right:makeRecurring?'2px':'21px', transition:'right .15s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}></div>
                  </div>
                </div>
                {makeRecurring && (
                  <div style={{ paddingTop:'1rem', borderTop:'0.5px solid rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:500 }}>How many sessions to book?</div>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      {['2','4','6','8','all'].map(function(n){
                        var active = recurringOccurrences === n
                        return <button key={n} onClick={function(){setRecurringOccurrences(n)}} style={{ padding:'6px 14px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{n==='all'?'All upcoming':n+' sessions'}</button>
                      })}
                    </div>
                    <div style={{ background:'#E1F5EE', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#0F6E56', marginTop:'10px' }}>
                      ✓ You will be enrolled in {recurringOccurrences==='all'?'all upcoming sessions':recurringOccurrences+' upcoming sessions'} of {selectedClass&&selectedClass.name}.
                    </div>
                  </div>
                )}
              </div>
            )}

            <button style={btnGoldLg} onClick={submitBooking} disabled={submitting}>
              {submitting ? 'Booking...' : bookingType==='appointment' && selectedService && selectedService.booking_mode==='request' ? 'Submit booking request' : 'Confirm booking'}
            </button>
            <button style={{ ...btn, width:'100%', marginTop:'10px', textAlign:'center' }} onClick={function(){setStep(steps[steps.indexOf('confirm')-1])}}>← Go back</button>
          </div>
        )}
      </div>
    </>
  )
}
