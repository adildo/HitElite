import Head from 'next/head'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
export default function PortalPage() {
  var [auth, setAuth] = useState(false)
  var titles = { bookings:'My bookings', feedback:'Coach feedback', profile:'My profile' }
  var p = 'profile'
  useEffect(function(){
    supabase.auth.getSession().then(function(r){ if(!r.data.session) window.location.href='/login'; else setAuth(true) })
  },[])
  if (!auth) return <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ color:'#fff', fontSize:'13px' }}>Loading...</div></div>
  return (
    <>
      <Head><title>{titles[p]} — Hit Elite</title></Head>
      <div style={{ minHeight:'100vh', background:'#f5f5f3' }}>
        <nav style={{ background:'#0D0D0D', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', gap:'16px' }}>
          <a href="/portal" style={{ color:'rgba(255,255,255,0.5)', fontSize:'13px' }}>← My portal</a>
          <div style={{ fontSize:'16px', fontWeight:800, color:'#fff' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></div>
        </nav>
        <div style={{ maxWidth:'800px', margin:'0 auto', padding:'2rem 1.5rem' }}>
          <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'1.5rem' }}>{titles[p]}</div>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:'32px', marginBottom:'14px' }}>{p==='bookings'?'📅':p==='feedback'?'📝':'👤'}</div>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'8px', color:'#1a1a1a' }}>{titles[p]}</div>
            <div style={{ fontSize:'13px' }}>This section connects to your Supabase data and is ready to be built out.</div>
            <a href="/portal" style={{ display:'inline-block', marginTop:'1rem', padding:'8px 20px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:700 }}>Back to portal</a>
          </div>
        </div>
      </div>
    </>
  )
}
