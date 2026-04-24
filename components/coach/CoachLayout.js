import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

var navItems = [
  { id:'dashboard', label:'Dashboard', icon:'◼', href:'/coach' },
  { id:'schedule', label:'My schedule', icon:'📅', href:'/coach/schedule' },
  { id:'appointments', label:'Appointments', icon:'🎾', href:'/coach/appointments' },
  { id:'classes', label:'My classes', icon:'👥', href:'/coach/classes' },
  { id:'checkin', label:'Check-in students', icon:'✅', href:'/coach/checkin' },
  { id:'feedback', label:'Session feedback', icon:'📝', href:'/coach/feedback' },
  { id:'customers', label:'My students', icon:'👤', href:'/coach/students' },
  { id:'payouts', label:'My payouts', icon:'💰', href:'/coach/payouts' },
  { id:'profile', label:'My profile', icon:'⚙', href:'/coach/profile' },
]

export default function CoachLayout({ children, active }) {
  var [profile, setProfile] = useState(null)
  var [authStatus, setAuthStatus] = useState('loading')

  useEffect(function() {
    async function init() {
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href = '/login'; return }
      var p = await supabase.from('profiles').select('*').eq('id', s.data.session.user.id).single()
      if (!p.data || !['coach','manager','admin'].includes(p.data.role)) {
        window.location.href = '/portal'; return
      }
      setProfile(p.data)
      setAuthStatus('ok')
    }
    init()
  }, [])

  if (authStatus === 'loading') return (
    <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'10px' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></div>
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)' }}>Loading coach portal...</div>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f5f5f3' }}>
      <div style={{ width:'210px', background:'#0D0D0D', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:0, height:'100vh', overflowY:'auto' }}>
        <div style={{ padding:'1.25rem 1rem 0.75rem' }}>
          <div style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></div>
          <div style={{ display:'inline-block', marginTop:'6px', padding:'2px 10px', background:'rgba(212,168,67,0.15)', borderRadius:'6px', fontSize:'11px', color:'#D4A843', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase' }}>Coach Portal</div>
        </div>
        <div style={{ flex:1, padding:'0.5rem 0.75rem', display:'flex', flexDirection:'column', gap:'2px' }}>
          {navItems.map(function(item) {
            var isActive = active === item.id
            return (
              <a key={item.id} href={item.href} style={{ display:'flex', alignItems:'center', gap:'9px', padding:'8px 10px', borderRadius:'8px', fontSize:'13px', textDecoration:'none', background:isActive?'rgba(212,168,67,0.15)':'transparent', color:isActive?'#D4A843':'rgba(255,255,255,0.6)', fontWeight:isActive?600:400 }}>
                <span style={{ fontSize:'14px', width:'18px', textAlign:'center' }}>{item.icon}</span>
                {item.label}
              </a>
            )
          })}
        </div>
        <div style={{ padding:'0.75rem', borderTop:'0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', padding:'4px 10px', wordBreak:'break-all' }}>{profile && profile.email}</div>
          <button onClick={function(){ supabase.auth.signOut().then(function(){ window.location.href='/login' }) }}
            style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', width:'100%', textAlign:'left', border:'none', background:'transparent', cursor:'pointer', fontSize:'13px', color:'rgba(255,255,255,0.4)', borderRadius:'8px', fontFamily:'inherit' }}>
            <span>🚪</span> Sign out
          </button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', minWidth:0 }}>{children}</div>
    </div>
  )
}
