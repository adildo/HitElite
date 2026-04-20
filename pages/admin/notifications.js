import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var NOTIFICATION_EVENTS = [
  { group:'Bookings', events:[
    { key:'class_booked', label:'Customer books a class', recipients:'Customer, Coach, Admin', channels:['email','sms'] },
    { key:'class_cancelled_admin', label:'Class cancelled by admin', recipients:'All enrolled customers, Coach', channels:['email','sms'] },
    { key:'class_reminder', label:'Class reminder', recipients:'Customer, Coach', channels:['email','sms'], hasDelay:true },
    { key:'waitlist_joined', label:'Customer joins waitlist', recipients:'Customer', channels:['email','sms'] },
    { key:'waitlist_promoted', label:'Customer moved from waitlist to enrolled', recipients:'Customer, Coach', channels:['email','sms'] },
  ]},
  { group:'Appointments', events:[
    { key:'appt_request_submitted', label:'Appointment request submitted', recipients:'Admin, Coach', channels:['email','sms'] },
    { key:'appt_request_approved', label:'Appointment request approved', recipients:'Customer, Coach', channels:['email','sms'] },
    { key:'appt_request_declined', label:'Appointment request declined', recipients:'Customer', channels:['email'] },
    { key:'appt_booked', label:'Private lesson booked (instant)', recipients:'Customer, Coach, Admin', channels:['email','sms'] },
    { key:'appt_reminder', label:'Appointment reminder', recipients:'Customer, Coach', channels:['email','sms'], hasDelay:true },
    { key:'appt_cancelled', label:'Appointment cancelled', recipients:'Customer, Coach, Admin', channels:['email'] },
  ]},
  { group:'Payments', events:[
    { key:'payment_completed', label:'Payment completed', recipients:'Customer, Admin', channels:['email'] },
    { key:'payment_failed', label:'Payment failed / card declined', recipients:'Customer, Admin', channels:['email','sms'] },
    { key:'balance_due', label:'Balance due reminder', recipients:'Customer', channels:['email','sms'] },
    { key:'gift_card_issued', label:'Gift card issued', recipients:'Recipient', channels:['email'] },
  ]},
  { group:'Customers', events:[
    { key:'new_customer_welcome', label:'New customer welcome', recipients:'Customer', channels:['email'] },
    { key:'birthday', label:'Customer birthday', recipients:'Customer', channels:['email','sms'] },
    { key:'waiver_signed', label:'Terms & Waiver signed', recipients:'Customer, Admin', channels:['email'] },
    { key:'review_request', label:'Review request', recipients:'Customer', channels:['sms'] },
  ]},
  { group:'Staff', events:[
    { key:'task_assigned', label:'Staff task assigned', recipients:'Staff member', channels:['email'] },
    { key:'payout_ready', label:'Coach payout report ready', recipients:'Coach', channels:['email'] },
  ]},
]

var DEFAULT_TEMPLATES = {
  class_booked: { subject:'Your booking is confirmed — {{class_name}}', body:'Hi {{customer_first_name}},\n\nYou\'re confirmed for {{class_name}} on {{class_date}} at {{class_time}}.\n\nCoach: {{coach_name}}\nLocation: {{location_name}}\n\nSee you on the court!\n\n{{business_name}}' },
  appt_request_submitted: { subject:'New appointment request from {{customer_name}}', body:'Hi,\n\nA new appointment request has been submitted.\n\nCustomer: {{customer_name}}\nService: {{service_name}}\nRequested time: {{appointment_datetime}}\n\nLog in to review and approve.\n\n{{business_name}}' },
  appt_request_approved: { subject:'Your appointment is confirmed — {{service_name}}', body:'Hi {{customer_first_name}},\n\nGreat news! Your appointment for {{service_name}} has been confirmed.\n\nDate: {{appointment_date}}\nTime: {{appointment_time}}\nCoach: {{coach_name}}\n\n{{business_name}}' },
  appt_reminder: { subject:'Reminder: {{service_name}} tomorrow at {{appointment_time}}', body:'Hi {{customer_first_name}},\n\nJust a reminder — you have {{service_name}} tomorrow at {{appointment_time}} with {{coach_name}}.\n\nLocation: {{location_name}}\n\nSee you then!\n\n{{business_name}}' },
  new_customer_welcome: { subject:'Welcome to {{business_name}}!', body:'Hi {{customer_first_name}},\n\nWelcome to {{business_name}}! We\'re so glad you\'re here.\n\nYou can browse and book classes and private lessons at any time from your portal.\n\nLet us know if you have any questions.\n\n{{business_name}} Team' },
  payment_completed: { subject:'Payment confirmed — {{amount}}', body:'Hi {{customer_first_name}},\n\nWe\'ve received your payment of {{amount}}. Thank you!\n\nBooking: {{booking_details}}\n\n{{business_name}}' },
}

var TOKENS = ['{{customer_first_name}}','{{customer_name}}','{{coach_name}}','{{class_name}}','{{service_name}}','{{appointment_date}}','{{appointment_time}}','{{appointment_datetime}}','{{class_date}}','{{class_time}}','{{location_name}}','{{amount}}','{{business_name}}','{{booking_reference}}']

