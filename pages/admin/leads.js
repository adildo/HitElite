import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var STAGES = ['new','contacted','demo_booked','converted','lost']
var STAGE_LABELS = { new:'New Lead', contacted:'Contacted', demo_booked:'Demo Booked', converted:'Converted', lost:'Lost' }
var STAGE_COLORS = { new:['#E6F1FB','#185FA5'], contacted:['#FAEEDA','#854F0B'], demo_booked:['#EEEDFE','#534AB7'], converted:['#E1F5EE','#0F6E56'], lost:['#F1EFE8','#5F5E5A'] }

export default function Leads() {
  var [leads, setLeads] = useState([])
  var [loading, setLoading] = useState(true)
  var [viewMode, setViewMode] = useState('kanban')
  var [showNew, setShowNew] = useState(false)
  var [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', source:'', notes:'' })
  var [saving, setSaving] = useState(false)

  useEffect(function() {
    async function load() {
      var result = await supabase.from('leads').select('*').order('created_at', { ascending:false })
      setLeads(result.data || [])
      setLoading(false)
    }
    load()
  }, [])

  function setField(k,v){ setForm(function(p){var n={...p};n[k]=v;return n}) }

  async function saveLead() {
    setSaving(true)
    await supabase.from('leads').insert({ ...form, stage:'new' })
    setSaving(false); setShowNew(false)
    setForm({ first_name:'', last_name:'', email:'', phone:'', source:'', notes:'' })
    var r = await supabase.from('leads').select('*').order('created_at',{ascending:false})
    setLeads(r.data||[])
  }

  async function updateStage(id, stage) {
    await supabase.from('leads').update({ stage }).eq('id', id)
    setLeads(function(prev){return prev.map(function(l){return l.id===id?{...l,stage}:l})})
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  return (
    <AdminLayout active="leads">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Leads</div>
            <div style={{ fontSize:'13px', color:'#888' }}>{leads.length} total leads</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <div style={{ display:'flex', background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'8px', padding:'3px' }}>
              {['kanban','list'].map(function(v){ return <button key={v} onClick={function(){setViewMode(v)}} style={{ ...btn, border:'none', background:viewMode===v?'#f5f5f3':'transparent', fontWeight:viewMode===v?600:400, padding:'5px 12px', fontSize:'12px' }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button> })}
            </div>
            <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ Add lead</button>
          </div>
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Add new lead</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              {[['First name','text','first_name','John'],['Last name','text','last_name','Smith'],['Email','email','email','john@email.com'],['Phone','tel','phone','(555) 000-0000'],['Source','text','source','Instagram, walk-in, referral...']].map(function(f){
                return <div key={f[2]}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>{f[0]}</div><input type={f[1]} style={inp} placeholder={f[4]} value={form[f[2]]} onChange={function(e){setField(f[2],e.target.value)}} /></div>
              })}
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Notes</div><textarea style={{ ...inp, resize:'none', height:'60px' }} value={form.notes} onChange={function(e){setField('notes',e.target.value)}} /></div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveLead} disabled={saving}>{saving?'Saving...':'Save lead'}</button>
            </div>
          </div>
        )}

        {viewMode === 'kanban' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(0,1fr))', gap:'12px', overflowX:'auto' }}>
            {STAGES.map(function(stage) {
              var stageLeads = leads.filter(function(l){return l.stage===stage})
              var colors = STAGE_COLORS[stage]
              return (
                <div key={stage} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden', minWidth:'180px' }}>
                  <div style={{ padding:'10px 12px', borderBottom:'0.5px solid rgba(0,0,0,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:'12px', fontWeight:600, color:'#1a1a1a' }}>{STAGE_LABELS[stage]}</div>
                    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:'20px', height:'20px', borderRadius:'50%', background:colors[0], color:colors[1], fontSize:'11px', fontWeight:700 }}>{stageLeads.length}</span>
                  </div>
                  <div style={{ padding:'8px', minHeight:'200px', display:'flex', flexDirection:'column', gap:'6px' }}>
                    {stageLeads.map(function(lead) {
                      var name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
                      var initials = name.split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                      return (
                        <div key={lead.id} style={{ background:'#f9f9f7', borderRadius:'8px', padding:'10px', fontSize:'13px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'5px' }}>
                            <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:colors[0], color:colors[1], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, flexShrink:0 }}>{initials}</div>
                            <div style={{ fontWeight:600, fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                          </div>
                          {lead.email && <div style={{ fontSize:'11px', color:'#888', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis' }}>{lead.email}</div>}
                          {lead.source && <div style={{ fontSize:'11px', color:'#aaa' }}>via {lead.source}</div>}
                          <select style={{ ...inp, fontSize:'11px', padding:'3px 6px', marginTop:'6px' }} value={lead.stage} onChange={function(e){updateStage(lead.id, e.target.value)}}>
                            {STAGES.map(function(s){return <option key={s} value={s}>{STAGE_LABELS[s]}</option>})}
                          </select>
                        </div>
                      )
                    })}
                    {stageLeads.length === 0 && <div style={{ fontSize:'12px', color:'#ccc', textAlign:'center', padding:'1rem 0' }}>No leads</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {viewMode === 'list' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Name','Email','Phone','Source','Stage','Added',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th>})}
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                {leads.map(function(l,i){
                  var name = [l.first_name, l.last_name].filter(Boolean).join(' ') || '—'
                  var sc = STAGE_COLORS[l.stage]||STAGE_COLORS.new
                  return <tr key={l.id} style={{ borderBottom:i<leads.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <td style={{ padding:'10px 14px', fontWeight:500 }}>{name}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{l.email||'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{l.phone||'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{l.source||'—'}</td>
                    <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{STAGE_LABELS[l.stage]}</span></td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{l.created_at?l.created_at.substring(0,10):'—'}</td>
                    <td style={{ padding:'10px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>View</button></td>
                  </tr>
                })}
                {!loading && leads.length === 0 && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No leads yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
