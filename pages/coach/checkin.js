import { useEffect, useState } from 'react'
import CoachLayout from '../../components/coach/CoachLayout'
import { supabase } from '../../lib/supabase'

export default function CoachCheckin() {
  var [sessions, setSessions] = useState([])
  var [selectedSession, setSelectedSession] = useState(null)
  var [enrollments, setEnrollments] = useState([])
  var [loading, setLoading] = useState(true)
  var [enrollLoading, setEnrollLoading] = useState(false)
  var [search, setSearch] = useState('')
  var [coachId, setCoachId] = useState(null)

  useEffect(function(){
    async function load(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href='/login'; return }
      var uid = s.data.session.user.id
      setCoachId(uid)
      // Get today + next 2 days sessions for this coach
      var now = new Date(); now.setHours(0,0,0,0)
      var end = new Date(now.getTime() + 3*24*3600000)
      var r = await supabase.from('class_sessions').select('id,starts_at,ends_at,enrolled_count,class_id,classes(id,name,color,capacity,coach_id)').gte('starts_at',now.toISOString()).lte('starts_at',end.toISOString()).neq('status','cancelled').order('starts_at')
      // Filter to this coach's sessions
      var mySessions = (r.data||[]).filter(function(s){ return s.classes && s.classes.coach_id===uid })
      setSessions(mySessions)
      setLoading(false)
    }
    load()
  },[])

  async function selectSession(sess) {
    setSelectedSession(sess)
    setEnrollLoading(true)
    var r = await supabase.from('enrollments').select('id,status,checked_in,checked_in_at,profiles!enrollments_customer_id_fkey(id,full_name,email,phone)').eq('session_id',sess.id)
    setEnrollments(r.data||[])
    setEnrollLoading(false)
  }

  async function checkIn(enrollId, custId) {
    await supabase.from('enrollments').update({ checked_in:true, checked_in_at:new Date().toISOString() }).eq('id',enrollId)
    setEnrollments(function(p){return p.map(function(e){return e.id===enrollId?{...e,checked_in:true,checked_in_at:new Date().toISOString()}:e})})
  }

  async function undoCheckIn(enrollId) {
    await supabase.from('enrollments').update({ checked_in:false, checked_in_at:null }).eq('id',enrollId)
    setEnrollments(function(p){return p.map(function(e){return e.id===enrollId?{...e,checked_in:false,checked_in_at:null}:e})})
  }

  function fmt(iso){ if(!iso)return'—'; var d=new Date(iso); var h=d.getHours(); var m=d.getMinutes(); return(h%12||12)+':'+(m<10?'0'+m:m)+(h<12?'am':'pm') }

  var checkedInCount = enrollments.filter(function(e){return e.checked_in}).length
  var totalCount = enrollments.length
  var filteredEnrollments = enrollments.filter(function(e){
    if (!search) return true
    var name = e.profiles?.full_name||''
    var email = e.profiles?.email||''
    return name.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase())
  })

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  return (
    <CoachLayout active="checkin">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'4px' }}>Student check-in</div>
        <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Today and the next 2 days — your sessions only</div>

        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'16px', alignItems:'start' }}>
          {/* Session list */}
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'13px', fontWeight:600 }}>Select a session</div>
            {loading && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
            {!loading && sessions.length===0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No sessions in the next 2 days.</div>}
            {sessions.map(function(sess){
              var cls = sess.classes||{}
              var isSelected = selectedSession && selectedSession.id===sess.id
              var date = new Date(sess.starts_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
              return (
                <div key={sess.id} onClick={function(){selectSession(sess)}} style={{ display:'flex', gap:'10px', padding:'12px 14px', cursor:'pointer', background:isSelected?'#FFFBF0':'transparent', borderBottom:'0.5px solid rgba(0,0,0,0.05)', borderLeft:isSelected?'3px solid #D4A843':'3px solid transparent' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:cls.color||'#D4A843', marginTop:'4px', flexShrink:0 }}></div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:isSelected?600:400 }}>{cls.name||'Class'}</div>
                    <div style={{ fontSize:'11px', color:'#888', marginTop:'2px' }}>{date} · {fmt(sess.starts_at)}</div>
                    <div style={{ fontSize:'11px', color:'#888' }}>{sess.enrolled_count||0}/{cls.capacity||0} enrolled</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Check-in panel */}
          {!selectedSession && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
              <div style={{ fontSize:'36px', marginBottom:'14px' }}>📱</div>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'8px', color:'#1a1a1a' }}>Select a session</div>
              <div style={{ fontSize:'13px' }}>Choose a session from the left to check in students.</div>
            </div>
          )}

          {selectedSession && (
            <div>
              {/* Session summary */}
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'16px', fontWeight:700 }}>{selectedSession.classes?.name}</div>
                    <div style={{ fontSize:'13px', color:'#888', marginTop:'3px' }}>
                      {new Date(selectedSession.starts_at).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · {fmt(selectedSession.starts_at)}
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
                {checkedInCount === totalCount && totalCount > 0 && (
                  <div style={{ marginTop:'10px', background:'#E1F5EE', borderRadius:'8px', padding:'8px 12px', fontSize:'13px', color:'#0F6E56', fontWeight:600 }}>✓ All students checked in!</div>
                )}
              </div>

              {/* Search */}
              <div style={{ marginBottom:'10px' }}>
                <input type="text" style={inp} placeholder="Search by name or email..." value={search} onChange={function(e){setSearch(e.target.value)}} />
              </div>

              {/* Student list */}
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)', background:'#f9f9f7', fontSize:'13px', fontWeight:600 }}>
                  Students ({filteredEnrollments.length})
                </div>
                {enrollLoading && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading students...</div>}
                {!enrollLoading && filteredEnrollments.length===0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No students enrolled yet.</div>}
                {filteredEnrollments.map(function(e){
                  var cust = e.profiles||{}
                  var ini = (cust.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                  var isCheckedIn = e.checked_in
                  return (
                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.05)', background:isCheckedIn?'rgba(29,158,117,0.04)':'transparent' }}>
                      <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:isCheckedIn?'#E1F5EE':'#F5E6C0', color:isCheckedIn?'#0F6E56':'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 }}>{isCheckedIn?'✓':ini}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'14px', fontWeight:500, color:isCheckedIn?'#1D9E75':'#1a1a1a' }}>{cust.full_name||'—'}</div>
                        <div style={{ fontSize:'12px', color:'#aaa' }}>{cust.email}</div>
                        {isCheckedIn && e.checked_in_at && <div style={{ fontSize:'11px', color:'#1D9E75' }}>Checked in at {fmt(e.checked_in_at)}</div>}
                      </div>
                      {isCheckedIn ? (
                        <button onClick={function(){undoCheckIn(e.id)}} style={{ ...btn, fontSize:'12px', padding:'5px 12px', color:'#888' }}>Undo</button>
                      ) : (
                        <button onClick={function(){checkIn(e.id, cust.id)}} style={{ ...btnGold, fontSize:'13px', padding:'8px 20px' }}>Check in ✓</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </CoachLayout>
  )
}
