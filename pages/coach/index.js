import { useEffect, useState } from 'react'
import CoachLayout from '../../components/coach/CoachLayout'
import { supabase } from '../../lib/supabase'

export default function CoachDashboard() {
  var [profile, setProfile] = useState(null)
  var [upcoming, setUpcoming] = useState([])
  var [pendingFeedback, setPendingFeedback] = useState([])
  var [stats, setStats] = useState({ todayCount:0, weekCount:0, pendingRequests:0 })

  useEffect(function() {
    async function load() {
      var s = await supabase.auth.getSession()
      if (!s.data.session) return
      var userId = s.data.session.user.id
      var p = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(p.data)
      var today = new Date().toISOString().split('T')[0]
      var weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate()+7)
      var [upR, todayR, weekR, pendR] = await Promise.all([
        supabase.from('appointments').select('*, profiles!appointments_customer_id_fkey(full_name), services(name, color)').eq('coach_id', userId).gte('starts_at', new Date().toISOString()).order('starts_at').limit(8),
        supabase.from('appointments').select('id', { count:'exact' }).eq('coach_id', userId).gte('starts_at', today).lt('starts_at', today+'T23:59:59'),
        supabase.from('appointments').select('id', { count:'exact' }).eq('coach_id', userId).gte('starts_at', new Date().toISOString()).lte('starts_at', weekEnd.toISOString()),
        supabase.from('appointments').select('id', { count:'exact' }).eq('coach_id', userId).eq('status', 'pending'),
      ])
      setUpcoming(upR.data||[])
      setStats({ todayCount:todayR.count||0, weekCount:weekR.count||0, pendingRequests:pendR.count||0 })
    }
    load()
  }, [])

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }

  return (
    <CoachLayout active="dashboard">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'22px', fontWeight:700 }}>Welcome back, {profile ? (profile.full_name||'Coach').split(' ')[0] : 'Coach'} 👋</div>
          <div style={{ fontSize:'13px', color:'#888' }}>{new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'12px', marginBottom:'1.5rem' }}>
          {[['Sessions today',stats.todayCount,'#D4A843'],['Sessions this week',stats.weekCount,'#185FA5'],['Pending requests',stats.pendingRequests,'#BA7517']].map(function(m,i){
            return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'11px', color:'#888', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{m[0]}</div>
              <div style={{ fontSize:'28px', fontWeight:800, color:m[2] }}>{m[1]}</div>
            </div>
          })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:'14px', fontWeight:600 }}>Upcoming sessions</div>
              <a href="/coach/appointments" style={{ fontSize:'12px', color:'#D4A843', fontWeight:600 }}>View all →</a>
            </div>
            {upcoming.length === 0 ? (
              <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No upcoming sessions scheduled.</div>
            ) : upcoming.map(function(a, i) {
              var cust = a.profiles ? a.profiles.full_name : '—'
              var svc = a.services ? a.services.name : 'Session'
              var date = new Date(a.starts_at).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
              var time = new Date(a.starts_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
              var initials = cust.split(' ').map(function(n){return n[0]}).join('').substring(0,2)
              return (
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 1.25rem', borderBottom:i<upcoming.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                  <div style={{ width:'4px', height:'36px', borderRadius:'2px', background:a.services&&a.services.color||'#D4A843', flexShrink:0 }}></div>
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0 }}>{initials}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:500 }}>{cust}</div>
                    <div style={{ fontSize:'11px', color:'#888' }}>{svc} · {date} {time}</div>
                  </div>
                  <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:a.status==='confirmed'?'#E1F5EE':'#FAEEDA', color:a.status==='confirmed'?'#0F6E56':'#854F0B', fontWeight:500 }}>{a.status}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Quick actions</div>
              <div style={{ display:'grid', gap:'8px' }}>
                <a href="/coach/feedback" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#f5f5f3', borderRadius:'8px', textDecoration:'none', color:'#1a1a1a' }}>
                  <span style={{ fontSize:'18px' }}>📝</span>
                  <div><div style={{ fontSize:'13px', fontWeight:500 }}>Submit session feedback</div><div style={{ fontSize:'11px', color:'#888' }}>Rate & review your recent sessions</div></div>
                </a>
                <a href="/coach/schedule" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#f5f5f3', borderRadius:'8px', textDecoration:'none', color:'#1a1a1a' }}>
                  <span style={{ fontSize:'18px' }}>⏰</span>
                  <div><div style={{ fontSize:'13px', fontWeight:500 }}>Update availability</div><div style={{ fontSize:'11px', color:'#888' }}>Set your weekly schedule</div></div>
                </a>
                <a href="/coach/appointments" style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#f5f5f3', borderRadius:'8px', textDecoration:'none', color:'#1a1a1a' }}>
                  <span style={{ fontSize:'18px' }}>✅</span>
                  <div><div style={{ fontSize:'13px', fontWeight:500 }}>Review pending requests</div><div style={{ fontSize:'11px', color:'#888' }}>{stats.pendingRequests} awaiting your response</div></div>
                </a>
              </div>
            </div>

            <div style={{ background:'#0D0D0D', border:'0.5px solid rgba(212,168,67,0.2)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, color:'#fff', marginBottom:'4px' }}>My earnings</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'1rem' }}>This month</div>
              <div style={{ fontSize:'32px', fontWeight:800, color:'#D4A843', marginBottom:'8px' }}>$0.00</div>
              <a href="/coach/payouts" style={{ fontSize:'12px', color:'rgba(212,168,67,0.7)' }}>View payout history →</a>
            </div>
          </div>
        </div>
      </div>
    </CoachLayout>
  )
}