export default function Notifications() {
  var [settings, setSettings] = useState({})
  var [delays, setDelays] = useState({})
  var [tab, setTab] = useState('events')
  var [editingTemplate, setEditingTemplate] = useState(null)
  var [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  var [saving, setSaving] = useState(false)
  var [saved, setSaved] = useState(false)
  var [integrations, setIntegrations] = useState({ sendgrid_key:'', sendgrid_from:'', twilio_sid:'', twilio_token:'', twilio_from:'' })

  useEffect(function(){
    // Load saved settings from Supabase (stored in a settings table)
    async function load(){
      var r = await supabase.from('notification_settings').select('*').limit(1).maybeSingle()
      if (r.data) {
        if (r.data.settings_json) setSettings(r.data.settings_json)
        if (r.data.delays_json) setDelays(r.data.delays_json)
        if (r.data.templates_json) setTemplates(function(p){ return {...p, ...r.data.templates_json} })
        if (r.data.integrations_json) setIntegrations(function(p){ return {...p, ...r.data.integrations_json} })
      } else {
        // Default all events to enabled
        var defaults = {}
        NOTIFICATION_EVENTS.forEach(function(g){ g.events.forEach(function(e){ defaults[e.key] = { email:true, sms:false } }) })
        setSettings(defaults)
      }
    }
    load()
  }, [])

  async function saveSettings(){
    setSaving(true)
    var existing = await supabase.from('notification_settings').select('id').limit(1).maybeSingle()
    var payload = { settings_json:settings, delays_json:delays, templates_json:templates }
    if (existing.data) await supabase.from('notification_settings').update(payload).eq('id', existing.data.id)
    else await supabase.from('notification_settings').insert(payload)
    setSaving(false); setSaved(true)
    setTimeout(function(){ setSaved(false) }, 2500)
  }

  async function saveIntegrations(){
    setSaving(true)
    var existing = await supabase.from('notification_settings').select('id').limit(1).maybeSingle()
    if (existing.data) await supabase.from('notification_settings').update({ integrations_json:integrations }).eq('id', existing.data.id)
    else await supabase.from('notification_settings').insert({ integrations_json:integrations, settings_json:{}, delays_json:{}, templates_json:{} })
    setSaving(false); setSaved(true)
    setTimeout(function(){ setSaved(false) }, 2500)
  }

  function toggleChannel(eventKey, channel){
    setSettings(function(p){
      var n = {...p}
      if (!n[eventKey]) n[eventKey] = { email:false, sms:false }
      n[eventKey] = {...n[eventKey], [channel]: !n[eventKey][channel] }
      return n
    })
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  function tabStyle(t){
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' }
  }

  // Template editor modal
  if (editingTemplate) {
    var tmpl = templates[editingTemplate.key] || { subject:'', body:'' }
    return (
      <AdminLayout active="settings">
        <div style={{ padding:'1.5rem 2rem', maxWidth:'760px' }}>
          <button onClick={function(){setEditingTemplate(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to notifications</button>
          <div style={{ fontSize:'18px', fontWeight:700, marginBottom:'4px' }}>Edit template: {editingTemplate.label}</div>
          <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>Recipients: {editingTemplate.recipients}</div>

          {/* Token reference */}
          <div style={{ background:'#f9f9f7', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'12px 16px', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'12px', fontWeight:600, color:'#666', marginBottom:'8px' }}>Available tokens — click to copy</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {TOKENS.map(function(t){ return (
                <button key={t} onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(t)}} style={{ padding:'3px 10px', borderRadius:'6px', border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontSize:'11px', cursor:'pointer', fontFamily:'monospace', color:'#534AB7' }}>{t}</button>
              )})}
            </div>
          </div>

          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Email subject line</div>
              <input type="text" style={inp} value={tmpl.subject} onChange={function(e){var v=e.target.value;setTemplates(function(p){var n={...p};n[editingTemplate.key]={...n[editingTemplate.key],subject:v};return n})}} placeholder="Subject..." />
            </div>
            <div>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Email body</div>
              <textarea style={{ ...inp, resize:'vertical', minHeight:'220px', fontFamily:'monospace', lineHeight:1.6 }} value={tmpl.body} onChange={function(e){var v=e.target.value;setTemplates(function(p){var n={...p};n[editingTemplate.key]={...n[editingTemplate.key],body:v};return n})}} />
            </div>
          </div>

          <div style={{ background:'#E6F1FB', border:'0.5px solid #85B7EB', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#185FA5', marginBottom:'1.25rem' }}>
            📧 Templates are sent via SendGrid. Connect your API key in the Integrations tab to enable sending.
          </div>

          <div style={{ display:'flex', gap:'8px' }}>
            <button style={btn} onClick={function(){setEditingTemplate(null)}}>Cancel</button>
            <button style={btnGold} onClick={async function(){await saveSettings();setEditingTemplate(null)}}>{saving?'Saving...':'Save template'}</button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout active="settings">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Notifications</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Configure automated emails and SMS for every event</div>
          </div>
          {tab === 'events' && (
            <button style={btnGold} onClick={saveSettings} disabled={saving}>
              {saving?'Saving...':saved?'✓ Saved!':'Save settings'}
            </button>
          )}
        </div>

        {saved && <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'10px 16px', fontSize:'13px', color:'#0F6E56', marginBottom:'1rem' }}>✓ Settings saved successfully.</div>}

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          {[['events','Notification events'],['integrations','Integrations']].map(function(t){ return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0])}}>{t[1]}</button> })}
        </div>

        {tab === 'events' && (
          <div>
            <div style={{ background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#8B6914', marginBottom:'1.25rem', display:'flex', gap:'10px', alignItems:'center' }}>
              <span>💡</span>
              <span>Toggle email and SMS on/off per event. Click <strong>Edit template</strong> to customize the message content and subject line.</span>
            </div>

            {NOTIFICATION_EVENTS.map(function(group){
              return (
                <div key={group.group} style={{ marginBottom:'1.5rem' }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px' }}>{group.group}</div>
                  <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                    {group.events.map(function(evt, i){
                      var s = settings[evt.key] || { email:false, sms:false }
                      return (
                        <div key={evt.key} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 1.25rem', borderBottom:i<group.events.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:'13px', fontWeight:500 }}>{evt.label}</div>
                            <div style={{ fontSize:'11px', color:'#aaa', marginTop:'2px' }}>→ {evt.recipients}</div>
                          </div>
                          {evt.hasDelay && (
                            <select style={{ padding:'5px 8px', borderRadius:'6px', border:'0.5px solid rgba(0,0,0,0.15)', fontSize:'12px', background:'#fff', fontFamily:'inherit' }}
                              value={delays[evt.key]||'24h'}
                              onChange={function(e){var v=e.target.value;setDelays(function(p){var n={...p};n[evt.key]=v;return n})}}>
                              <option value="1h">1h before</option>
                              <option value="2h">2h before</option>
                              <option value="12h">12h before</option>
                              <option value="24h">24h before</option>
                              <option value="48h">48h before</option>
                            </select>
                          )}
                          {evt.channels.map(function(ch){
                            var on = s[ch]
                            return (
                              <div key={ch} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                                <div onClick={function(){toggleChannel(evt.key, ch)}} style={{ width:'34px', height:'19px', borderRadius:'10px', background:on?ch==='email'?'#185FA5':'#1D9E75':'rgba(0,0,0,0.15)', position:'relative', cursor:'pointer', transition:'background .15s' }}>
                                  <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background:'#fff', top:'2px', right:on?'2px':'17px', transition:'right .15s' }}></div>
                                </div>
                                <span style={{ fontSize:'11px', color:on?'#444':'#aaa', fontWeight:on?600:400 }}>{ch==='email'?'✉ Email':'💬 SMS'}</span>
                              </div>
                            )
                          })}
                          <button style={{ ...btn, fontSize:'11px', padding:'4px 10px', flexShrink:0 }} onClick={function(){setEditingTemplate(evt)}}>Edit template</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'integrations' && (
          <div style={{ display:'grid', gap:'16px', maxWidth:'600px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>SendGrid — Email</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Required to send all email notifications. <a href="https://sendgrid.com" target="_blank" rel="noreferrer" style={{ color:'#D4A843' }}>Get a free API key →</a></div>
              <div style={{ display:'grid', gap:'12px' }}>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>SendGrid API key</div><input type="password" style={inp} value={integrations.sendgrid_key} onChange={function(e){setIntegrations(function(p){return{...p,sendgrid_key:e.target.value}})}} placeholder="SG.xxxxxxxxxxxx..." /></div>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>From email address</div><input type="email" style={inp} value={integrations.sendgrid_from} onChange={function(e){setIntegrations(function(p){return{...p,sendgrid_from:e.target.value}})}} placeholder="noreply@yourbusiness.com" /></div>
              </div>
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Twilio — SMS</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Required to send SMS notifications. <a href="https://twilio.com" target="_blank" rel="noreferrer" style={{ color:'#D4A843' }}>Get Twilio credentials →</a></div>
              <div style={{ display:'grid', gap:'12px' }}>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Account SID</div><input type="password" style={inp} value={integrations.twilio_sid} onChange={function(e){setIntegrations(function(p){return{...p,twilio_sid:e.target.value}})}} placeholder="ACxxxxxxxxx..." /></div>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Auth token</div><input type="password" style={inp} value={integrations.twilio_token} onChange={function(e){setIntegrations(function(p){return{...p,twilio_token:e.target.value}})}} placeholder="Your auth token..." /></div>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>From phone number</div><input type="text" style={inp} value={integrations.twilio_from} onChange={function(e){setIntegrations(function(p){return{...p,twilio_from:e.target.value}})}} placeholder="+15550001234" /></div>
              </div>
            </div>
            <button style={btnGold} onClick={saveIntegrations} disabled={saving}>{saving?'Saving...':saved?'✓ Saved!':'Save integration keys'}</button>
            <div style={{ background:'#FCEBEB', border:'0.5px solid #F09595', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#A32D2D' }}>
              🔒 API keys are stored encrypted in your Supabase database. Never share them publicly.
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
