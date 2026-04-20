import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

export default function PortalFeedback() {
  var [feedback, setFeedback] = useState([])
  var [loading, setLoading] = useState(true)
  var [expanded, setExpanded] = useState(null)

  useEffect(function(){
    async function load(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href='/login'; return }
      var r = await supabase.from('session_feedback').select('*, profiles!session_feedback_coach_id_fkey(full_name), appointments(starts_at,services(name)), class_sessions(starts_at,classes(name))').eq('customer_id',s.data.session.user.id).eq('notes_visibility','shared').order('created_at',{ascending:false})
      setFeedback(r.data||[])
      setLoading(false)
    }
    load()
  },[])

  if (loading) return <div style={{ minHeight:'100vh', background:'#f5f5f3', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ color:'#999', fontSize:'13px' }}>Loading...</div></div>

  var nav = { background:'#0D0D0D', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }

  return (
    <>
      <Head><title>Coach feedback — Hit Elite</title></Head>
      <div style={{ minHeight:'100vh', background:'#f5f5f3' }}>
        <nav style={nav}>
          <a href="/" style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', textDecoration:'none' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></a>
          <a href="/portal" style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)' }}>← My portal</a>
        </nav>

        <div style={{ maxWidth:'720px', margin:'0 auto', padding:'2rem 1.5rem' }}>
          <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'4px' }}>Coach feedback</div>
          <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>Progress notes from your sessions</div>

          {feedback.length === 0 && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'14px' }}>📝</div>
              <div style={{ fontWeight:600, marginBottom:'6px' }}>No feedback yet</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>After your sessions, your coach will leave progress notes here.</div>
              <a href="/portal/book" style={{ display:'inline-block', padding:'9px 22px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:700, textDecoration:'none' }}>Book a session →</a>
            </div>
          )}

          <div style={{ display:'grid', gap:'12px' }}>
            {feedback.map(function(fb){
              var coach = fb.profiles ? fb.profiles.full_name : 'Your coach'
              var sessionName = fb.appointments&&fb.appointments.services ? fb.appointments.services.name : fb.class_sessions&&fb.class_sessions.classes ? fb.class_sessions.classes.name : 'Session'
              var sessionDate = fb.appointments ? fb.appointments.starts_at : fb.class_sessions ? fb.class_sessions.starts_at : null
              var dateStr = sessionDate ? new Date(sessionDate).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : new Date(fb.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric'})
              var isExpanded = expanded === fb.id

              return (
                <div key={fb.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                  <div onClick={function(){setExpanded(isExpanded?null:fb.id)}} style={{ padding:'1.25rem', cursor:'pointer', display:'flex', gap:'14px' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#0D0D0D', color:'#D4A843', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, flexShrink:0 }}>
                      {coach.split(' ').map(function(n){return n[0]}).join('').substring(0,2)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div>
                          <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'2px' }}>{sessionName}</div>
                          <div style={{ fontSize:'12px', color:'#888' }}>With {coach} · {dateStr}</div>
                        </div>
                        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                          {fb.rating && <div style={{ color:'#D4A843', fontSize:'14px' }}>{'★'.repeat(fb.rating)}{'☆'.repeat(5-fb.rating)}</div>}
                          <div style={{ color:'#aaa', fontSize:'14px' }}>{isExpanded?'▲':'▼'}</div>
                        </div>
                      </div>
                      {/* Preview chips */}
                      {!isExpanded && fb.strengths && fb.strengths.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginTop:'8px' }}>
                          {fb.strengths.slice(0,3).map(function(s){ return <span key={s} style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>{s}</span> })}
                          {fb.strengths.length > 3 && <span style={{ fontSize:'11px', color:'#aaa' }}>+{fb.strengths.length-3} more</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding:'0 1.25rem 1.25rem', borderTop:'0.5px solid rgba(0,0,0,0.06)' }}>
                      {fb.strengths && fb.strengths.length > 0 && (
                        <div style={{ marginTop:'1rem' }}>
                          <div style={{ fontSize:'12px', fontWeight:600, color:'#888', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Strengths this session</div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                            {fb.strengths.map(function(s){ return <span key={s} style={{ display:'inline-block', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>{s}</span> })}
                          </div>
                        </div>
                      )}
                      {fb.focus_areas && fb.focus_areas.length > 0 && (
                        <div style={{ marginTop:'1rem' }}>
                          <div style={{ fontSize:'12px', fontWeight:600, color:'#888', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Focus areas to work on</div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                            {fb.focus_areas.map(function(f){ return <span key={f} style={{ display:'inline-block', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', background:'#FAEEDA', color:'#854F0B', fontWeight:500 }}>{f}</span> })}
                          </div>
                        </div>
                      )}
                      {fb.coach_notes && (
                        <div style={{ marginTop:'1rem' }}>
                          <div style={{ fontSize:'12px', fontWeight:600, color:'#888', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Coach notes</div>
                          <div style={{ fontSize:'13px', color:'#444', lineHeight:1.7, background:'#f9f9f7', padding:'12px 14px', borderRadius:'8px' }}>{fb.coach_notes}</div>
                        </div>
                      )}
                      {fb.next_goal && (
                        <div style={{ marginTop:'1rem', padding:'12px 14px', background:'#FFFBF0', border:'0.5px solid rgba(212,168,67,0.3)', borderRadius:'8px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
                          <span style={{ fontSize:'18px' }}>🎯</span>
                          <div>
                            <div style={{ fontSize:'12px', fontWeight:600, color:'#8B6914', marginBottom:'2px' }}>Next goal</div>
                            <div style={{ fontSize:'13px', color:'#1a1a1a' }}>{fb.next_goal}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
