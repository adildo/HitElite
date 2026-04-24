import { useEffect, useState, useRef } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var STAGES = ['new','contacted','demo_booked','converted','lost']
var STAGE_LABELS = { new:'New Lead', contacted:'Contacted', demo_booked:'Demo Booked', converted:'Converted', lost:'Lost' }
var STAGE_COLORS = { new:['#E6F1FB','#185FA5'], contacted:['#FAEEDA','#854F0B'], demo_booked:['#EEEDFE','#534AB7'], converted:['#E1F5EE','#0F6E56'], lost:['#F1EFE8','#5F5E5A'] }

var QUESTIONNAIRE_FIELDS = [
  { key:'first_name', label:'First name', type:'text', required:true },
  { key:'last_name', label:'Last name', type:'text', required:true },
  { key:'email', label:'Email', type:'email', required:true },
  { key:'phone', label:'Phone', type:'tel', required:false },
  { key:'source', label:'How did you hear about us?', type:'text', required:false },
  { key:'notes', label:'Message / questions', type:'textarea', required:false },
]

export default function Leads() {
  var [leads, setLeads] = useState([])
  var [loading, setLoading] = useState(true)
  var [viewMode, setViewMode] = useState('kanban')
  var [showNew, setShowNew] = useState(false)
  var [showQuestionnaire, setShowQuestionnaire] = useState(false)
  var [showEmbedCode, setShowEmbedCode] = useState(false)
  var [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', source:'', notes:'', stage:'new' })
  var [saving, setSaving] = useState(false)
  var [draggedId, setDraggedId] = useState(null)
  var [dragOverStage, setDragOverStage] = useState(null)
  var [selectedLead, setSelectedLead] = useState(null)
  var [editingLead, setEditingLead] = useState(null)

  useEffect(function() {
    loadLeads()
  }, [])

  async function loadLeads() {
    var result = await supabase.from('leads').select('*').order('created_at', { ascending:false })
    setLeads(result.data || [])
    setLoading(false)
  }

  function setField(k,v){ setForm(function(p){var n={...p};n[k]=v;return n}) }

  async function saveLead() {
    if (!form.first_name && !form.email) return
    setSaving(true)
    if (editingLead) {
      await supabase.from('leads').update({ ...form }).eq('id', editingLead.id)
    } else {
      await supabase.from('leads').insert({ ...form })
    }
    setSaving(false); setShowNew(false); setEditingLead(null)
    setForm({ first_name:'', last_name:'', email:'', phone:'', source:'', notes:'', stage:'new' })
    loadLeads()
  }

  async function updateStage(id, stage) {
    await supabase.from('leads').update({ stage }).eq('id', id)
    setLeads(function(prev){return prev.map(function(l){return l.id===id?{...l,stage}:l})})
  }

  async function deleteLead(id) {
    if (!confirm('Delete this lead?')) return
    await supabase.from('leads').delete().eq('id',id)
    setLeads(function(p){return p.filter(function(l){return l.id!==id})})
    setSelectedLead(null)
  }

  // Drag and drop
  function handleDragStart(leadId) { setDraggedId(leadId) }
  function handleDragOver(e, stage) { e.preventDefault(); setDragOverStage(stage) }
  function handleDrop(e, stage) {
    e.preventDefault()
    if (draggedId) updateStage(draggedId, stage)
    setDraggedId(null); setDragOverStage(null)
  }
  function handleDragEnd() { setDraggedId(null); setDragOverStage(null) }

  function openEdit(lead) {
    setForm({ first_name:lead.first_name||'', last_name:lead.last_name||'', email:lead.email||'', phone:lead.phone||'', source:lead.source||'', notes:lead.notes||'', stage:lead.stage||'new' })
    setEditingLead(lead); setShowNew(true); setSelectedLead(null)
  }

  // Generate embed code for questionnaire
  var embedCode = `<!-- Hit Elite Lead Capture Form -->
<div id="he-lead-form"></div>
<script>
(function() {
  var form = document.getElementById('he-lead-form');
  form.innerHTML = '<form id="helead" style="font-family:sans-serif;max-width:480px;display:grid;gap:12px">' +
    '<input name="first_name" placeholder="First name*" required style="padding:10px;border:1px solid #ddd;border-radius:8px">' +
    '<input name="last_name" placeholder="Last name*" required style="padding:10px;border:1px solid #ddd;border-radius:8px">' +
    '<input name="email" type="email" placeholder="Email*" required style="padding:10px;border:1px solid #ddd;border-radius:8px">' +
    '<input name="phone" placeholder="Phone" style="padding:10px;border:1px solid #ddd;border-radius:8px">' +
    '<input name="source" placeholder="How did you hear about us?" style="padding:10px;border:1px solid #ddd;border-radius:8px">' +
    '<textarea name="notes" placeholder="Message / questions" style="padding:10px;border:1px solid #ddd;border-radius:8px;resize:vertical"></textarea>' +
    '<button type="submit" style="padding:12px;background:#D4A843;color:#0D0D0D;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:15px">Send enquiry</button>' +
    '<div id="he-msg"></div></form>';
  document.getElementById('helead').onsubmit = function(e) {
    e.preventDefault();
    var data = Object.fromEntries(new FormData(e.target));
    fetch('https://YOUR-APP.vercel.app/api/leads/submit', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
      .then(function(){document.getElementById('he-msg').innerText='Thanks! We will be in touch soon.';e.target.reset()})
      .catch(function(){document.getElementById('he-msg').innerText='Error. Please try again.'});
  };
})();
</script>`

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
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <div style={{ display:'flex', background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'8px', padding:'3px' }}>
              {['kanban','list'].map(function(v){ return <button key={v} onClick={function(){setViewMode(v)}} style={{ ...btn, border:'none', background:viewMode===v?'#f5f5f3':'transparent', fontWeight:viewMode===v?600:400, padding:'5px 12px', fontSize:'12px' }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button> })}
            </div>
            <button style={btn} onClick={function(){setShowEmbedCode(function(x){return !x})}}>{'<>'} Embed form</button>
            <button style={btnGold} onClick={function(){setShowNew(function(x){return !x});setEditingLead(null);setForm({ first_name:'', last_name:'', email:'', phone:'', source:'', notes:'', stage:'new' })}}>+ Add lead</button>
          </div>
        </div>

        {/* Embed code panel */}
        {showEmbedCode && (
          <div style={{ background:'#0D0D0D', border:'0.5px solid rgba(212,168,67,0.2)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>Embeddable lead capture form</div>
              <button onClick={function(){setShowEmbedCode(false)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'18px', color:'rgba(255,255,255,0.4)' }}>✕</button>
            </div>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'12px' }}>
              Paste this snippet on any website. Submissions automatically create new leads in this tab. Replace <code style={{ background:'rgba(255,255,255,0.1)', padding:'1px 5px', borderRadius:'3px' }}>YOUR-APP.vercel.app</code> with your actual domain.
            </div>
            <pre style={{ background:'rgba(255,255,255,0.05)', borderRadius:'8px', padding:'14px', fontSize:'11px', color:'rgba(255,255,255,0.7)', overflow:'auto', maxHeight:'300px', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{embedCode}</pre>
            <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
              <button style={btnGold} onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(embedCode)}}>Copy embed code</button>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center' }}>Also create <a href="/api/leads/submit" style={{ color:'#D4A843', marginLeft:'4px' }}>api/leads/submit →</a></div>
            </div>
          </div>
        )}

        {/* Add/Edit lead form */}
        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>{editingLead?'Edit lead':'Add new lead'}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              {[['First name','text','first_name'],['Last name','text','last_name'],['Email','email','email'],['Phone','tel','phone'],['Source','text','source']].map(function(f){
                return <div key={f[2]}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>{f[0]}</div><input type={f[1]} style={inp} value={form[f[2]]} onChange={function(e){setField(f[2],e.target.value)}} /></div>
              })}
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Stage</div>
                <select style={{ ...inp, fontFamily:'inherit' }} value={form.stage} onChange={function(e){setField('stage',e.target.value)}}>
                  {STAGES.map(function(s){return <option key={s} value={s}>{STAGE_LABELS[s]}</option>})}
                </select>
              </div>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Notes</div><textarea style={{ ...inp, resize:'none', height:'60px' }} value={form.notes} onChange={function(e){setField('notes',e.target.value)}} /></div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false);setEditingLead(null)}}>Cancel</button>
              <button style={btnGold} onClick={saveLead} disabled={saving}>{saving?'Saving...':editingLead?'Save changes':'Save lead'}</button>
            </div>
          </div>
        )}

        {/* KANBAN with drag-and-drop */}
        {viewMode === 'kanban' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(0,1fr))', gap:'12px', overflowX:'auto' }}>
            {STAGES.map(function(stage) {
              var stageLeads = leads.filter(function(l){return l.stage===stage})
              var colors = STAGE_COLORS[stage]
              var isOver = dragOverStage===stage
              return (
                <div key={stage}
                  onDragOver={function(e){handleDragOver(e,stage)}}
                  onDrop={function(e){handleDrop(e,stage)}}
                  onDragLeave={function(){setDragOverStage(null)}}
                  style={{ background:isOver?'rgba(212,168,67,0.06)':'#fff', border:'0.5px solid '+(isOver?'#D4A843':'rgba(0,0,0,0.08)'), borderRadius:'12px', overflow:'hidden', minWidth:'180px', transition:'border-color .15s,background .15s' }}>
                  <div style={{ padding:'10px 12px', borderBottom:'0.5px solid rgba(0,0,0,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', background:isOver?'rgba(212,168,67,0.1)':'#f9f9f7' }}>
                    <div style={{ fontSize:'12px', fontWeight:600, color:'#1a1a1a' }}>{STAGE_LABELS[stage]}</div>
                    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:'20px', height:'20px', borderRadius:'50%', background:colors[0], color:colors[1], fontSize:'11px', fontWeight:700 }}>{stageLeads.length}</span>
                  </div>
                  <div style={{ padding:'8px', minHeight:'200px', display:'flex', flexDirection:'column', gap:'6px' }}>
                    {stageLeads.map(function(lead) {
                      var name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
                      var initials = name.split(' ').map(function(n){return n[0]}).join('').substring(0,2).toUpperCase()
                      var isDragging = draggedId===lead.id
                      return (
                        <div key={lead.id}
                          draggable
                          onDragStart={function(){handleDragStart(lead.id)}}
                          onDragEnd={handleDragEnd}
                          onClick={function(){setSelectedLead(lead)}}
                          style={{ background:isDragging?'rgba(212,168,67,0.1)':'#f9f9f7', borderRadius:'8px', padding:'10px', fontSize:'13px', cursor:'grab', opacity:isDragging?0.5:1, border:isDragging?'1px dashed #D4A843':'1px solid transparent', userSelect:'none' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'5px' }}>
                            <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:colors[0], color:colors[1], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, flexShrink:0 }}>{initials}</div>
                            <div style={{ fontWeight:600, fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                          </div>
                          {lead.email && <div style={{ fontSize:'11px', color:'#888', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis' }}>{lead.email}</div>}
                          {lead.source && <div style={{ fontSize:'11px', color:'#aaa' }}>via {lead.source}</div>}
                          {lead.notes && <div style={{ fontSize:'11px', color:'#bbb', marginTop:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.notes}</div>}
                          <div style={{ fontSize:'10px', color:'#ccc', marginTop:'6px' }}>{lead.created_at?lead.created_at.substring(0,10):'—'}</div>
                        </div>
                      )
                    })}
                    {stageLeads.length === 0 && (
                      <div style={{ fontSize:'12px', color:'#ccc', textAlign:'center', padding:'1.5rem 0', border:'1px dashed rgba(0,0,0,0.08)', borderRadius:'8px' }}>
                        {isOver?'Drop here':'No leads'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* LIST VIEW */}
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
                  return <tr key={l.id} style={{ borderBottom:i<leads.length-1?'0.5px solid rgba(0,0,0,0.05)':'none', cursor:'pointer' }} onClick={function(){setSelectedLead(l)}}>
                    <td style={{ padding:'10px 14px', fontWeight:500 }}>{name}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{l.email||'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{l.phone||'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{l.source||'—'}</td>
                    <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{STAGE_LABELS[l.stage]}</span></td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{l.created_at?l.created_at.substring(0,10):'—'}</td>
                    <td style={{ padding:'10px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }} onClick={function(e){e.stopPropagation();openEdit(l)}}>Edit</button></td>
                  </tr>
                })}
                {!loading && leads.length === 0 && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No leads yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* LEAD DETAIL MODAL */}
        {selectedLead && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:'16px', width:'440px', overflow:'hidden' }}>
              <div style={{ padding:'1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:'15px', fontWeight:700 }}>{[selectedLead.first_name,selectedLead.last_name].filter(Boolean).join(' ')||selectedLead.email}</div>
                <button onClick={function(){setSelectedLead(null)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#888' }}>✕</button>
              </div>
              <div style={{ padding:'1.25rem' }}>
                {[['Email',selectedLead.email||'—'],['Phone',selectedLead.phone||'—'],['Source',selectedLead.source||'—'],['Stage',STAGE_LABELS[selectedLead.stage]||selectedLead.stage],['Added',selectedLead.created_at?selectedLead.created_at.substring(0,10):'—']].map(function(row,i){
                  return <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.05)', fontSize:'13px' }}><div style={{ color:'#888', width:'80px', flexShrink:0 }}>{row[0]}</div><div style={{ fontWeight:500 }}>{row[1]}</div></div>
                })}
                {selectedLead.notes&&<div style={{ marginTop:'12px', background:'#f9f9f7', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#666' }}>{selectedLead.notes}</div>}
                <div style={{ display:'flex', gap:'8px', marginTop:'1.25rem' }}>
                  <button style={btnGold} onClick={function(){openEdit(selectedLead)}}>Edit lead</button>
                  <div style={{ flex:1 }}></div>
                  <button style={{ ...btn, color:'#A32D2D' }} onClick={function(){deleteLead(selectedLead.id)}}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
