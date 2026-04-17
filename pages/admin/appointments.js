import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var SUBTABS = [['schedule','📅 Schedule'],['reservations','✅ Reservations'],['requests','📋 Requests'],['waitlist','⏳ Waitlist'],['services','🔧 Services']]

function Badge({ type }) {
  var s = { pending:['#FAEEDA','#854F0B'], confirmed:['#E1F5EE','#0F6E56'], completed:['#F1EFE8','#5F5E5A'], cancelled:['#FCEBEB','#A32D2D'], waiting:['#EEEDFE','#534AB7'], approved:['#E1F5EE','#0F6E56'], declined:['#FCEBEB','#A32D2D'] }
  var c = s[type] || s.pending
  return <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'6px', fontSize:'11px', background:c[0], color:c[1], fontWeight:500 }}>{type}</span>
}

export default function Appointments() {
  var [sub, setSub] = useState('reservations')
  var [appointments, setAppointments] = useState([])
  var [waitlist, setWaitlist] = useState([])
  var [loading, setLoading] = useState(true)
  var [showCancelled, setShowCancelled] = useState(false)
  var [qf, setQf] = useState('all')

  useEffect(function() {
    async function load() {
      var [apptR, wlR] = await Promise.all([
        supabase.from('appointments').select('*, profiles!appointments_customer_id_fkey(full_name, email), services(name, color), locations(name)').order('starts_at', { ascending: false }).limit(50),
        supabase.from('waitlist').select('*, profiles!waitlist_customer_id_fkey(full_name, email)').eq('status', 'waiting').order('created_at'),
      ])
      setAppointments(apptR.data || [])
      setWaitlist(wlR.data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id, status) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    setAppointments(function(prev) { return prev.map(function(a) { return a.id === id ? {...a, status} : a }) })
  }

  async function convertWaitlist(id) {
    await supabase.from('waitlist').update({ status: 'converted' }).eq('id', id)
    setWaitlist(function(prev) { return prev.filter(function(w) { return w.id !== id }) })
  }

  var filteredRes = appointments.filter(function(a) {
    if (!showCancelled && a.status === 'cancelled') return false
    if (qf === 'upcoming') return new Date(a.starts_at) >= new Date()
    if (qf === 'past') return new Date(a.starts_at) < new Date()
    return true
  })

  var pendingReqs = appointments.filter(function(a) { return a.status === 'pending' })
  var approvedReqs = appointments.filter(function(a) { return a.status === 'confirmed' })
  var declinedReqs = appointments.filter(function(a) { return a.status === 'cancelled' })

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var btnSm = { padding:'5px 10px', fontSize:'12px', borderRadius:'8px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', fontFamily:'inherit', color:'#1a1a1a' }
  var sel = { fontSize:'13px', padding:'7px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', background:'#fff', color:'#1a1a1a', fontFamily:'inherit' }

  function subTab(id, label) {
    var isActive = sub === id
    return <button key={id} onClick={function(){setSub(id)}} style={{ padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom: isActive?'2px solid #D4A843':'2px solid transparent', color:isActive?'#D4A843':'#888', fontWeight:isActive?600:400, marginBottom:'-1px', whiteSpace:'nowrap' }}>{label}</button>
  }

  function ReqGroup({ label, items, color, textColor, showActions }) {
    return (
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:0 }}>
          <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'6px', fontSize:'11px', background:color, color:textColor, fontWeight:500 }}>{label}</span>
          <span style={{ fontSize:'12px', color:'#888' }}>{items.length} {label === 'Active' ? 'awaiting decision' : ''}</span>
        </div>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'0 0 12px 12px', padding:'0 1.25rem' }}>
          {items.length === 0 && <div style={{ padding:'1rem', textAlign:'center', color:'#999', fontSize:'13px' }}>None</div>}
          {items.map(function(a, i) {
            var cust = a.profiles ? a.profiles.full_name : 'Unknown'
            var svc = a.services ? a.services.name : 'Service'
            var date = new Date(a.starts_at).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
            var time = new Date(a.starts_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
            var initials = cust.split(' ').map(function(n){return n[0]}).join('').substring(0,2)
            return (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom:i<items.length-1?'0.5px solid rgba(0,0,0,0.06)':'none', opacity:a.status==='cancelled'?0.55:1 }}>
                <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, flexShrink:0 }}>{initials}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:500 }}>{cust} — {svc}</div>
                  <div style={{ fontSize:'12px', color:'#888' }}>{date} · {time}</div>
                </div>
                <Badge type={a.status} />
                {showActions && (
                  <>
                    <button style={{ ...btnSm, background:'#E1F5EE', color:'#0F6E56', borderColor:'#5DCAA5' }} onClick={function(){updateStatus(a.id,'confirmed')}}>Approve</button>
                    <button style={{ ...btnSm, background:'#FCEBEB', color:'#A32D2D', borderColor:'#F09595' }} onClick={function(){updateStatus(a.id,'cancelled')}}>Decline</button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <AdminLayout active="appointments">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Appointments</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Manage sessions, bookings, and requests</div>
          </div>
          <button style={btnGold} onClick={function(){window.location.href='/admin/appointments/new'}}>+ New appointment</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.25rem' }}>
          {[['Today\'s sessions',appointments.filter(function(a){return new Date(a.starts_at).toDateString()===new Date().toDateString()}).length,'#D4A843'],['Upcoming',appointments.filter(function(a){return new Date(a.starts_at)>=new Date()&&a.status!=='cancelled'}).length,'#185FA5'],['Pending requests',pendingReqs.length,'#BA7517'],['On waitlist',waitlist.length,'#534AB7']].map(function(m,i){
            return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'12px' }}><div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div><div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{m[1]}</div></div>
          })}
        </div>

        <div style={{ display:'flex', gap:0, borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          {SUBTABS.map(function(t){return subTab(t[0],t[1])})}
        </div>

        {sub === 'schedule' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'14px' }}>
            📅 Full calendar view — coming soon. Shows all confirmed and pending sessions with Day/Week/Month navigation.
          </div>
        )}

        {sub === 'reservations' && (
          <div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'1rem' }}>
              <select style={sel}><option>All services</option></select>
              <select style={sel}><option>All coaches</option></select>
              <select style={sel}><option>All locations</option></select>
              <input type="date" style={sel} />
              <input type="date" style={sel} />
              <select style={sel}><option>All payments</option><option>Paid</option><option>Unpaid</option></select>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#888' }}>
                <span>Show cancelled</span>
                <div onClick={function(){setShowCancelled(function(v){return !v})}} style={{ width:'34px', height:'18px', borderRadius:'9px', background:showCancelled?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', transition:'background .15s' }}>
                  <div style={{ position:'absolute', width:'14px', height:'14px', borderRadius:'50%', background:'#fff', top:'2px', right:showCancelled?'2px':'18px', transition:'right .15s' }}></div>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'6px', marginBottom:'1rem' }}>
              {['all','upcoming','past'].map(function(f){
                return <button key={f} onClick={function(){setQf(f)}} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', cursor:'pointer', border:'0.5px solid '+(qf===f?'#D4A843':'rgba(0,0,0,0.15)'), background:qf===f?'#D4A843':'transparent', color:qf===f?'#0D0D0D':'#666', fontFamily:'inherit', fontWeight:qf===f?600:400 }}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              })}
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#f9f9f7' }}>
                  {['Customer','Service','Date & time','Location','Status','Amount',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)', whiteSpace:'nowrap' }}>{h}</th>})}
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                  {!loading && filteredRes.length === 0 && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No appointments found</td></tr>}
                  {filteredRes.map(function(a, i) {
                    var cust = a.profiles ? a.profiles.full_name : '—'
                    var svc = a.services ? a.services.name : '—'
                    var loc = a.locations ? a.locations.name : '—'
                    var date = new Date(a.starts_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })
                    var time = new Date(a.starts_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
                    return (
                      <tr key={a.id} style={{ opacity:a.status==='cancelled'?0.55:1, borderBottom:i<filteredRes.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                        <td style={{ padding:'10px 14px', fontWeight:500 }}>{cust}</td>
                        <td style={{ padding:'10px 14px', color:'#666' }}>{svc}</td>
                        <td style={{ padding:'10px 14px', color:'#666', whiteSpace:'nowrap' }}>{date} · {time}</td>
                        <td style={{ padding:'10px 14px', color:'#666' }}>{loc}</td>
                        <td style={{ padding:'10px 14px' }}><Badge type={a.status} /></td>
                        <td style={{ padding:'10px 14px', fontWeight:600, color:a.payment_status==='paid'?'#1D9E75':'#BA7517' }}>${parseFloat(a.total_amount||0).toFixed(2)}</td>
                        <td style={{ padding:'10px 14px' }}><button style={btnSm}>View</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sub === 'requests' && (
          <div>
            <ReqGroup label="Active" items={pendingReqs} color="#FAEEDA" textColor="#854F0B" showActions />
            <ReqGroup label="Approved" items={approvedReqs} color="#E1F5EE" textColor="#0F6E56" showActions={false} />
            <ReqGroup label="Declined" items={declinedReqs} color="#FCEBEB" textColor="#A32D2D" showActions={false} />
          </div>
        )}

        {sub === 'waitlist' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'0 1.25rem' }}>
            {waitlist.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No one on the waitlist right now.</div>}
            {waitlist.map(function(w, i) {
              var cust = w.profiles ? w.profiles.full_name : 'Unknown'
              var initials = cust.split(' ').map(function(n){return n[0]}).join('').substring(0,2)
              return (
                <div key={w.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 0', borderBottom:i<waitlist.length-1?'0.5px solid rgba(0,0,0,0.06)':'none' }}>
                  <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'#EEEDFE', color:'#534AB7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:600, flexShrink:0 }}>#{i+1}</div>
                  <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700 }}>{initials}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:500 }}>{cust}</div>
                    <div style={{ fontSize:'12px', color:'#888' }}>Joined waitlist {new Date(w.created_at).toLocaleDateString()}</div>
                  </div>
                  <Badge type="waiting" />
                  <button style={{ ...btnSm }} onClick={function(){convertWaitlist(w.id)}}>Book now</button>
                  <button style={{ ...btnSm, color:'#A32D2D' }} onClick={function(){setWaitlist(function(prev){return prev.filter(function(x){return x.id!==w.id})})}}>Remove</button>
                </div>
              )
            })}
          </div>
        )}

        {sub === 'services' && (
          <div style={{ textAlign:'center', padding:'2rem' }}>
            <a href="/admin/services" style={{ padding:'11px 24px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:600, textDecoration:'none' }}>
              Manage appointment services →
            </a>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
