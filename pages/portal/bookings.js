import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

export default function MyBookings() {
  var [appointments, setAppointments] = useState([])
  var [enrollments, setEnrollments] = useState([])
  var [loading, setLoading] = useState(true)
  var [tab, setTab] = useState('upcoming')

  useEffect(function(){
    async function load(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href='/login'; return }
      var uid = s.data.session.user.id
      var [apptR, enrR] = await Promise.all([
        supabase.from('appointments').select('*, services(name,color,duration_mins), profiles!appointments_coach_id_fkey(full_name), locations(name)').eq('customer_id',uid).order('starts_at',{ascending:false}),
        supabase.from('enrollments').select('*, classes(name,color,duration_mins), class_sessions(starts_at,ends_at,locations(name))').eq('customer_id',uid).order('created_at',{ascending:false}),
      ])
      setAppointments(apptR.data||[])
      setEnrollments(enrR.data||[])
      setLoading(false)
    }
    load()
  },[])

  var now = new Date()
  var upcomingAppts = appointments.filter(function(a){ return new Date(a.starts_at)>=now && a.status!=='cancelled' })
  var pastAppts = appointments.filter(function(a){ return new Date(a.starts_at)<now || a.status==='cancelled' })
  var upcomingEnr = enrollments.filter(function(e){ return e.class_sessions && new Date(e.class_sessions.starts_at)>=now && e.status!=='cancelled' })
  var pastEnr = enrollments.filter(function(e){ return !e.class_sessions || new Date(e.class_sessions.starts_at)<now || e.status==='cancelled' })

  var upcoming = [...upcomingAppts.map(function(a){return{...a,_type:'appointment'}}),...upcomingEnr.map(function(e){return{...e,_type:'enrollment'}})].sort(function(a,b){
    var da = a._type==='appointment'?new Date(a.starts_at):new Date(a.class_sessions&&a.class_sessions.starts_at)
    var db = b._type==='appointment'?new Date(b.starts_at):new Date(b.class_sessions&&b.class_sessions.starts_at)
    return da-db
  })
  var past = [...pastAppts.map(function(a){return{...a,_type:'appointment'}}),...pastEnr.map(function(e){return{...e,_type:'enrollment'}})]

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }

  function statusBadge(status) {
    var s = { pending:['#FAEEDA','#854F0B'], confirmed:['#E1F5EE','#0F6E56'], completed:['#F1EFE8','#5F5E5A'], cancelled:['#FCEBEB','#A32D2D'], enrolled:['#E1F5EE','#0F6E56'] }
    var c = s[status]||s.pending
    return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:c[0], color:c[1], fontWeight:500 }}>{status}</span>
  }

  function BookingCard({ item }) {
    var isAppt = item._type === 'appointment'
    var name = isAppt ? (item.services&&item.services.name) : (item.classes&&item.classes.name)
    var color = isAppt ? (item.services&&item.services.color)||'#534AB7' : (item.classes&&item.classes.color)||'#D4A843'
    var date = isAppt ? item.starts_at : (item.class_sessions&&item.class_sessions.starts_at)
    var dateStr = date ? new Date(date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : '—'
    var timeStr = date ? new Date(date).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : '—'
    var coach = isAppt && item.profiles ? item.profiles.full_name : null
    var status = isAppt ? item.status : item.status
    var isPast = date && new Date(date) < new Date()

    return (
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', gap:'14px', alignItems:'flex-start', opacity:isPast?0.75:1 }}>
        <div style={{ width:'4px', background:color, borderRadius:'2px', alignSelf:'stretch', flexShrink:0 }}></div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
            <div>
              <div style={{ fontSize:'15px', fontWeight:600 }}>{name}</div>
              <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{isAppt?'Private lesson':'Group class'}</div>
            </div>
            {statusBadge(status)}
          </div>
          <div style={{ fontSize:'13px', color:'#666', display:'flex', gap:'14px', flexWrap:'wrap' }}>
            <span>📅 {dateStr}</span>
            <span>⏰ {timeStr}</span>
            {coach && <span>👤 {coach}</span>}
          </div>
          {isAppt && item.total_amount > 0 && (
            <div style={{ marginTop:'8px', fontSize:'12px', color:item.payment_status==='paid'?'#1D9E75':'#BA7517', fontWeight:500 }}>
              💳 ${parseFloat(item.total_amount||0).toFixed(2)} — {item.payment_status}
            </div>
          )}
        </div>
        {!isPast && status !== 'cancelled' && (
          <button style={{ ...btn, fontSize:'12px', padding:'5px 12px', color:'#A32D2D', flexShrink:0 }}
            onClick={async function(){
              if (!confirm('Cancel this booking?')) return
              if (isAppt) await supabase.from('appointments').update({status:'cancelled',cancelled_at:new Date().toISOString()}).eq('id',item.id)
              else await supabase.from('enrollments').update({status:'cancelled',cancelled_at:new Date().toISOString()}).eq('id',item.id)
              window.location.reload()
            }}>Cancel</button>
        )}
      </div>
    )
  }

  var display = tab === 'upcoming' ? upcoming : past

  return (
    <>
      <Head><title>My bookings — Hit Elite</title></Head>
      <div style={{ minHeight:'100vh', background:'#f5f5f3' }}>
        <nav style={{ background:'#0D0D0D', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
          <a href="/" style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', textDecoration:'none' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></a>
          <a href="/portal" style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)' }}>← My portal</a>
        </nav>
        <div style={{ maxWidth:'720px', margin:'0 auto', padding:'2rem 1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
            <div>
              <div style={{ fontSize:'22px', fontWeight:700 }}>My bookings</div>
              <div style={{ fontSize:'13px', color:'#888' }}>{upcoming.length} upcoming · {past.length} past</div>
            </div>
            <a href="/portal/book" style={{ ...btnGold, textDecoration:'none' }}>+ Book a session</a>
          </div>

          <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
            {[['upcoming','Upcoming ('+upcoming.length+')'],['past','Past ('+past.length+')']].map(function(t){
              return <button key={t[0]} onClick={function(){setTab(t[0])}} style={{ padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t[0]?'2px solid #D4A843':'2px solid transparent', color:tab===t[0]?'#D4A843':'#888', fontWeight:tab===t[0]?600:400, marginBottom:'-1px' }}>{t[1]}</button>
            })}
          </div>

          {loading && <div style={{ textAlign:'center', color:'#999', fontSize:'13px', padding:'2rem' }}>Loading your bookings...</div>}

          {!loading && display.length === 0 && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'14px' }}>{tab==='upcoming'?'📅':'📋'}</div>
              <div style={{ fontWeight:600, marginBottom:'6px' }}>{tab==='upcoming'?'No upcoming bookings':'No past bookings'}</div>
              {tab==='upcoming' && <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Book your first session and it will appear here.</div>}
              {tab==='upcoming' && <a href="/portal/book" style={{ ...btnGold, textDecoration:'none', display:'inline-block' }}>Browse sessions →</a>}
            </div>
          )}

          <div style={{ display:'grid', gap:'10px' }}>
            {display.map(function(item){ return <BookingCard key={item.id} item={item} /> })}
          </div>
        </div>
      </div>
    </>
  )
}
