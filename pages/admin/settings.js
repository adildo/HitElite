import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Settings() {
  var [tab, setTab] = useState('business')
  var [saving, setSaving] = useState(false)
  var [saved, setSaved] = useState(false)
  var [business, setBusiness] = useState({ name:'Hit Elite Tennis & Pickleball', email:'admin@hitelite.com', phone:'', address:'', city:'', state:'', zip:'', website:'' })
  var [booking, setBooking] = useState({ default_duration:60, advance_days:30, cancellation_hours:24, buffer_before:0, buffer_after:0, require_payment:true, currency:'usd' })
  var [stripeConfig, setStripeConfig] = useState({ publishable_key:'', secret_key:'', webhook_secret:'', mode:'test' })
  var [stripeStatus, setStripeStatus] = useState(null)
  var [testing, setTesting] = useState(false)

  useEffect(function(){
    async function load(){
      var r = await supabase.from('business_settings').select('*').limit(1).maybeSingle()
      if (r.data) {
        if (r.data.business_json) setBusiness(function(p){return{...p,...r.data.business_json}})
        if (r.data.booking_json) setBooking(function(p){return{...p,...r.data.booking_json}})
        if (r.data.stripe_json) setStripeConfig(function(p){return{...p,publishable_key:r.data.stripe_json.publishable_key||'',mode:r.data.stripe_json.mode||'test'}})
      }
      // Check if Stripe env vars are set
      var testR = await fetch('/api/stripe/status').catch(function(){return null})
      if (testR && testR.ok) { var d = await testR.json(); setStripeStatus(d) }
    }
    load()
  },[])

  async function save(section) {
    setSaving(true)
    var r = await supabase.from('business_settings').select('id').limit(1).maybeSingle()
    var payload = {}
    if (section === 'business') payload.business_json = business
    if (section === 'booking') payload.booking_json = booking
    if (section === 'stripe') payload.stripe_json = { publishable_key: stripeConfig.publishable_key, mode: stripeConfig.mode }
    if (r.data) await supabase.from('business_settings').update(payload).eq('id',r.data.id)
    else await supabase.from('business_settings').insert({...payload})
    setSaving(false); setSaved(true)
    setTimeout(function(){setSaved(false)},2500)
  }

  async function testStripe() {
    setTesting(true)
    var r = await fetch('/api/stripe/status').catch(function(){return null})
    if (r && r.ok) { var d = await r.json(); setStripeStatus(d) }
    setTesting(false)
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { ...inp, fontFamily:'inherit' }

  function tabStyle(t) {
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' }
  }

  function Field({ label, value, onChange, type, placeholder }) {
    return (
      <div>
        <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>{label}</div>
        <input type={type||'text'} style={inp} value={value||''} onChange={function(e){onChange(e.target.value)}} placeholder={placeholder||''} />
      </div>
    )
  }

  return (
    <AdminLayout active="settings">
      <div style={{ padding:'1.5rem 2rem', maxWidth:'720px' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'1rem' }}>Settings</div>

        {saved && <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'10px 16px', fontSize:'13px', color:'#0F6E56', marginBottom:'1rem' }}>✓ Settings saved.</div>}

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.5rem' }}>
          {[['business','Business'],['booking','Booking'],['stripe','Stripe / Payments'],['integrations','Integrations']].map(function(t){
            return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0])}}>{t[1]}</button>
          })}
        </div>

        {/* BUSINESS INFO */}
        {tab === 'business' && (
          <div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Business information</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div style={{ gridColumn:'span 2' }}><Field label="Business name" value={business.name} onChange={function(v){setBusiness(function(p){return{...p,name:v}})}} /></div>
                <Field label="Contact email" value={business.email} onChange={function(v){setBusiness(function(p){return{...p,email:v}})}} type="email" />
                <Field label="Phone" value={business.phone} onChange={function(v){setBusiness(function(p){return{...p,phone:v}})}} placeholder="(555) 000-0000" />
                <div style={{ gridColumn:'span 2' }}><Field label="Address" value={business.address} onChange={function(v){setBusiness(function(p){return{...p,address:v}})}} placeholder="123 Court Drive" /></div>
                <Field label="City" value={business.city} onChange={function(v){setBusiness(function(p){return{...p,city:v}})}} />
                <Field label="State" value={business.state} onChange={function(v){setBusiness(function(p){return{...p,state:v}})}} placeholder="CA" />
                <Field label="ZIP" value={business.zip} onChange={function(v){setBusiness(function(p){return{...p,zip:v}})}} />
                <Field label="Website" value={business.website} onChange={function(v){setBusiness(function(p){return{...p,website:v}})}} placeholder="https://yourbusiness.com" />
              </div>
            </div>
            <button style={btnGold} onClick={function(){save('business')}} disabled={saving}>{saving?'Saving...':'Save business info'}</button>
          </div>
        )}

        {/* BOOKING SETTINGS */}
        {tab === 'booking' && (
          <div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Booking defaults</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Default session duration (min)</div>
                  <select style={sel} value={booking.default_duration} onChange={function(e){setBooking(function(p){return{...p,default_duration:parseInt(e.target.value)}})}}>
                    {[30,45,60,75,90,120].map(function(d){return <option key={d} value={d}>{d} minutes</option>})}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Advance booking window (days)</div>
                  <select style={sel} value={booking.advance_days} onChange={function(e){setBooking(function(p){return{...p,advance_days:parseInt(e.target.value)}})}}>
                    {[7,14,30,60,90].map(function(d){return <option key={d} value={d}>{d} days</option>})}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Cancellation notice required (hours)</div>
                  <select style={sel} value={booking.cancellation_hours} onChange={function(e){setBooking(function(p){return{...p,cancellation_hours:parseInt(e.target.value)}})}}>
                    {[1,2,4,12,24,48,72].map(function(h){return <option key={h} value={h}>{h}h before session</option>})}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Currency</div>
                  <select style={sel} value={booking.currency} onChange={function(e){setBooking(function(p){return{...p,currency:e.target.value}})}}>
                    <option value="usd">USD ($)</option>
                    <option value="cad">CAD (C$)</option>
                    <option value="gbp">GBP (£)</option>
                    <option value="eur">EUR (€)</option>
                    <option value="aud">AUD (A$)</option>
                  </select>
                </div>
              </div>
            </div>
            <button style={btnGold} onClick={function(){save('booking')}} disabled={saving}>{saving?'Saving...':'Save booking settings'}</button>
          </div>
        )}

        {/* STRIPE */}
        {tab === 'stripe' && (
          <div>
            {/* Status banner */}
            {stripeStatus && (
              <div style={{ background:stripeStatus.connected?'#E1F5EE':'#FCEBEB', border:'0.5px solid '+(stripeStatus.connected?'#5DCAA5':'#F09595'), borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:stripeStatus.connected?'#0F6E56':'#A32D2D', marginBottom:'1.25rem', display:'flex', gap:'10px', alignItems:'center' }}>
                <span style={{ fontSize:'18px' }}>{stripeStatus.connected?'✅':'❌'}</span>
                <div>
                  <div style={{ fontWeight:600 }}>{stripeStatus.connected?'Stripe connected — '+stripeStatus.mode+' mode':'Stripe not connected'}</div>
                  <div style={{ marginTop:'2px' }}>{stripeStatus.connected?'Payments are live. Webhooks: '+(stripeStatus.webhook?'✓ configured':'⚠ not configured yet'):'Add your Stripe keys below to start accepting payments.'}</div>
                </div>
              </div>
            )}

            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Stripe API keys</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>
                Add your keys from the <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" style={{ color:'#D4A843' }}>Stripe Dashboard → API Keys</a>. Use test keys while setting up, switch to live when ready.
              </div>

              <div style={{ display:'grid', gap:'12px', marginBottom:'1.25rem' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Mode</div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    {['test','live'].map(function(m){
                      var active = stripeConfig.mode === m
                      return <button key={m} onClick={function(){setStripeConfig(function(p){return{...p,mode:m}})}} style={{ padding:'7px 20px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{m.charAt(0).toUpperCase()+m.slice(1)} mode</button>
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Publishable key (frontend)</div>
                  <input type="text" style={inp} value={stripeConfig.publishable_key} onChange={function(e){setStripeConfig(function(p){return{...p,publishable_key:e.target.value}})}} placeholder={stripeConfig.mode==='test'?'pk_test_...':'pk_live_...'} />
                </div>
              </div>

              <div style={{ background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'8px', padding:'12px 16px', fontSize:'12px', color:'#8B6914', marginBottom:'1.25rem' }}>
                <div style={{ fontWeight:600, marginBottom:'4px' }}>🔒 Secret keys go in Vercel environment variables — not here</div>
                <div>Add <code style={{ background:'rgba(0,0,0,0.1)', padding:'1px 5px', borderRadius:'3px' }}>STRIPE_SECRET_KEY</code> and <code style={{ background:'rgba(0,0,0,0.1)', padding:'1px 5px', borderRadius:'3px' }}>STRIPE_WEBHOOK_SECRET</code> in Vercel → Project → Settings → Environment Variables. Never put secret keys in the database.</div>
              </div>

              <div style={{ display:'flex', gap:'8px' }}>
                <button style={btnGold} onClick={function(){save('stripe')}} disabled={saving}>{saving?'Saving...':'Save Stripe settings'}</button>
                <button style={btn} onClick={testStripe} disabled={testing}>{testing?'Testing...':'Test connection'}</button>
              </div>
            </div>

            {/* Webhook setup */}
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Webhook setup</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Required to automatically confirm payments, update booking status, and award loyalty points.</div>
              <div style={{ background:'#f9f9f7', borderRadius:'8px', padding:'12px 16px', marginBottom:'1rem' }}>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'6px', fontWeight:500 }}>Your webhook endpoint URL</div>
                <div style={{ fontFamily:'monospace', fontSize:'13px', color:'#534AB7', wordBreak:'break-all' }}>
                  {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/webhooks/stripe
                </div>
              </div>
              <div style={{ fontSize:'13px', color:'#444', lineHeight:1.7 }}>
                <div style={{ fontWeight:600, marginBottom:'6px' }}>Steps to configure:</div>
                <ol style={{ paddingLeft:'1.25rem', display:'grid', gap:'4px' }}>
                  <li>Go to <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noreferrer" style={{ color:'#D4A843' }}>Stripe Dashboard → Webhooks</a></li>
                  <li>Click <strong>Add endpoint</strong> and paste the URL above</li>
                  <li>Select these events: <code style={{ background:'#f1f1f1', padding:'1px 5px', borderRadius:'3px', fontSize:'12px' }}>checkout.session.completed</code>, <code style={{ background:'#f1f1f1', padding:'1px 5px', borderRadius:'3px', fontSize:'12px' }}>payment_intent.payment_failed</code>, <code style={{ background:'#f1f1f1', padding:'1px 5px', borderRadius:'3px', fontSize:'12px' }}>customer.subscription.*</code></li>
                  <li>Copy the <strong>Signing secret</strong> and add it as <code style={{ background:'#f1f1f1', padding:'1px 5px', borderRadius:'3px', fontSize:'12px' }}>STRIPE_WEBHOOK_SECRET</code> in Vercel environment variables</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* INTEGRATIONS */}
        {tab === 'integrations' && (
          <div style={{ display:'grid', gap:'12px' }}>
            {[
              { name:'SendGrid', desc:'Email notifications', link:'https://sendgrid.com', vars:['SENDGRID_API_KEY','SENDGRID_FROM_EMAIL'] },
              { name:'Twilio', desc:'SMS notifications', link:'https://twilio.com', vars:['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER'] },
              { name:'Google Calendar', desc:'Two-way coach calendar sync', link:'https://console.cloud.google.com', vars:['GOOGLE_CALENDAR_CLIENT_ID','GOOGLE_CALENDAR_CLIENT_SECRET'] },
            ].map(function(intg){
              return (
                <div key={intg.name} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:600 }}>{intg.name}</div>
                      <div style={{ fontSize:'12px', color:'#888' }}>{intg.desc}</div>
                    </div>
                    <a href={intg.link} target="_blank" rel="noreferrer" style={{ fontSize:'12px', color:'#D4A843', fontWeight:600 }}>Get credentials →</a>
                  </div>
                  <div style={{ background:'#f9f9f7', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#666' }}>
                    Add these to <strong>Vercel → Settings → Environment Variables</strong>:
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'6px' }}>
                      {intg.vars.map(function(v){ return <code key={v} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.15)', padding:'2px 8px', borderRadius:'4px', fontSize:'11px' }}>{v}</code> })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
