import { useEffect, useState } from 'react'
import CoachLayout from '../../components/coach/CoachLayout'
import { supabase } from '../../lib/supabase'

var DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
var TIMES = []
for (var h=6;h<=21;h++){TIMES.push((h<10?'0'+h:h)+':00');TIMES.push((h<10?'0'+h:h)+':30')}

export default function CoachSchedule() {
  var [availability, setAvailability] = useState({
    weekly_hours: { Monday:{enabled:true,start:'09:00',end:'17:00'}, Tuesday:{enabled:true,start:'09:00',end:'17:00'}, Wednesday:{enabled:true,start:'09:00',end:'17:00'}, Thursday:{enabled:true,start:'09:00',end:'17:00'}, Friday:{enabled:true,start:'09:00',end:'17:00'}, Saturday:{enabled:false,start:'09:00',end:'13:00'}, Sunday:{enabled:false,start:'09:00',end:'13:00'} },
    slot_duration: 60,
    buffer_time: 0,
    advance_days: 30,
    date_overrides: []
  })
  var [saving, setSaving] = useState(false)
  var [saved, setSaved] = useState(false)
  var [tab, setTab] = useState('hours')
  var [newOverride, setNewOverride] = useState({ date:'', type:'unavailable', start:'09:00', end:'17:00', note:'' })
  var [gcalConnected, setGcalConnected] = useState(false)
  var [gcalEmail, setGcalEmail] = useState('')

  useEffect(function(){
    async function load(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) return
      var r = await supabase.from('staff').select('availability_json, calendar_sync_token, calendar_email').eq('id',s.data.session.user.id).maybeSingle()
      if (r.data) {
        if (r.data.availability_json) setAvailability(function(p){ return {...p,...r.data.availability_json} })
        if (r.data.calendar_sync_token) setGcalConnected(true)
        if (r.data.calendar_email) setGcalEmail(r.data.calendar_email)
      }
    }
    load()
  },[])

  async function save() {
    setSaving(true)
    var s = await supabase.auth.getSession()
    if (!s.data.session) return
    await supabase.from('staff').update({ availability_json: availability }).eq('id', s.data.session.user.id)
    setSaving(false); setSaved(true)
    setTimeout(function(){setSaved(false)},2500)
  }

  function setDayField(day, field, value) {
    setAvailability(function(p){
      var n = {...p, weekly_hours:{...p.weekly_hours}}
      n.weekly_hours[day] = {...n.weekly_hours[day], [field]:value}
      return n
    })
  }

  function addOverride() {
    if (!newOverride.date) return
    setAvailability(function(p){
      return {...p, date_overrides:[...(p.date_overrides||[]), {...newOverride, id:Date.now().toString()}]}
    })
    setNewOverride({ date:'', type:'unavailable', start:'09:00', end:'17:00', note:'' })
  }

  function removeOverride(id) {
    setAvailability(function(p){
      return {...p, date_overrides:(p.date_overrides||[]).filter(function(o){return o.id!==id})}
    })
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { ...inp, fontFamily:'inherit' }

  function tabStyle(t){ return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' } }

  return (
    <CoachLayout active="schedule">
      <div style={{ padding:'1.5rem 2rem', maxWidth:'720px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>My availability</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Set when you're available for bookings</div>
          </div>
          <button style={btnGold} onClick={save} disabled={saving}>{saving?'Saving...':saved?'✓ Saved!':'Save availability'}</button>
        </div>

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          <button style={tabStyle('hours')} onClick={function(){setTab('hours')}}>Weekly hours</button>
          <button style={tabStyle('overrides')} onClick={function(){setTab('overrides')}}>Date overrides</button>
          <button style={tabStyle('settings')} onClick={function(){setTab('settings')}}>Settings</button>
          <button style={tabStyle('calendar')} onClick={function(){setTab('calendar')}}>Google Calendar</button>
        </div>

        {tab === 'hours' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            {DAYS.map(function(day, i){
              var dh = availability.weekly_hours[day]||{ enabled:false, start:'09:00', end:'17:00' }
              return (
                <div key={day} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 1.25rem', borderBottom:i<6?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                  <div style={{ width:'90px', fontSize:'13px', fontWeight:500, color:dh.enabled?'#1a1a1a':'#aaa' }}>{day}</div>
                  <div onClick={function(){setDayField(day,'enabled',!dh.enabled)}} style={{ width:'36px', height:'20px', borderRadius:'10px', background:dh.enabled?'#D4A843':'rgba(0,0,0,0.15)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
                    <div style={{ position:'absolute', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', top:'2px', right:dh.enabled?'2px':'18px', transition:'right .15s' }}></div>
                  </div>
                  {dh.enabled ? (
                    <div style={{ display:'flex', gap:'8px', alignItems:'center', flex:1 }}>
                      <select style={{ ...sel, width:'auto' }} value={dh.start} onChange={function(e){setDayField(day,'start',e.target.value)}}>
                        {TIMES.map(function(t){ return <option key={t}>{t}</option> })}
                      </select>
                      <span style={{ color:'#888', fontSize:'13px' }}>to</span>
                      <select style={{ ...sel, width:'auto' }} value={dh.end} onChange={function(e){setDayField(day,'end',e.target.value)}}>
                        {TIMES.map(function(t){ return <option key={t}>{t}</option> })}
                      </select>
                    </div>
                  ) : (
                    <span style={{ fontSize:'13px', color:'#aaa' }}>Unavailable</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'overrides' && (
          <div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Add date override</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Date</div><input type="date" style={inp} value={newOverride.date} onChange={function(e){setNewOverride(function(p){return{...p,date:e.target.value}})}} /></div>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Type</div>
                  <select style={sel} value={newOverride.type} onChange={function(e){setNewOverride(function(p){return{...p,type:e.target.value}})}}>
                    <option value="unavailable">Unavailable (day off)</option>
                    <option value="custom">Custom hours</option>
                  </select>
                </div>
                {newOverride.type === 'custom' && (
                  <>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Start</div><select style={sel} value={newOverride.start} onChange={function(e){setNewOverride(function(p){return{...p,start:e.target.value}})}}>{TIMES.map(function(t){return <option key={t}>{t}</option>})}</select></div>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>End</div><select style={sel} value={newOverride.end} onChange={function(e){setNewOverride(function(p){return{...p,end:e.target.value}})}}>{TIMES.map(function(t){return <option key={t}>{t}</option>})}</select></div>
                  </>
                )}
                <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Reason (optional)</div><input type="text" style={inp} value={newOverride.note} onChange={function(e){setNewOverride(function(p){return{...p,note:e.target.value}})}} placeholder="e.g. Vacation, Doctor's appointment..." /></div>
              </div>
              <button style={btnGold} onClick={addOverride} disabled={!newOverride.date}>+ Add override</button>
            </div>

            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              {(availability.date_overrides||[]).length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No date overrides. Add vacation days or special hours above.</div>}
              {(availability.date_overrides||[]).map(function(o,i){
                return (
                  <div key={o.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 1.25rem', borderBottom:i<(availability.date_overrides||[]).length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <div style={{ fontSize:'14px', fontWeight:600 }}>{o.date}</div>
                    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:o.type==='unavailable'?'#FCEBEB':'#E1F5EE', color:o.type==='unavailable'?'#A32D2D':'#0F6E56', fontWeight:500 }}>
                      {o.type==='unavailable'?'Day off':o.start+' – '+o.end}
                    </span>
                    {o.note && <div style={{ fontSize:'12px', color:'#888', flex:1 }}>{o.note}</div>}
                    <button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#A32D2D' }} onClick={function(){removeOverride(o.id)}}>Remove</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1.25rem' }}>Booking settings</div>
            <div style={{ display:'grid', gap:'14px' }}>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Appointment slot duration</div>
                <select style={sel} value={availability.slot_duration} onChange={function(e){setAvailability(function(p){return{...p,slot_duration:parseInt(e.target.value)}})}}>
                  {[30,45,60,75,90,120].map(function(d){ return <option key={d} value={d}>{d} minutes</option> })}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Buffer between appointments</div>
                <select style={sel} value={availability.buffer_time} onChange={function(e){setAvailability(function(p){return{...p,buffer_time:parseInt(e.target.value)}})}}>
                  {[0,5,10,15,30].map(function(d){ return <option key={d} value={d}>{d===0?'None':d+' minutes'}</option> })}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Advance booking window</div>
                <select style={sel} value={availability.advance_days} onChange={function(e){setAvailability(function(p){return{...p,advance_days:parseInt(e.target.value)}})}}>
                  {[7,14,30,60,90].map(function(d){ return <option key={d} value={d}>{d} days ahead</option> })}
                </select>
              </div>
            </div>
          </div>
        )}

        {tab === 'calendar' && (
          <div style={{ display:'grid', gap:'14px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Google Calendar sync</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Two-way sync — bookings appear in your Google Calendar, and events you add in Google block your availability here.</div>
              {gcalConnected ? (
                <div>
                  <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#0F6E56', marginBottom:'12px', display:'flex', gap:'8px', alignItems:'center' }}>
                    <span>✅</span><span>Connected to <strong>{gcalEmail}</strong></span>
                  </div>
                  <button style={{ ...btn, color:'#A32D2D' }} onClick={async function(){
                    var s = await supabase.auth.getSession()
                    await supabase.from('staff').update({ calendar_sync_token:null, calendar_email:null }).eq('id',s.data.session.user.id)
                    setGcalConnected(false); setGcalEmail('')
                  }}>Disconnect Google Calendar</button>
                </div>
              ) : (
                <div>
                  <div style={{ background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#8B6914', marginBottom:'12px' }}>
                    To enable Google Calendar sync, add <code style={{ background:'rgba(0,0,0,0.08)', padding:'1px 5px', borderRadius:'3px' }}>GOOGLE_CALENDAR_CLIENT_ID</code> and <code style={{ background:'rgba(0,0,0,0.08)', padding:'1px 5px', borderRadius:'3px' }}>GOOGLE_CALENDAR_CLIENT_SECRET</code> to your Vercel environment variables, then reconnect.
                  </div>
                  <button style={btnGold} onClick={function(){ window.location.href='/api/auth/google-calendar' }}>Connect Google Calendar</button>
                </div>
              )}
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Apple iCloud CalDAV</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'12px' }}>Sync with Apple Calendar using CalDAV.</div>
              <div style={{ background:'#f9f9f7', borderRadius:'8px', padding:'12px 14px', fontSize:'12px', color:'#666' }}>
                <div style={{ fontWeight:600, marginBottom:'6px' }}>To connect Apple Calendar:</div>
                <ol style={{ paddingLeft:'1.25rem', display:'grid', gap:'4px', lineHeight:1.7 }}>
                  <li>Open Apple Calendar → Preferences → Accounts → + Add Account</li>
                  <li>Select <strong>CalDAV</strong></li>
                  <li>Server: <code style={{ background:'#fff', padding:'1px 5px', borderRadius:'3px', fontSize:'11px' }}>caldav.hitelite.app/dav/{'{your-coach-id}'}</code></li>
                  <li>Use your Hit Elite email and password</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </CoachLayout>
  )
}
