import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var DOC_TYPES = ['Liability Waiver','Cancellation Policy','General Terms of Service','Photo/Video Release','Health & Medical Disclosure','Custom']

export default function Waivers() {
  var [docs, setDocs] = useState([])
  var [loading, setLoading] = useState(true)
  var [view, setView] = useState('list')
  var [editing, setEditing] = useState(null)
  var [form, setForm] = useState({ title:'', type:'Liability Waiver', content:'', is_active:true })
  var [saving, setSaving] = useState(false)
  var [preview, setPreview] = useState(null)

  useEffect(function(){ loadDocs() }, [])

  async function loadDocs() {
    setLoading(true)
    var r = await supabase.from('terms_documents').select('*').order('created_at',{ascending:false})
    setDocs(r.data||[])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ title:'', type:'Liability Waiver', content:'', is_active:true })
    setView('edit')
  }

  function openEdit(doc) {
    setEditing(doc)
    setForm({ title:doc.title, type:doc.type||'Custom', content:doc.content_html||'', is_active:doc.is_active })
    setView('edit')
  }

  async function saveDoc() {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    var payload = { title:form.title, type:form.type, content_html:form.content, is_active:form.is_active, version:editing?(editing.version||1)+1:1 }
    if (editing) await supabase.from('terms_documents').update(payload).eq('id',editing.id)
    else await supabase.from('terms_documents').insert(payload)
    setSaving(false); setView('list'); loadDocs()
  }

  async function toggleActive(doc) {
    await supabase.from('terms_documents').update({ is_active:!doc.is_active }).eq('id',doc.id)
    setDocs(function(prev){ return prev.map(function(d){ return d.id===doc.id?{...d,is_active:!d.is_active}:d }) })
  }

  async function deleteDoc(id) {
    await supabase.from('terms_documents').delete().eq('id',id)
    setDocs(function(prev){ return prev.filter(function(d){ return d.id!==id }) })
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  if (preview) return (
    <AdminLayout active="settings">
      <div style={{ padding:'1.5rem 2rem', maxWidth:'720px' }}>
        <button onClick={function(){setPreview(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to documents</button>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', paddingBottom:'1rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>
            <div>
              <div style={{ fontSize:'18px', fontWeight:700 }}>{preview.title}</div>
              <div style={{ fontSize:'12px', color:'#888', marginTop:'4px' }}>Version {preview.version||1} · Last updated {preview.updated_at?new Date(preview.updated_at).toLocaleDateString():''}</div>
            </div>
            <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:'6px', fontSize:'11px', background:'#E1F5EE', color:'#0F6E56', fontWeight:600 }}>Customer preview</span>
          </div>
          <div style={{ fontSize:'14px', lineHeight:1.8, color:'#333', whiteSpace:'pre-wrap' }}>{preview.content_html}</div>
          <div style={{ marginTop:'2rem', padding:'1.25rem', background:'#f9f9f7', borderRadius:'10px', border:'0.5px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'12px' }}>Signature area (customer sees this)</div>
            <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
              <input type="text" style={{ ...inp, flex:1 }} placeholder="Type your full name to sign..." disabled />
              <button style={{ ...btnGold, opacity:0.5 }} disabled>I agree & sign</button>
            </div>
            <div style={{ fontSize:'11px', color:'#aaa', marginTop:'6px' }}>Your IP address and timestamp will be recorded with your signature.</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )

  if (view === 'edit') return (
    <AdminLayout active="settings">
      <div style={{ padding:'1.5rem 2rem', maxWidth:'760px' }}>
        <button onClick={function(){setView('list')}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to documents</button>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
          <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'1.25rem' }}>{editing?'Edit document':'Create document'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1rem' }}>
            <div style={{ gridColumn:'span 2' }}>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Document title</div>
              <input type="text" style={inp} value={form.title} onChange={function(e){setForm(function(p){return{...p,title:e.target.value}})}} placeholder="e.g. Liability Waiver 2026" />
            </div>
            <div>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Document type</div>
              <select style={inp} value={form.type} onChange={function(e){setForm(function(p){return{...p,type:e.target.value}})}}>
                {DOC_TYPES.map(function(t){ return <option key={t} value={t}>{t}</option> })}
              </select>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Status</div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div onClick={function(){setForm(function(p){return{...p,is_active:!p.is_active}})}} style={{ width:'38px', height:'21px', borderRadius:'11px', background:form.is_active?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', transition:'background .15s' }}>
                    <div style={{ position:'absolute', width:'17px', height:'17px', borderRadius:'50%', background:'#fff', top:'2px', right:form.is_active?'2px':'19px', transition:'right .15s' }}></div>
                  </div>
                  <span style={{ fontSize:'13px', color:form.is_active?'#0F6E56':'#888' }}>{form.is_active?'Active':'Inactive'}</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginBottom:'1rem' }}>
            <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Document content</div>
            <div style={{ background:'#f9f9f7', borderRadius:'8px', padding:'8px', border:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'6px', display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {[['Bold','**bold**'],['Italic','_italic_'],['Heading','# Heading'],['Bullet','- item'],['Numbered','1. item'],['Line','---']].map(function(t){ return <button key={t[0]} onClick={function(){setForm(function(p){return{...p,content:p.content+'\n'+t[1]}})}} style={{ ...btn, padding:'4px 10px', fontSize:'11px' }}>{t[0]}</button> })}
            </div>
            <textarea style={{ ...inp, resize:'vertical', minHeight:'300px', fontFamily:'monospace', fontSize:'13px', lineHeight:1.6 }} value={form.content} onChange={function(e){setForm(function(p){return{...p,content:e.target.value}})}} placeholder={'Write your document content here...\n\nYou can use:\n# Heading\n**bold text**\n- bullet points\n1. numbered lists\n\nThis is what customers will read before signing.'} />
            <div style={{ fontSize:'12px', color:'#888', marginTop:'4px' }}>{form.content.length} characters</div>
          </div>
          {editing && (
            <div style={{ background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#8B6914', marginBottom:'1rem' }}>
              ℹ️ Saving will create version {(editing.version||1)+1}. Customers who previously signed version {editing.version||1} will be prompted to re-sign on their next booking.
            </div>
          )}
          <div style={{ display:'flex', gap:'8px', justifyContent:'space-between' }}>
            <button style={btn} onClick={function(){setPreview({...editing,...form,content_html:form.content})}}>👁 Preview</button>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setView('list')}}>Cancel</button>
              <button style={btnGold} onClick={saveDoc} disabled={saving}>{saving?'Saving...':'Save document'}</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout active="settings">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Terms & Waivers</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Manage legal documents customers must agree to before booking</div>
          </div>
          <button style={btnGold} onClick={openCreate}>+ Create document</button>
        </div>

        <div style={{ background:'#E6F1FB', border:'0.5px solid #85B7EB', borderRadius:'10px', padding:'12px 16px', marginBottom:'1.25rem', fontSize:'13px', color:'#185FA5', display:'flex', gap:'10px', alignItems:'center' }}>
          <span style={{ fontSize:'18px' }}>ℹ️</span>
          <span>Active documents are automatically shown to customers at booking. All signatures are timestamped and stored permanently per customer profile.</span>
        </div>

        {loading && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading documents...</div>}

        <div style={{ display:'grid', gap:'10px' }}>
          {!loading && docs.length===0 && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'14px' }}>📄</div>
              <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>No documents yet</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Create your liability waiver, cancellation policy, or terms of service.</div>
              <button style={btnGold} onClick={openCreate}>+ Create first document</button>
            </div>
          )}
          {docs.map(function(doc) {
            return (
              <div key={doc.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ fontSize:'24px' }}>📄</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                    <div style={{ fontSize:'15px', fontWeight:600 }}>{doc.title}</div>
                    <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:'6px', fontSize:'11px', background:doc.is_active?'#E1F5EE':'#F1EFE8', color:doc.is_active?'#0F6E56':'#888', fontWeight:500 }}>{doc.is_active?'Active':'Inactive'}</span>
                    <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:'6px', fontSize:'11px', background:'#F5E6C0', color:'#8B6914', fontWeight:500 }}>v{doc.version||1}</span>
                  </div>
                  <div style={{ fontSize:'12px', color:'#888', display:'flex', gap:'14px', flexWrap:'wrap' }}>
                    <span>{doc.type||'Document'}</span>
                    <span>Created {doc.created_at?new Date(doc.created_at).toLocaleDateString():''}</span>
                    {doc.content_html && <span>{doc.content_html.length} chars</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                  <button style={{ ...btn, fontSize:'12px', padding:'5px 10px' }} onClick={function(){setPreview(doc)}}>Preview</button>
                  <button style={{ ...btn, fontSize:'12px', padding:'5px 10px' }} onClick={function(){openEdit(doc)}}>Edit</button>
                  <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:doc.is_active?'#BA7517':'#0F6E56' }} onClick={function(){toggleActive(doc)}}>{doc.is_active?'Deactivate':'Activate'}</button>
                  <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:'#A32D2D' }} onClick={function(){deleteDoc(doc.id)}}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
