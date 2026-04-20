import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

export default function CoachProfile() {
  var [coach, setCoach] = useState(null)
  var [staffData, setStaffData] = useState(null)
  var [upcomingSlots, setUpcomingSlots] = useState([])
  var [loading, setLoading] = useState(true)

  useEffect(function(){
    if (typeof window !== 'undefined') {
      var path = window.location.pathname.split('/')
      var s = path[path.length - 1]
      loadCoach(s)
    }
  },[])

  async function loadCoach(s) {
    setLoading(true)
    var r = await supabase.from('profiles').select('*, staff(bio, specialties, availability_json, show_in_directory)').in('role',['coach']).eq('is_active',true)
    var coaches = r.data||[]
    var found = coaches.find(function(c){
      var nameSlug = (c.full_name||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
      return c.id === s || nameSlug === s
    })
    if (!found) { setLoading(false); return }
    setCoach(found)
    var sd = found.staff && found.staff[0] ? found.staff[0] : {}
    setStaffData(sd)
    if (sd.availability_json && sd.availability_json.weekly_hours) {
      setUpcomingSlots(generateSlots(sd.availability_json).slice(0,6))
    }
    setLoading(false)
  }

  function generateSlots(av) {
    var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    var slots = []
    var today = new Date(); today.setHours(0,0,0,0)
    for (var i=1; i<=14; i++) {
      var d = new Date(today); d.setDate(d.getDate()+i)
      var dayName = DAYS[d.getDay()]
      var dh = av.weekly_hours[dayName]
      if (!dh || !dh.enabled) continue
      var dur = av.slot_duration || 60
      var toMins = function(t){ var p=t.split(':'); return parseInt(p[0])*60+parseInt(p[1]) }
      var start = toMins(dh.start); var end = toMins(dh.end); var cur = start
      while (cur + dur <= end) {
        var h=Math.floor(cur/60); var m=cur%60
        slots.push({ dateStr: d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}), time:(h%12||12)+':'+(m===0?'00':m)+(h<12?' AM':' PM') })
        cur += dur + (av.buffer_time||0)
      }
    }
    return slots
  }

  if (loading) return <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ color:'rgba(255,255,255,0.4)', fontSize:'13px' }}>Loading...</div></div>
  if (!coach) return <div style={{ minHeight:'100vh', background:'#f5f5f3', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ textAlign:'center' }}><div style={{ fontSize:'32px', marginBottom:'12px' }}>👤</div><div style={{ fontSize:'18px', fontWeight:600 }}>Coach not found</div><a href="/coaches" style={{ color:'#D4A843', fontSize:'13px', marginTop:'8px', display:'inline-block' }}>← All coaches</a></div></div>

  var initials = (coach.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
  var specialties = staffData&&staffData.specialties ? staffData.specialties : []
  var bio = staffData&&staffData.bio ? staffData.bio : ''

  return (
    <>
      <Head>
        <title>{coach.full_name} — Coach | Hit Elite</title>
        <meta name="description" content={bio ? bio.substring(0,160) : 'Book a private lesson with '+coach.full_name+' at Hit Elite.'} />
      </Head>
      <nav style={{ background:'#0D0D0D', padding:'0 2rem', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <a href="/" style={{ fontSize:'18px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', textDecoration:'none' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></a>
        <div style={{ display:'flex', gap:'12px' }}>
          <a href="/coaches" style={{ color:'rgba(255,255,255,0.5)', fontSize:'13px', padding:'8px 14px' }}>← All coaches</a>
          <a href="/signup" style={{ padding:'8px 20px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:700 }}>Book now</a>
        </div>
      </nav>
      <div style={{ background:'#0D0D0D', padding:'3rem 2rem' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto', display:'flex', gap:'2rem', alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ width:'96px', height:'96px', borderRadius:'50%', background:'#D4A843', color:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:800, flexShrink:0 }}>{initials}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'30px', fontWeight:800, color:'#fff', marginBottom:'6px' }}>{coach.full_name}</div>
            <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.4)', marginBottom:'12px' }}>Coach at Hit Elite</div>
            {specialties.length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>{specialties.map(function(s){ return <span key={s} style={{ display:'inline-block', padding:'3px 12px', borderRadius:'20px', fontSize:'12px', background:'rgba(212,168,67,0.15)', color:'#D4A843', fontWeight:500 }}>{s}</span> })}</div>}
          </div>
          <a href="/signup" style={{ padding:'12px 26px', background:'#D4A843', color:'#0D0D0D', borderRadius:'10px', fontSize:'14px', fontWeight:700, textDecoration:'none' }}>Book a lesson →</a>
        </div>
      </div>
      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'2rem 1.5rem' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'20px', alignItems:'start' }}>
          <div>
            {bio && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'14px', padding:'1.5rem', marginBottom:'1.25rem' }}><div style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>About {coach.full_name.split(' ')[0]}</div><div style={{ fontSize:'14px', color:'#444', lineHeight:1.8 }}>{bio}</div></div>}
            {upcomingSlots.length > 0 && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'14px', padding:'1.5rem' }}>
                <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>Upcoming availability</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px', marginBottom:'1rem' }}>
                  {upcomingSlots.map(function(slot,i){
                    return <a key={i} href="/signup" style={{ textDecoration:'none', padding:'10px 14px', borderRadius:'10px', border:'0.5px solid rgba(212,168,67,0.3)', background:'#FFFBF0', display:'block' }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'#8B6914' }}>{slot.dateStr}</div>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'#1a1a1a', marginTop:'2px' }}>{slot.time}</div>
                    </a>
                  })}
                </div>
                <a href="/signup" style={{ display:'block', textAlign:'center', padding:'10px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:700, textDecoration:'none' }}>View all & book →</a>
              </div>
            )}
          </div>
          <div style={{ background:'#0D0D0D', border:'0.5px solid rgba(212,168,67,0.2)', borderRadius:'14px', padding:'1.5rem', position:'sticky', top:'80px' }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#fff', marginBottom:'4px' }}>Book with {coach.full_name.split(' ')[0]}</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'1.25rem' }}>Private lessons & group classes</div>
            <a href="/signup" style={{ display:'block', textAlign:'center', padding:'12px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'14px', fontWeight:700, textDecoration:'none', marginBottom:'8px' }}>Create account & book</a>
            <a href="/login" style={{ display:'block', textAlign:'center', padding:'10px', color:'rgba(255,255,255,0.4)', borderRadius:'8px', fontSize:'13px', textDecoration:'none', border:'0.5px solid rgba(255,255,255,0.08)' }}>Sign in to book</a>
          </div>
        </div>
      </div>
      <footer style={{ background:'#0D0D0D', borderTop:'1px solid rgba(255,255,255,0.06)', padding:'1.5rem 2rem', textAlign:'center', fontSize:'12px', color:'rgba(255,255,255,0.3)', marginTop:'2rem' }}>© 2026 Hit Elite.</footer>
    </>
  )
}
