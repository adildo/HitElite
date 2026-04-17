import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function PublicCoaches() {
  var [coaches, setCoaches] = useState([])
  var [loading, setLoading] = useState(true)

  useEffect(function(){
    async function load(){
      var result = await supabase.from('profiles').select('id, full_name, email').in('role',['coach']).eq('is_active',true)
      var staffResult = await supabase.from('staff').select('id, bio, specialties, show_in_directory').eq('show_in_directory',true)
      var staffMap = {}
      ;(staffResult.data||[]).forEach(function(s){ staffMap[s.id] = s })
      var combined = (result.data||[]).map(function(p){ return { ...p, staffData: staffMap[p.id] || {} } }).filter(function(p){ return p.staffData.show_in_directory !== false })
      setCoaches(combined)
      setLoading(false)
    }
    load()
  },[])

  var nav = { background:'#0D0D0D', padding:'0 2rem', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }

  return (
    <>
      <Head><title>Coaches — Hit Elite</title></Head>
      <nav style={nav}>
        <a href="/" style={{ fontSize:'18px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', textDecoration:'none' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></a>
        <div style={{ display:'flex', gap:'12px' }}>
          <a href="/classes" style={{ color:'rgba(255,255,255,0.6)', fontSize:'13px', padding:'8px 14px' }}>Classes</a>
          <a href="/login" style={{ padding:'8px 16px', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', color:'#fff', fontSize:'13px' }}>Sign in</a>
          <a href="/signup" style={{ padding:'8px 16px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:700 }}>Join</a>
        </div>
      </nav>

      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'2rem 1.5rem' }}>
        <div style={{ fontSize:'28px', fontWeight:700, marginBottom:'4px' }}>Our coaches</div>
        <div style={{ fontSize:'14px', color:'#888', marginBottom:'2rem' }}>World-class tennis and pickleball instruction</div>

        {loading && <div style={{ textAlign:'center', color:'#999', padding:'2rem', fontSize:'13px' }}>Loading coaches...</div>}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:'16px' }}>
          {coaches.map(function(coach){
            var initials = (coach.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
            var bio = coach.staffData && coach.staffData.bio
            var specialties = coach.staffData && coach.staffData.specialties
            return (
              <div key={coach.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'14px', overflow:'hidden' }}>
                <div style={{ background:'#0D0D0D', height:'100px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'#D4A843', color:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:800 }}>{initials}</div>
                </div>
                <div style={{ padding:'1.25rem' }}>
                  <div style={{ fontSize:'16px', fontWeight:700, marginBottom:'4px' }}>{coach.full_name}</div>
                  {specialties && specialties.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginBottom:'10px' }}>
                      {specialties.map(function(s){ return <span key={s} style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:'#F5E6C0', color:'#8B6914', fontWeight:500 }}>{s}</span> })}
                    </div>
                  )}
                  {bio && <div style={{ fontSize:'13px', color:'#666', lineHeight:1.6, marginBottom:'12px' }}>{bio.substring(0,120)}{bio.length>120?'...':''}</div>}
                  <a href="/signup" style={{ display:'block', textAlign:'center', padding:'9px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:700, textDecoration:'none' }}>Book with {coach.full_name.split(' ')[0]} →</a>
                </div>
              </div>
            )
          })}
          {!loading && coaches.length === 0 && (
            <div style={{ gridColumn:'span 3', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888', fontSize:'13px' }}>
              Coaches will appear here once added by the admin.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
