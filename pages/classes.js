import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function PublicClasses() {
  var [sessions, setSessions] = useState([])
  var [loading, setLoading] = useState(true)
  var [search, setSearch] = useState('')

  useEffect(function(){
    supabase.from('class_sessions').select('*, classes(name,description,color,capacity,price,duration_mins), locations(name)').gte('starts_at', new Date().toISOString()).order('starts_at').limit(30)
      .then(function(r){ setSessions(r.data||[]); setLoading(false) })
  },[])

  var filtered = sessions.filter(function(s){ return !search || (s.classes&&s.classes.name.toLowerCase().includes(search.toLowerCase())) })
  var nav = { background:'#0D0D0D', padding:'0 2rem', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }

  return (
    <>
      <Head><title>Classes — Hit Elite</title></Head>
      <nav style={nav}>
        <a href="/" style={{ fontSize:'18px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', textDecoration:'none' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></a>
        <div style={{ display:'flex', gap:'12px' }}>
          <a href="/login" style={{ padding:'8px 16px', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', color:'#fff', fontSize:'13px' }}>Sign in</a>
          <a href="/signup" style={{ padding:'8px 16px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:700 }}>Join</a>
        </div>
      </nav>
      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'2rem 1.5rem' }}>
        <div style={{ fontSize:'28px', fontWeight:700, marginBottom:'4px' }}>Classes & group sessions</div>
        <div style={{ fontSize:'14px', color:'#888', marginBottom:'1.5rem' }}>Browse and book upcoming sessions</div>
        <input type="text" value={search} onChange={function(e){setSearch(e.target.value)}} placeholder="Search classes..." style={{ width:'100%', padding:'10px 14px', borderRadius:'10px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'14px', marginBottom:'1.25rem', outline:'none' }} />
        {loading && <div style={{ textAlign:'center', color:'#999', padding:'2rem', fontSize:'13px' }}>Loading...</div>}
        <div style={{ display:'grid', gap:'10px' }}>
          {filtered.map(function(s){
            var cls = s.classes||{}; var loc = s.locations ? s.locations.name : 'TBD'
            var date = new Date(s.starts_at).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
            var time = new Date(s.starts_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
            var spots = (cls.capacity||0) - (s.enrolled_count||0)
            return (
              <div key={s.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', gap:'14px' }}>
                <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0, marginTop:'5px' }}></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'5px' }}>{cls.name}</div>
                  <div style={{ fontSize:'13px', color:'#888', display:'flex', gap:'16px', flexWrap:'wrap', marginBottom:'6px' }}>
                    <span>📅 {date}</span><span>⏰ {time}</span><span>⏱ {cls.duration_mins}min</span>
                    <span>📍 {loc}</span><span>👥 {spots} spots left</span>
                    {cls.price && <span>💳 ${parseFloat(cls.price||0).toFixed(0)}</span>}
                  </div>
                  {cls.description && <div style={{ fontSize:'12px', color:'#aaa' }}>{cls.description.substring(0,120)}{cls.description.length>120?'...':''}</div>}
                </div>
                <a href="/signup" style={{ display:'inline-flex', alignItems:'center', padding:'8px 18px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:700, textDecoration:'none', height:'fit-content', flexShrink:0, whiteSpace:'nowrap' }}>Book →</a>
              </div>
            )
          })}
          {!loading && filtered.length === 0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888', fontSize:'13px' }}>No upcoming classes found.</div>}
        </div>
      </div>
    </>
  )
}
