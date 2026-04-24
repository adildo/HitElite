import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var SEQUENCE_TEMPLATES = [
  { name:'New customer welcome', trigger:'new_customer', steps:4, desc:'Welcome email → Intro offer SMS → Booking reminder → Follow-up' },
  { name:'First visit follow-up', trigger:'first_visit', steps:2, desc:'Thank you email + review request → Next booking prompt' },
  { name:'Win-back (30-day lapse)', trigger:'win_back', steps:3, desc:'Re-engagement email → SMS offer → Final attempt + call task' },
  { name:'Birthday campaign', trigger:'birthday', steps:2, desc:'Birthday offer email → SMS greeting' },
  { name:'Intro offer expiring', trigger:'intro_expiring', steps:3, desc:'7-day warning → 3-day SMS nudge → Day-of final email' },
  { name:'Milestone: 10 visits', trigger:'milestone', steps:1, desc:'Congratulations email + loyalty reward' },
]

export default function Marketing() {
  var [tab, setTab] = useState('campaigns')
  var [campaigns, setCampaigns] = useState([])
  var [sequences, setSequences] = useState([])
  var [loading, setLoading] = useState(true)
  var [showNew, setShowNew] = useState(false)
  var [newCampaign, setNewCampaign] = useState({ name:'', type:'email', subject:'', body:'', segment:'all' })
  var [saving, setSaving] = useState(false)

  useEffect(function(){
    async function load(){
      var [campR, seqR] = await Promise.all([
        supabase.from('campaigns').select('*').order('created_at',{ascending:false}).limit(20),
        supabase.from('sequences').select('*').order('created_at',{ascending:false}),
      ])
      setCampaigns(campR.data||[])
      setSequences(seqR.data||[])
      setLoading(false)
    }
    load()
  },[])

  async function saveCampaign(){
    setSaving(true)
    await supabase.from('campaigns').insert({ name:newCampaign.name, type:newCampaign.type, status:'draft', recipient_segment_json:{ segment:newCampaign.segment } })
    setSaving(false); setShowNew(false)
    var r = await supabase.from('campaigns').select('*').order('created_at',{ascending:false}).limit(20)
    setCampaigns(r.data||[])
  }

  async function createSequence(template){
    await supabase.from('sequences').insert({ name:template.name, trigger_type:template.trigger, steps_json:[], is_active:false })
    var r = await supabase.from('sequences').select('*').order('created_at',{ascending:false})
    setSequences(r.data||[])
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var tabStyle = function(t){ return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' } }

  return (
    <AdminLayout active="marketing">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div><div style={{ fontSize:'22px', fontWeight:700 }}>Marketing</div><div style={{ fontSize:'13px', color:'#888' }}>Campaigns, automation sequences, and lead nurturing</div></div>
          {tab==='campaigns' && <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ New campaign</button>}
        </div>

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          {[['campaigns','Campaigns'],['sequences','Automation'],['reviews','Reviews']].map(function(t){ return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0])}}>{t[1]}</button> })}
        </div>

        {tab==='campaigns' && (
          <div>
            {showNew && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>New campaign</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Campaign name</div><input type="text" style={inp} value={newCampaign.name} onChange={function(e){setNewCampaign(function(p){return{...p,name:e.target.value}})}} placeholder="e.g. Spring promotion" /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Type</div>
                    <select style={inp} value={newCampaign.type} onChange={function(e){setNewCampaign(function(p){return{...p,type:e.target.value}})}}>
                      <option value="email">Email</option><option value="sms">SMS</option>
                    </select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Send to</div>
                    <select style={inp} value={newCampaign.segment} onChange={function(e){setNewCampaign(function(p){return{...p,segment:e.target.value}})}}>
                      <option value="all">All customers</option><option value="active">Active customers</option><option value="inactive">Inactive (30+ days)</option><option value="vip">VIP tag</option>
                    </select>
                  </div>
                  {newCampaign.type==='email' && <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Subject line</div><input type="text" style={inp} value={newCampaign.subject} onChange={function(e){setNewCampaign(function(p){return{...p,subject:e.target.value}})}} placeholder="Your email subject..." /></div>}
                  <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Message</div><textarea style={{ ...inp, resize:'none', height:'100px' }} value={newCampaign.body} onChange={function(e){setNewCampaign(function(p){return{...p,body:e.target.value}})}} placeholder="Write your message... Use {first_name} for personalization." /></div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
                  <button style={btn} onClick={saveCampaign}>Save as draft</button>
                  <button style={btnGold} onClick={saveCampaign} disabled={saving}>{saving?'Sending...':'Send now'}</button>
                </div>
              </div>
            )}
            <div style={{ display:'grid', gap:'10px' }}>
              {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
              {!loading && campaigns.length===0 && (
                <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
                  <div style={{ fontSize:'32px', marginBottom:'14px' }}>📣</div>
                  <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>No campaigns yet</div>
                  <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Send email or SMS campaigns to your customers.</div>
                  <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Create first campaign</button>
                </div>
              )}
              {campaigns.map(function(c,i){
                var statusColors = { draft:['#F1EFE8','#5F5E5A'], sent:['#E1F5EE','#0F6E56'], scheduled:['#FAEEDA','#854F0B'] }
                var sc = statusColors[c.status]||statusColors.draft
                return <div key={c.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ fontSize:'22px' }}>{c.type==='sms'?'💬':'✉'}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'3px' }}>{c.name}</div>
                    <div style={{ fontSize:'12px', color:'#888' }}>{c.type==='sms'?'SMS':'Email'} · Created {c.created_at?new Date(c.created_at).toLocaleDateString():''}</div>
                  </div>
                  <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{c.status||'draft'}</span>
                  <button style={{ ...btn, fontSize:'12px', padding:'5px 10px' }}>Edit</button>
                </div>
              })}
            </div>
          </div>
        )}

        {tab==='sequences' && (
          <div>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Pre-built sequence templates</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px', marginBottom:'1.5rem' }}>
              {SEQUENCE_TEMPLATES.map(function(t){
                var exists = sequences.some(function(s){ return s.trigger_type===t.trigger })
                return <div key={t.trigger} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                  <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>{t.name}</div>
                  <div style={{ fontSize:'12px', color:'#888', marginBottom:'10px', lineHeight:1.5 }}>{t.desc}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'11px', color:'#aaa' }}>{t.steps} step{t.steps!==1?'s':''}</span>
                    {exists ? <span style={{ fontSize:'12px', color:'#0F6E56', fontWeight:500 }}>✓ Created</span> : <button style={{ ...btnGold, fontSize:'12px', padding:'5px 12px' }} onClick={function(){createSequence(t)}}>Use template</button>}
                  </div>
                </div>
              })}
            </div>
            {sequences.length>0 && (
              <div>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Your sequences</div>
                <div style={{ display:'grid', gap:'8px' }}>
                  {sequences.map(function(s){
                    return <div key={s.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'12px 1.25rem', display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:600 }}>{s.name}</div>
                        <div style={{ fontSize:'12px', color:'#888' }}>Trigger: {s.trigger_type}</div>
                      </div>
                      <div onClick={async function(){ await supabase.from('sequences').update({is_active:!s.is_active}).eq('id',s.id); setSequences(function(prev){return prev.map(function(x){return x.id===s.id?{...x,is_active:!x.is_active}:x})}) }} style={{ width:'34px', height:'19px', borderRadius:'10px', background:s.is_active?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
                        <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background:'#fff', top:'2px', right:s.is_active?'2px':'17px', transition:'right .15s' }}></div>
                      </div>
                      <span style={{ fontSize:'12px', color:s.is_active?'#0F6E56':'#888' }}>{s.is_active?'Active':'Paused'}</span>
                      <button style={{ ...btn, fontSize:'12px', padding:'4px 10px' }}>Edit</button>
                    </div>
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==='reviews' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Review request settings</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Automatically ask customers to leave a review after sessions</div>
              {[['After class check-in',true],['After appointment completion',true],['After 10th visit milestone',false]].map(function(r,i){
                return <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:i<2?'0.5px solid rgba(0,0,0,0.06)':'none', fontSize:'13px' }}>
                  <span>{r[0]}</span>
                  <div style={{ width:'34px', height:'19px', borderRadius:'10px', background:r[1]?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0 }}>
                    <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background:'#fff', top:'2px', right:r[1]?'2px':'17px' }}></div>
                  </div>
                </div>
              })}
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1rem' }}>Recent reviews</div>
              <div style={{ textAlign:'center', padding:'1.5rem', color:'#aaa', fontSize:'13px' }}>No reviews yet. Reviews appear here once customers submit them.</div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
