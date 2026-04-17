import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var COLORS = [
  { bg:'#D4A843', text:'#fff' }, { bg:'#185FA5', text:'#fff' },
  { bg:'#534AB7', text:'#fff' }, { bg:'#D85A30', text:'#fff' },
  { bg:'#D4537E', text:'#fff' }, { bg:'#1D9E75', text:'#fff' },
  { bg:'#A32D2D', text:'#fff' }, { bg:'#444441', text:'#fff' },
  { bg:'#E1F5EE', text:'#0F6E56' }, { bg:'#E6F1FB', text:'#185FA5' },
  { bg:'#EEEDFE', text:'#534AB7' }, { bg:'#FAEEDA', text:'#854F0B' },
]
var FILTERS = ['all','customers','classes','appointments','memberships','products','coaches']

export default function Tags() {
  var [tags, setTags] = useState([])
  var [filter, setFilter] = useState('all')
  var [search, setSearch] = useState('')
  var [view, setView] = useState('list')
  var [editId, setEditId] = useState(null)
  var [name, setName] = useState('')
  var [appliesTo, setAppliesTo] = useState(['customers'])
  var [isBadge, setIsBadge] = useState(false)
  var [badgeLabel, setBadgeLabel] = useState('')
  var [color, setColor] = useState(COLORS[0])
  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)

  useEffect(function(){ loadTags() }, [])

  async function loadTags() {
    setLoading(true)
    var result = await supabase.from('tags').select('*').order('name')
    setTags(result.data || [])
    setLoading(false)
  }

  function openCreate(tag) {
    if (tag) {
      setEditId(tag.id); setName(tag.name)
      setAppliesTo(tag.type ? [tag.type] : ['customers'])
      setIsBadge(tag.is_badge||false); setBadgeLabel(tag.badge_label||'')
      setColor(COLORS.find(function(c){return c.bg===tag.badge_color})||COLORS[0])
    } else {
      setEditId(null); setName(''); setAppliesTo(['customers']); setIsBadge(false); setBadgeLabel(''); setColor(COLORS[0])
    }
    setView('create')
  }

  async function saveTag() {
    if (!name.trim()) return
    setSaving(true)
    var payload = { name:name.trim(), type:appliesTo[0]||'customer', is_badge:isBadge, badge_label:isBadge?(badgeLabel||name):null, badge_color:isBadge?color.bg:null, badge_text_color:isBadge?color.text:null }
    if (editId) await supabase.from('tags').update(payload).eq('id', editId)
    else await supabase.from('tags').insert(payload)
    setSaving(false); setView('list'); loadTags()
  }

  async function deleteTag(id) {
    await supabase.from('tags').delete().eq('id', id)
    setTags(function(prev){return prev.filter(function(t){return t.id!==id})})
  }

  var filtered = tags.filter(function(t){
    var mf = filter==='all' || t.type===filter
    var mq = !search || t.name.toLowerCase().includes(search.toLowerCase())
    return mf && mq
  })

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var APPLY_OPTIONS = [['customers','👥 Customers'],['appointments','📅 Appointments'],['memberships','🎟 Memberships'],['products','📦 Products'],['classes','🎾 Classes'],['coaches','👤 Coaches']]

  if (view === 'create') return (
    <AdminLayout active="tags">
      <div style={{ padding:'1.5rem 2rem' }}>
        <button onClick={function(){setView('list')}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to tags</button>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', maxWidth:'560px' }}>
          <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'1.25rem' }}>{editId?'Edit tag':'Create new tag'}</div>
          <div style={{ marginBottom:'1rem' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Tag name</div><input type="text" style={inp} value={name} onChange={function(e){setName(e.target.value)}} placeholder="e.g. VIP, Tennis, Trial..." /></div>
          <div style={{ marginBottom:'1rem' }}>
            <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px' }}>Applies to</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
              {APPLY_OPTIONS.map(function(opt){ var sel=appliesTo.includes(opt[0]); return <div key={opt[0]} onClick={function(){setAppliesTo(function(prev){return prev.includes(opt[0])?prev.filter(function(v){return v!==opt[0]}):[...prev,opt[0]]})}} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 10px', borderRadius:'8px', border:'0.5px solid '+(sel?'#D4A843':'rgba(0,0,0,0.15)'), background:sel?'#FFFBF0':'transparent', color:sel?'#8B6914':'#666', cursor:'pointer', fontSize:'13px', fontWeight:sel?600:400 }}>{opt[1]}</div> })}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderTop:'0.5px solid rgba(0,0,0,0.08)', marginBottom:isBadge?'0':'1rem' }}>
            <div><div style={{ fontSize:'13px', fontWeight:500 }}>Turn into customer badge</div><div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>Shows on customer profiles as a coloured pill</div></div>
            <div onClick={function(){setIsBadge(function(v){return !v})}} style={{ width:'38px', height:'21px', borderRadius:'11px', background:isBadge?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
              <div style={{ position:'absolute', width:'17px', height:'17px', borderRadius:'50%', background:'#fff', top:'2px', right:isBadge?'2px':'19px', transition:'right .15s' }}></div>
            </div>
          </div>
          {isBadge && (
            <div style={{ background:'#f9f9f7', borderRadius:'8px', padding:'1rem', marginBottom:'1rem' }}>
              <div style={{ marginBottom:'1rem' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Badge label</div><input type="text" style={inp} value={badgeLabel} onChange={function(e){setBadgeLabel(e.target.value)}} placeholder={name||'Badge label...'} /></div>
              <div style={{ marginBottom:'1rem' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'8px' }}>Badge color</div>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {COLORS.map(function(c,i){ return <div key={i} onClick={function(){setColor(c)}} style={{ width:'30px', height:'30px', borderRadius:'50%', background:c.bg, cursor:'pointer', border:color.bg===c.bg?'3px solid #1a1a1a':'2px solid transparent', flexShrink:0, transform:color.bg===c.bg?'scale(1.15)':'scale(1)', transition:'transform .1s' }}></div> })}
                </div>
              </div>
              <div style={{ background:'#fff', borderRadius:'8px', padding:'12px', textAlign:'center' }}>
                <div style={{ fontSize:'11px', color:'#888', marginBottom:'6px' }}>Preview</div>
                <span style={{ display:'inline-flex', alignItems:'center', padding:'4px 14px', borderRadius:'20px', fontSize:'13px', fontWeight:600, background:color.bg, color:color.text }}>{badgeLabel||name||'Badge'}</span>
              </div>
            </div>
          )}
          <div style={{ display:'flex', gap:'8px' }}>
            <button style={btn} onClick={function(){setView('list')}}>Cancel</button>
            <button style={btnGold} onClick={saveTag} disabled={saving}>{saving?'Saving...':'Save tag'}</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout active="tags">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Tags</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Organise customers, classes, and more</div>
          </div>
          <button style={btnGold} onClick={function(){openCreate(null)}}>+ New tag</button>
        </div>
        <input type="text" style={{ ...inp, marginBottom:'1rem' }} placeholder="Search tags..." value={search} onChange={function(e){setSearch(e.target.value)}} />
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'1.25rem' }}>
          {FILTERS.map(function(f){ return <button key={f} onClick={function(){setFilter(f)}} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', cursor:'pointer', border:'0.5px solid '+(filter===f?'#D4A843':'rgba(0,0,0,0.15)'), background:filter===f?'#D4A843':'transparent', color:filter===f?'#0D0D0D':'#666', fontFamily:'inherit', fontWeight:filter===f?600:400 }}>{f.charAt(0).toUpperCase()+f.slice(1)}</button> })}
        </div>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'0 1.25rem' }}>
          {loading && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading tags...</div>}
          {!loading && filtered.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No tags found. <button style={{ ...btn, border:'none', color:'#D4A843', padding:'0' }} onClick={function(){openCreate(null)}}>Create your first tag →</button></div>}
          {filtered.map(function(t, i) {
            var preview = t.is_badge
              ? <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:600, background:t.badge_color||'#D4A843', color:t.badge_text_color||'#fff' }}>{t.badge_label||t.name}</span>
              : <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:'6px', fontSize:'12px', background:'#f1efe8', color:'#666' }}>{t.name}</span>
            return (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 0', borderBottom:i<filtered.length-1?'0.5px solid rgba(0,0,0,0.06)':'none' }}>
                <div style={{ flex:1 }}><div style={{ fontSize:'14px', fontWeight:500, marginBottom:'3px' }}>{t.name}</div><span style={{ display:'inline-block', padding:'1px 7px', borderRadius:'5px', fontSize:'11px', background:'#f1f1f1', color:'#666' }}>{t.type}</span></div>
                <div style={{ width:'160px', flexShrink:0 }}>{preview}</div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button style={{ ...btn, fontSize:'12px', padding:'4px 10px' }} onClick={function(){openCreate(t)}}>Edit</button>
                  <button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#A32D2D' }} onClick={function(){deleteTag(t.id)}}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
