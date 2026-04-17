import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

export default function Book() {
  var [services, setServices] = useState([])
  var [classes, setClasses] = useState([])
  var [sessions, setSessions] = useState([])
  var [loading, setLoading] = useState(true)
  var [tab, setTab] = useState('classes')
  var [selected, setSelected] = useState(null)
  var [bookingStep, setBookingStep] = useState(1)
  var [selectedSession, setSelectedSession] = useState(null)
  var [submitting, setSubmitting] = useState(false)
  var [success, setSuccess] = useState(false)

  useEffect(function(){
    async function load(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href = '/login'; return }
      var [svcR, clsR, sessR] = await Promise.all([
        supabase.from('services').select('*, service_categories(name)').eq('is_active',true).eq('visibility','public').order('name'),
        supabase.from('classes').select('*, locations(name)').eq('is_active',true).eq('visibility','public').order('name'),
        supabase.from('class_sessions').select('*, classes(name,color,capacity,price)').gte('starts_at', new Date().toISOString()).order('starts_at').limit(30),
      ])
      setServices(svcR.data||[])
      setClasses(clsR.data||[])
      setSessions(sessR.data||[])
      setLoading(false)
    }
    load()
  },[])

  async function bookSession(){
    setSubmitting(true)
    var s = await supabase.auth.getSession()
    if (!s.data.session) { setSubmitting(false); return }
    if (tab === 'classes' && selectedSession) {
      await supabase.from('enrollments').insert({
        class_id: selectedSession.class_id, session_id: selectedSession.id,
        customer_id: s.data.session.user.id, status:'enrolled', payment_status:'unpaid'
      })
      await supabase.from('class_sessions').update({ enrolled_count: (selectedSession.enrolled_count||0)+1 }).eq('id', selectedSession.id)
    } else if (tab === 'appointments' && selected) {
      await supabase.from('appointments').insert({
        service_id: selected.id, customer_id: s.data.session.user.id,
        coach_id: selected.coach_id, starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + selected.duration_mins*60000).toISOString(),
        status: selected.booking_mode === 'request' ? 'pending' : 'confirmed',
        total_amount: selected.price||0
      })
    }
    setSubmitting(false); setSuccess(true)
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }

  if (success) return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', maxWidth:'400px', padding:'2rem' }}>
        <div style={{ fontSize:'52px', marginBottom:'16px' }}>🎾</div>
        <div style={{ fontSize:'24px', fontWeight:700, color:'#fff', marginBottom:'10px' }}>Booking confirmed!</div>
        <p style={{ color:'rgba(255,255,255,0.5)', marginBottom:'2rem', lineHeight:1.6 }}>
          {selected && selected.booking_mode === 'request' ? 'Your request has been submitted and is awaiting coach approval. You\'ll hear back soon.' : 'Your session has been booked. See you on the court!'}
        </p>
        <a href="/portal" style={{ display:'inline-block', padding:'11px 28px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'14px', fontWeight:700 }}>Back to my portal</a>
      </div>
    </div>
  )

  return (
    <>
      <Head><title>Book a session — Hit Elite</title></Head>
      <div style={{ minHeight:'100vh', background:'#f5f5f3' }}>
        <nav style={{ background:'#0D0D0D', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', gap:'16px', position:'sticky', top:0, zIndex:50 }}>
          <a href="/portal" style={{ color:'rgba(255,255,255,0.5)', fontSize:'13px' }}>← My portal</a>
          <div style={{ fontSize:'16px', fontWeight:800, color:'#fff' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></div>
        </nav>

        <div style={{ maxWidth:'900px', margin:'0 auto', padding:'2rem 1.5rem' }}>
          <div style={{ fontSize:'24px', fontWeight:700, marginBottom:'4px' }}>Book a session</div>
          <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>Choose a class or private lesson</div>

          <div style={{ display:'flex', gap:0, borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.5rem' }}>
            {[['classes','Group classes'],['appointments','Private lessons']].map(function(t){
              var isActive = tab===t[0]
              return <button key={t[0]} onClick={function(){setTab(t[0]);setSelected(null);setSelectedSession(null);setBookingStep(1)}} style={{ padding:'10px 20px', fontSize:'14px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:isActive?'2px solid #D4A843':'2px solid transparent', color:isActive?'#D4A843':'#888', fontWeight:isActive?700:400, marginBottom:'-1px' }}>{t[1]}</button>
            })}
          </div>

          {loading && <div style={{ textAlign:'center', color:'#999', padding:'2rem', fontSize:'13px' }}>Loading sessions...</div>}

          {!loading && tab === 'classes' && !selectedSession && (
            <div style={{ display:'grid', gap:'10px' }}>
              {sessions.length === 0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888', fontSize:'13px' }}>No upcoming classes available right now.</div>}
              {sessions.map(function(s) {
                var cls = s.classes||{}
                var date = new Date(s.starts_at).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
                var time = new Date(s.starts_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
                var spotsLeft = (cls.capacity||0) - (s.enrolled_count||0)
                return (
                  <div key={s.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer' }} onClick={function(){setSelectedSession(s)}}>
                    <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>{cls.name}</div>
                      <div style={{ fontSize:'13px', color:'#888', display:'flex', gap:'16px', flexWrap:'wrap' }}>
                        <span>📅 {date}</span>
                        <span>⏰ {time}</span>
                        <span>👥 {spotsLeft} spots left</span>
                        {cls.price && <span>💳 ${parseFloat(cls.price||0).toFixed(0)}</span>}
                      </div>
                    </div>
                    <button style={{ ...btnGold, whiteSpace:'nowrap' }}>Book →</button>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && tab === 'classes' && selectedSession && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <button onClick={function(){setSelectedSession(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to classes</button>
              <div style={{ fontSize:'18px', fontWeight:700, marginBottom:'8px' }}>{selectedSession.classes && selectedSession.classes.name}</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>
                {new Date(selectedSession.starts_at).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })} at {new Date(selectedSession.starts_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}
              </div>
              <div style={{ background:'#f9f9f7', borderRadius:'8px', padding:'12px 16px', marginBottom:'1.5rem', fontSize:'13px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}><span style={{ color:'#888' }}>Session price</span><span style={{ fontWeight:600 }}>${parseFloat(selectedSession.classes&&selectedSession.classes.price||0).toFixed(2)}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'6px', borderTop:'0.5px solid rgba(0,0,0,0.08)' }}><span style={{ fontWeight:600 }}>Total</span><span style={{ fontWeight:700, color:'#1D9E75' }}>${parseFloat(selectedSession.classes&&selectedSession.classes.price||0).toFixed(2)}</span></div>
              </div>
              <button style={{ ...btnGold, width:'100%', padding:'12px', fontSize:'14px' }} onClick={bookSession} disabled={submitting}>{submitting?'Booking...':'Confirm booking'}</button>
            </div>
          )}

          {!loading && tab === 'appointments' && !selected && (
            <div style={{ display:'grid', gap:'10px' }}>
              {services.length === 0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888', fontSize:'13px' }}>No private lesson services available right now.</div>}
              {services.map(function(svc) {
                var cat = svc.service_categories ? svc.service_categories.name : ''
                return (
                  <div key={svc.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer' }} onClick={function(){setSelected(svc)}}>
                    <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:svc.color||'#D4A843', flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>{svc.name}</div>
                      <div style={{ fontSize:'13px', color:'#888', display:'flex', gap:'16px', flexWrap:'wrap' }}>
                        {cat && <span>📂 {cat}</span>}
                        <span>⏱ {svc.duration_mins}min</span>
                        <span>💳 ${parseFloat(svc.price||0).toFixed(0)}</span>
                        <span style={{ display:'inline-block', padding:'1px 7px', borderRadius:'6px', fontSize:'11px', background:svc.booking_mode==='request'?'#FAEEDA':'#E1F5EE', color:svc.booking_mode==='request'?'#854F0B':'#0F6E56', fontWeight:500 }}>{svc.booking_mode==='request'?'Request booking':'Instant book'}</span>
                      </div>
                      {svc.description && <div style={{ fontSize:'12px', color:'#aaa', marginTop:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'400px' }}>{svc.description}</div>}
                    </div>
                    <button style={{ ...btnGold, whiteSpace:'nowrap' }}>Select →</button>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && tab === 'appointments' && selected && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <button onClick={function(){setSelected(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to services</button>
              <div style={{ fontSize:'18px', fontWeight:700, marginBottom:'4px' }}>{selected.name}</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>{selected.description}</div>
              {selected.booking_mode === 'request' && (
                <div style={{ background:'#FAEEDA', border:'0.5px solid #EF9F27', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#854F0B', marginBottom:'1rem' }}>
                  This service requires coach approval. Your request will be reviewed and you'll be notified once confirmed.
                </div>
              )}
              <div style={{ background:'#f9f9f7', borderRadius:'8px', padding:'12px 16px', marginBottom:'1.5rem', fontSize:'13px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}><span style={{ color:'#888' }}>Session price</span><span style={{ fontWeight:600 }}>${parseFloat(selected.price||0).toFixed(2)}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}><span style={{ color:'#888' }}>Duration</span><span>{selected.duration_mins} minutes</span></div>
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:'6px', borderTop:'0.5px solid rgba(0,0,0,0.08)' }}><span style={{ fontWeight:600 }}>Total</span><span style={{ fontWeight:700, color:'#1D9E75' }}>${parseFloat(selected.price||0).toFixed(2)}</span></div>
              </div>
              <button style={{ ...btnGold, width:'100%', padding:'12px', fontSize:'14px' }} onClick={bookSession} disabled={submitting}>
                {submitting ? 'Processing...' : selected.booking_mode === 'request' ? 'Submit booking request' : 'Confirm and book'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
