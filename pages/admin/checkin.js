import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function CheckIn() {
  var [sessions, setSessions] = useState([])
  var [loading, setLoading] = useState(true)
  var [selectedSession, setSelectedSession] = useState(null)
  var [enrollments, setEnrollments] = useState([])
  var [enrollLoading, setEnrollLoading] = useState(false)
  var [search, setSearch] = useState('')
  var [showQR, setShowQR] = useState(false)

  useEffect(function(){
    async function load(){
      var today = new Date(); today.setHours(0,0,0,0)
      var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+2)
      var r = await supabase.from('class_sessions').select('*, classes(name,color,capacity)').gte('starts_at',today.toISOString()).lte('starts_at',tomorrow.toISOString()).order('starts_at')
      setSessions(r.data||[])
      setLoading(false)
    }
    load()
  },[])

  async function selectSession(sess) {
    setSelectedSession(sess)
    setEnrollLoading(true)
    setShowQR(false)
    var r = await supabase.from('enrollments').select('*, profiles!enrollments_customer_id_fkey(id,full_name,email,phone)').eq('session_id',sess.id).in('status',['enrolled','waitlist'])
    setEnrollments(r.data||[])
    setEnrollLoading(false)
  }

  async function checkIn(enrollmentId, customerId) {
    var now = new Date().toISOString()
    await supabase.from('enrollments').update({ status:'completed', checked_in_at:now }).eq('id',enrollmentId)
    setEnrollments(function(p){ return p.map(function(e){ return e.id===enrollmentId?{...e,status:'completed',checked_in_at:now}:e }) })
    // Update session enrolled count
    if (selectedSession) {
      var checked = enrollments.filter(function(e){ return e.status==='completed'||e.id===enrollmentId }).length + 1
      await supabase.from('class_sessions').update({ enrolled_count:checked }).eq('id',selectedSession.id)
    }
  }

  async function undoCheckIn(enrollmentId) {
    await supabase.from('enrollments').update({ status:'enrolled', checked_in_at:null }).eq('id',enrollmentId)
    setEnrollments(function(p){ return p.map(function(e){ return e.id===enrollmentId?{...e,status:'enrolled',checked_in_at:null}:e }) })
  }

  // Generate QR code URL (uses Google Charts QR API)
  function getQRUrl(session) {
    if (typeof window === 'undefined') return ''
    var checkInUrl = window.location.origin + '/checkin/' + session.id
    return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(checkInUrl)
  }

  var filteredEnrollments = enrollments.filter(function(e){
    if (!search) return true
    var name = (e.profiles&&e.profiles.full_name)||''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  var checkedInCount = enrollments.filter(function(e){return e.status==='completed'}).length
  var totalCount = enrollments.length

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  return (
    <AdminLayout active="classes">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'4px' }}>QR Check-In</div>
        <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Today and tomorrow's sessions — scan QR codes or manually check in students</div>

        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'16px', alignItems:'start' }}>
          {/* Session list */}
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'13px', fontWeight:600, background:'#f9f9f7' }}>Select a session</div>
            {loading && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
            {!loading && sessions.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No sessions today or tomorrow.</div>}
            {sessions.map(function(sess){
              var cls = sess.classes||{}
              var isSelected = selectedSession&&selectedSession.id===sess.id
              var time = new Date(sess.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
              var date = new Date(sess.starts_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
              return (
                <div key={sess.id} onClick={function(){selectSession(sess)}} style={{ display:'flex', gap:'10px', padding:'12px 14px', cursor:'pointer', background:isSelected?'#FFFBF0':'transparent', borderBottom:'0.5px solid rgba(0,0,0,0.05)', borderLeft:isSelected?'3px solid #D4A843':'3px solid transparent' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:cls.color||'#D4A843', marginTop:'4px', flexShrink:0 }}></div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:isSelected?600:400 }}>{cls.name||'Class'}</div>
                    <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>{date} · {time}</div>
                    <div style={{ fontSize:'11px', color:'#888' }}>{sess.enrolled_count||0}/{cls.capacity||0} enrolled</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Check-in panel */}
          {!selectedSession ? (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
              <div style={{ fontSize:'36px', marginBottom:'14px' }}>📱</div>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'8px', color:'#1a1a1a' }}>Select a session to check in students</div>
              <div style={{ fontSize:'13px' }}>Choose a class from the left to see the registrant list and QR code.</div>
            </div>
          ) : (
            <div>
              {/* Session header */}
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'16px', fontWeight:700 }}>{selectedSession.classes&&selectedSession.classes.name}</div>
                    <div style={{ fontSize:'13px', color:'#888', marginTop:'3px' }}>
                      {new Date(selectedSession.starts_at).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} at {new Date(selectedSession.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'28px', fontWeight:800, color:checkedInCount===totalCount&&totalCount>0?'#1D9E75':'#D4A843' }}>{checkedInCount}/{totalCount}</div>
                    <div style={{ fontSize:'12px', color:'#888' }}>checked in</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height:'6px', background:'#f1f1f1', borderRadius:'3px', marginTop:'12px' }}>
                  <div style={{ height:'100%', borderRadius:'3px', background:checkedInCount===totalCount&&totalCount>0?'#1D9E75':'#D4A843', width:totalCount>0?Math.round(checkedInCount/totalCount*100)+'%':'0%', transition:'width 0.3s' }}></div>
                </div>
                <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
                  <button style={btnGold} onClick={function(){setShowQR(function(v){return !v})}}>
                    {showQR?'Hide QR code':'📱 Show QR code'}
                  </button>
                  <button style={btn} onClick={async function(){
                    for (var e of enrollments.filter(function(e){return e.status==='enrolled'})) {
                      await checkIn(e.id, e.profiles&&e.profiles.id)
                    }
                  }}>✓ Check in all</button>
                </div>
              </div>

              {/* QR Code */}
              {showQR && (
                <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem', textAlign:'center' }}>
                  <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>Session check-in QR code</div>
                  <div style={{ fontSize:'12px', color:'#888', marginBottom:'1rem' }}>Students scan this with their phone to self-check-in</div>
                  <img src={getQRUrl(selectedSession)} alt="QR Code" style={{ width:'200px', height:'200px', borderRadius:'12px', border:'4px solid #f5f5f3' }} />
                  <div style={{ marginTop:'12px', fontSize:'11px', color:'#aaa', fontFamily:'monospace' }}>{typeof window!=='undefined'?window.location.origin+'/checkin/'+selectedSession.id:''}</div>
                  <button style={{ ...btn, marginTop:'12px', fontSize:'12px' }} onClick={function(){ window.print() }}>🖨 Print QR code</button>
                </div>
              )}

              {/* Student list */}
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)', background:'#f9f9f7' }}>
                  <input type="text" style={inp} placeholder="Search students..." value={search} onChange={function(e){setSearch(e.target.value)}} />
                </div>
                {enrollLoading && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading students...</div>}
                {!enrollLoading && filteredEnrollments.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No students enrolled yet.</div>}
                {filteredEnrollments.map(function(e, i){
                  var cust = e.profiles||{}
                  var ini = (cust.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                  var isCheckedIn = e.status === 'completed'
                  return (
                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderBottom:i<filteredEnrollments.length-1?'0.5px solid rgba(0,0,0,0.05)':'none', background:isCheckedIn?'rgba(29,158,117,0.04)':'transparent' }}>
                      <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:isCheckedIn?'#E1F5EE':'#F5E6C0', color:isCheckedIn?'#0F6E56':'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, flexShrink:0 }}>{isCheckedIn?'✓':ini}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:500, color:isCheckedIn?'#1D9E75':'#1a1a1a' }}>{cust.full_name||'—'}</div>
                        <div style={{ fontSize:'11px', color:'#aaa' }}>{cust.email}</div>
                        {isCheckedIn && e.checked_in_at && <div style={{ fontSize:'11px', color:'#1D9E75' }}>Checked in at {new Date(e.checked_in_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</div>}
                      </div>
                      {isCheckedIn ? (
                        <button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#888' }} onClick={function(){undoCheckIn(e.id)}}>Undo</button>
                      ) : (
                        <button style={{ ...btnGold, fontSize:'12px', padding:'6px 14px' }} onClick={function(){checkIn(e.id, cust.id)}}>Check in</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
