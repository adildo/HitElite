import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

export default function CustomerPortal() {
  var [profile, setProfile] = useState(null)
  var [loading, setLoading] = useState(true)
  var [upcomingBookings, setUpcomingBookings] = useState([])
  var [recentFeedback, setRecentFeedback] = useState([])

  useEffect(function() {
    async function init() {
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href = '/login'; return }
      var p = await supabase.from('profiles').select('*').eq('id', s.data.session.user.id).single()
      if (!p.data) { window.location.href = '/login'; return }
      if (p.data.role === 'admin' || p.data.role === 'manager' || p.data.role === 'staff') { window.location.href = '/admin'; return }
      if (p.data.role === 'coach') { window.location.href = '/coach'; return }
      setProfile(p.data)
      var userId = s.data.session.user.id
      var [apptR, fbR] = await Promise.all([
        supabase.from('appointments').select('*, services(name, color)').eq('customer_id', userId).gte('starts_at', new Date().toISOString()).order('starts_at').limit(5),
        supabase.from('session_feedback').select('*, profiles!session_feedback_coach_id_fkey(full_name)').eq('customer_id', userId).eq('notes_visibility','shared').order('created_at', { ascending:false }).limit(3),
      ])
      setUpcomingBookings(apptR.data||[])
      setRecentFeedback(fbR.data||[])
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'10px' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></div>
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)' }}>Loading your portal...</div>
      </div>
    </div>
  )

  var firstName = profile && profile.full_name ? profile.full_name.split(' ')[0] : 'there'
  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }

  return (
    <>
      <Head><title>My Portal — Hit Elite</title></Head>
      <div style={{ minHeight:'100vh', background:'#f5f5f3' }}>
        <nav style={{ background:'#0D0D0D', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
          <div style={{ fontSize:'18px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <a href="/portal/book" style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)', padding:'6px 12px' }}>Book</a>
            <a href="/portal/bookings" style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)', padding:'6px 12px' }}>My bookings</a>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'#D4A843', color:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, cursor:'pointer' }} onClick={function(){window.location.href='/portal/profile'}}>
              {profile && profile.full_name ? profile.full_name.split(' ').map(function(n){return n[0]}).join('').substring(0,2) : '?'}
            </div>
            <button onClick={function(){ supabase.auth.signOut().then(function(){ window.location.href='/login' }) }} style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', border:'none', background:'none', cursor:'pointer', fontFamily:'inherit' }}>Sign out</button>
          </div>
        </nav>

        <div style={{ maxWidth:'900px', margin:'0 auto', padding:'2rem 1.5rem' }}>
          <div style={{ marginBottom:'1.5rem' }}>
            <div style={{ fontSize:'24px', fontWeight:700 }}>Welcome back, {firstName} 👋</div>
            <div style={{ fontSize:'13px', color:'#888', marginTop:'4px' }}>Here's what's happening with your training.</div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'14px', marginBottom:'1.5rem' }}>
            {[
              { icon:'🎾', title:'Book a session', desc:'Private lessons, clinics, and group classes', href:'/portal/book', color:'#D4A843' },
              { icon:'📅', title:'My bookings', desc:'View and manage your upcoming sessions', href:'/portal/bookings', color:'#185FA5' },
              { icon:'📝', title:'Coach feedback', desc:'Progress notes from your recent sessions', href:'/portal/feedback', color:'#1D9E75' },
              { icon:'👤', title:'My profile', desc:'Contact info, preferences, and payment methods', href:'/portal/profile', color:'#534AB7' },
            ].map(function(card, i) {
              return (
                <a key={i} href={card.href} style={{ textDecoration:'none' }}>
                  <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', cursor:'pointer', display:'flex', alignItems:'flex-start', gap:'14px' }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:card.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>{card.icon}</div>
                    <div>
                      <div style={{ fontSize:'15px', fontWeight:600, color:'#1a1a1a', marginBottom:'4px' }}>{card.title}</div>
                      <div style={{ fontSize:'12px', color:'#888' }}>{card.desc}</div>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>

          {upcomingBookings.length > 0 && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden', marginBottom:'1.5rem' }}>
              <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:'14px', fontWeight:600 }}>Your upcoming sessions</div>
                <a href="/portal/bookings" style={{ fontSize:'12px', color:'#D4A843', fontWeight:600 }}>View all →</a>
              </div>
              {upcomingBookings.map(function(a, i) {
                var svc = a.services ? a.services.name : 'Session'
                var date = new Date(a.starts_at).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
                var time = new Date(a.starts_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
                return (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 1.25rem', borderBottom:i<upcomingBookings.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <div style={{ width:'4px', height:'40px', borderRadius:'2px', background:a.services&&a.services.color||'#D4A843', flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:600 }}>{svc}</div>
                      <div style={{ fontSize:'12px', color:'#888' }}>{date} at {time}</div>
                    </div>
                    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:a.status==='confirmed'?'#E1F5EE':'#FAEEDA', color:a.status==='confirmed'?'#0F6E56':'#854F0B', fontWeight:500 }}>{a.status}</span>
                  </div>
                )
              })}
            </div>
          )}

          {recentFeedback.length > 0 && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize:'14px', fontWeight:600 }}>Recent coach feedback</div>
              </div>
              {recentFeedback.map(function(fb, i) {
                var coach = fb.profiles ? fb.profiles.full_name : 'Your coach'
                var date = new Date(fb.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })
                return (
                  <div key={fb.id} style={{ padding:'1rem 1.25rem', borderBottom:i<recentFeedback.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'#888' }}>{coach} · {date}</div>
                      {fb.rating && <div style={{ fontSize:'13px', color:'#D4A843' }}>{'★'.repeat(fb.rating)}</div>}
                    </div>
                    {fb.strengths && fb.strengths.length > 0 && (
                      <div style={{ marginBottom:'6px' }}>
                        <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px' }}>Strengths</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                          {fb.strengths.map(function(s){ return <span key={s} style={{ display:'inline-block', padding:'2px 8px', borderRadius:'20px', fontSize:'11px', background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>{s}</span> })}
                        </div>
                      </div>
                    )}
                    {fb.next_goal && <div style={{ fontSize:'13px', color:'#1a1a1a', marginTop:'4px' }}>🎯 <em>Next goal: {fb.next_goal}</em></div>}
                  </div>
                )
              })}
            </div>
          )}

          {upcomingBookings.length === 0 && (
            <div style={{ background:'#0D0D0D', border:'0.5px solid rgba(212,168,67,0.2)', borderRadius:'12px', padding:'2rem', textAlign:'center' }}>
              <div style={{ fontSize:'36px', marginBottom:'14px' }}>🎾</div>
              <div style={{ fontSize:'16px', fontWeight:700, color:'#fff', marginBottom:'8px' }}>Ready to get on the court?</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'1.5rem' }}>Book your first private lesson or join a group class.</div>
              <button onClick={function(){window.location.href='/portal/book'}} style={btnGold}>Browse sessions →</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
