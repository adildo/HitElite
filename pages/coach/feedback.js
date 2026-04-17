import { useEffect, useState } from 'react'
import CoachLayout from '../../components/coach/CoachLayout'
import { supabase } from '../../lib/supabase'

var STRENGTHS = ['Backhand','Forehand','Net play','Serve placement','Footwork','Court positioning','Mental focus','Consistency','Spin','Volley','Overhead','Split step']
var FOCUS_AREAS = ['Consistency','Topspin','First serve %','Split step timing','Court coverage','Backhand follow-through','Net approaches','Return of serve','Doubles positioning','Mental game']

export default function CoachFeedback() {
  var [recentAppts, setRecentAppts] = useState([])
  var [selected, setSelected] = useState(null)
  var [strengths, setStrengths] = useState([])
  var [focusAreas, setFocusAreas] = useState([])
  var [notes, setNotes] = useState('')
  var [visibility, setVisibility] = useState('shared')
  var [nextGoal, setNextGoal] = useState('')
  var [rating, setRating] = useState(0)
  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)
  var [saved, setSaved] = useState(false)

  useEffect(function(){
    async function load(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) return
      var cutoff = new Date(); cutoff.setDate(cutoff.getDate()-7)
      var r = await supabase.from('appointments').select('id, starts_at, status, profiles!appointments_customer_id_fkey(id, full_name), services(name)').eq('coach_id', s.data.session.user.id).in('status',['confirmed','completed']).gte('starts_at', cutoff.toISOString()).order('starts_at', { ascending:false }).limit(20)
      setRecentAppts(r.data||[])
      setLoading(false)
    }
    load()
  },[])

  function toggleChip(arr, setArr, val){
    setArr(function(prev){ return prev.includes(val)?prev.filter(function(x){return x!==val}):[...prev,val] })
  }

  async function submitFeedback(){
    if (!selected) return
    setSaving(true)
    var s = await supabase.auth.getSession()
    await supabase.from('session_feedback').insert({
      appointment_id: selected.id, coach_id: s.data.session.user.id,
      customer_id: selected.profiles.id, strengths, focus_areas: focusAreas,
      coach_notes: notes, notes_visibility: visibility, next_goal: nextGoal, rating: rating||null
    })
    setSaving(false); setSaved(true)
    setTimeout(function(){ setSaved(false); setSelected(null); setStrengths([]); setFocusAreas([]); setNotes(''); setNextGoal(''); setRating(0) }, 2000)
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  function Chip({ label, active, onClick }) {
    return <button onClick={onClick} style={{ padding:'5px 12px', borderRadius:'20px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{label}</button>
  }

  return (
    <CoachLayout active="feedback">
      <div style={{ padding:'1.5rem 2rem', maxWidth:'680px' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'4px' }}>Session feedback</div>
        <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>Submit progress notes for your recent sessions</div>

        {!selected ? (
          <div>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Select a session</div>
            {loading && <div style={{ color:'#999', fontSize:'13px' }}>Loading sessions...</div>}
            {!loading && recentAppts.length === 0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No recent sessions to add feedback for.</div>}
            <div style={{ display:'grid', gap:'8px' }}>
              {recentAppts.map(function(a){
                var cust = a.profiles ? a.profiles.full_name : '—'
                var svc = a.services ? a.services.name : 'Session'
                var date = new Date(a.starts_at).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
                var time = new Date(a.starts_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
                var initials = cust.split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                return (
                  <div key={a.id} onClick={function(){setSelected(a)}} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'12px 1.25rem', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer' }}>
                    <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, flexShrink:0 }}>{initials}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:600 }}>{cust}</div>
                      <div style={{ fontSize:'12px', color:'#888' }}>{svc} · {date} {time}</div>
                    </div>
                    <span style={{ fontSize:'13px', color:'#D4A843' }}>Add feedback →</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div>
            <button onClick={function(){setSelected(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to sessions</button>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>{selected.profiles && selected.profiles.full_name}</div>
              <div style={{ fontSize:'12px', color:'#888', marginBottom:'1.25rem' }}>
                {selected.services && selected.services.name} · {new Date(selected.starts_at).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
              </div>

              <div style={{ marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'8px' }}>Strengths shown this session</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {STRENGTHS.map(function(s){ return <Chip key={s} label={s} active={strengths.includes(s)} onClick={function(){toggleChip(strengths, setStrengths, s)}} /> })}
                </div>
              </div>

              <div style={{ marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'8px' }}>Focus areas to work on</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {FOCUS_AREAS.map(function(f){ return <Chip key={f} label={f} active={focusAreas.includes(f)} onClick={function(){toggleChip(focusAreas, setFocusAreas, f)}} /> })}
                </div>
              </div>

              <div style={{ marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'6px' }}>Session notes</div>
                <textarea style={{ ...inp, resize:'none', height:'80px' }} placeholder="Notes about this student's progress..." value={notes} onChange={function(e){setNotes(e.target.value)}} />
                <div style={{ display:'flex', gap:'8px', marginTop:'6px' }}>
                  {[['shared','Shared with student'],['private','Coach only']].map(function(v){ return <button key={v[0]} onClick={function(){setVisibility(v[0])}} style={{ ...btn, fontSize:'12px', padding:'5px 12px', background:visibility===v[0]?'#F5E6C0':'transparent', borderColor:visibility===v[0]?'#D4A843':'rgba(0,0,0,0.15)', color:visibility===v[0]?'#8B6914':'#666', fontWeight:visibility===v[0]?600:400 }}>{v[1]}</button> })}
                </div>
              </div>

              <div style={{ marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'6px' }}>Next goal for student</div>
                <input type="text" style={inp} placeholder="e.g. Work on first serve consistency under pressure" value={nextGoal} onChange={function(e){setNextGoal(e.target.value)}} />
              </div>

              <div style={{ marginBottom:'1.5rem' }}>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'8px' }}>Session rating (optional)</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  {[1,2,3,4,5].map(function(n){ return <button key={n} onClick={function(){setRating(n)}} style={{ width:'36px', height:'36px', borderRadius:'8px', border:'0.5px solid '+(rating>=n?'#D4A843':'rgba(0,0,0,0.15)'), background:rating>=n?'#F5E6C0':'transparent', cursor:'pointer', fontSize:'18px' }}>{'★'}</button> })}
                </div>
              </div>

              {saved ? (
                <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#0F6E56', fontWeight:600, textAlign:'center' }}>✓ Feedback submitted successfully!</div>
              ) : (
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setSelected(null)}}>Cancel</button>
                  <button style={btnGold} onClick={submitFeedback} disabled={saving}>{saving?'Submitting...':'Submit feedback'}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CoachLayout>
  )
}
