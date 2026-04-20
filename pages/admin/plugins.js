import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var PLUGIN_TYPES = [
  { key:'schedule', label:'Class Schedule Widget', icon:'📅', desc:'Live class schedule on your website. Customers can click to book directly.' },
  { key:'booking', label:'Appointment Booking Widget', icon:'🎾', desc:'Let customers browse services and book appointments from your website.' },
  { key:'coaches', label:'Coach Profile Cards', icon:'👤', desc:'Display coach bios, specialties, and booking links.' },
  { key:'reviews', label:'Reviews Feed', icon:'⭐', desc:'Show customer reviews and ratings on your website.' },
  { key:'lead_form', label:'Lead Capture Form', icon:'📋', desc:'Embed a lead form that feeds directly into your Leads module.' },
  { key:'availability_badge', label:'Class Availability Badge', icon:'🔢', desc:'Show a single class with spots remaining — great for promotions.' },
]

function ColorPicker({ label, value, onChange }) {
  var presets = ['#D4A843','#0D0D0D','#1D9E75','#185FA5','#534AB7','#D85A30','#fff','#f5f5f3']
  return (
    <div>
      <div style={{ fontSize:'12px', color:'#666', marginBottom:'6px' }}>{label}</div>
      <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
        {presets.map(function(c){
          return <div key={c} onClick={function(){onChange(c)}} style={{ width:'22px', height:'22px', borderRadius:'50%', background:c, border:value===c?'3px solid #1a1a1a':'1.5px solid rgba(0,0,0,0.15)', cursor:'pointer', transform:value===c?'scale(1.2)':'scale(1)', transition:'transform .1s', flexShrink:0 }}></div>
        })}
        <input type="color" value={value} onChange={function(e){onChange(e.target.value)}} style={{ width:'26px', height:'26px', border:'none', background:'none', cursor:'pointer', padding:0 }} />
      </div>
    </div>
  )
}

export default function Plugins() {
  var [plugins, setPlugins] = useState([])
  var [loading, setLoading] = useState(true)
  var [creating, setCreating] = useState(null) // selected plugin type
  var [editingPlugin, setEditingPlugin] = useState(null)
  var [form, setForm] = useState({ name:'', primary_color:'#D4A843', bg_color:'#ffffff', text_color:'#1a1a1a', font:'system', filter_tag:'', custom_css:'' })
  var [saving, setSaving] = useState(false)
  var [copiedId, setCopiedId] = useState(null)

  useEffect(function(){ loadPlugins() }, [])

  async function loadPlugins() {
    setLoading(true)
    var r = await supabase.from('plugins').select('*').order('created_at',{ascending:false})
    setPlugins(r.data||[])
    setLoading(false)
  }

  function setField(k,v){ setForm(function(p){return{...p,[k]:v}}) }

  async function savePlugin() {
    if (!form.name || !creating) return
    setSaving(true)
    var token = Math.random().toString(36).substring(2,12)
    var payload = { name:form.name, type:creating.key, config_json:{ primary_color:form.primary_color, bg_color:form.bg_color, text_color:form.text_color, font:form.font, filter_tag:form.filter_tag, custom_css:form.custom_css }, embed_token:token }
    if (editingPlugin) {
      await supabase.from('plugins').update(payload).eq('id', editingPlugin.id)
    } else {
      await supabase.from('plugins').insert(payload)
    }
    setSaving(false); setCreating(null); setEditingPlugin(null)
    setForm({ name:'', primary_color:'#D4A843', bg_color:'#ffffff', text_color:'#1a1a1a', font:'system', filter_tag:'', custom_css:'' })
    loadPlugins()
  }

  function getEmbedCode(plugin) {
    var baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.vercel.app'
    return `<!-- Hit Elite ${plugin.name} Widget -->\n<iframe\n  src="${baseUrl}/widget/${plugin.type}?token=${plugin.embed_token}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border:none;border-radius:12px;"\n  loading="lazy"\n></iframe>`
  }

  function copyEmbed(plugin) {
    navigator.clipboard && navigator.clipboard.writeText(getEmbedCode(plugin))
    setCopiedId(plugin.id)
    setTimeout(function(){setCopiedId(null)}, 2000)
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { ...inp, fontFamily:'inherit' }

  // Creation / edit form
  if (creating) {
    var previewBg = form.bg_color
    var previewPrimary = form.primary_color
    return (
      <AdminLayout active="settings">
        <div style={{ padding:'1.5rem 2rem' }}>
          <button onClick={function(){setCreating(null);setEditingPlugin(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to plugins</button>
          <div style={{ fontSize:'20px', fontWeight:700, marginBottom:'4px' }}>{editingPlugin?'Edit':'Configure'}: {creating.icon} {creating.label}</div>
          <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>{creating.desc}</div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
            {/* Config panel */}
            <div>
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1.25rem' }}>Widget settings</div>
                <div style={{ display:'grid', gap:'14px' }}>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Widget name (internal)</div><input type="text" style={inp} value={form.name} onChange={function(e){setField('name',e.target.value)}} placeholder="e.g. Homepage Schedule Widget" /></div>
                  {creating.key === 'availability_badge' || creating.key === 'schedule' ? (
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Filter by tag (optional)</div><input type="text" style={inp} value={form.filter_tag} onChange={function(e){setField('filter_tag',e.target.value)}} placeholder="e.g. Beginner" /></div>
                  ) : null}
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Font</div>
                    <select style={sel} value={form.font} onChange={function(e){setField('font',e.target.value)}}>
                      <option value="system">System default</option>
                      <option value="Inter">Inter</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Poppins">Poppins</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1.25rem' }}>Colors</div>
                <div style={{ display:'grid', gap:'14px' }}>
                  <ColorPicker label="Primary / accent color" value={form.primary_color} onChange={function(v){setField('primary_color',v)}} />
                  <ColorPicker label="Background color" value={form.bg_color} onChange={function(v){setField('bg_color',v)}} />
                  <ColorPicker label="Text color" value={form.text_color} onChange={function(v){setField('text_color',v)}} />
                </div>
              </div>

              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>Custom CSS</div>
                <div style={{ fontSize:'12px', color:'#888', marginBottom:'8px' }}>Advanced: override any widget styles</div>
                <textarea style={{ ...inp, resize:'vertical', minHeight:'80px', fontFamily:'monospace', fontSize:'12px' }} value={form.custom_css} onChange={function(e){setField('custom_css',e.target.value)}} placeholder=".he-widget { border-radius: 16px; }" />
              </div>

              <div style={{ display:'flex', gap:'8px' }}>
                <button style={btn} onClick={function(){setCreating(null)}}>Cancel</button>
                <button style={btnGold} onClick={savePlugin} disabled={saving||!form.name}>{saving?'Saving...':'Save & generate embed code'}</button>
              </div>
            </div>

            {/* Preview panel */}
            <div>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#666', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Live preview</div>
              <div style={{ borderRadius:'12px', overflow:'hidden', border:'0.5px solid rgba(0,0,0,0.1)', background:previewBg, padding:'1.25rem', minHeight:'300px' }}>
                {creating.key === 'schedule' && (
                  <div>
                    <div style={{ fontSize:'16px', fontWeight:700, color:form.text_color, marginBottom:'12px', fontFamily:form.font==='system'?'inherit':form.font }}>Class Schedule</div>
                    {['Beginner Tennis — 9:00 AM','Pickleball Intro — 11:00 AM','Advanced Clinic — 2:00 PM'].map(function(cls,i){
                      return <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:'8px', marginBottom:'6px', background:previewPrimary+'15', border:'1px solid '+previewPrimary+'30' }}>
                        <div><div style={{ fontSize:'13px', fontWeight:600, color:form.text_color }}>{cls}</div><div style={{ fontSize:'11px', color:form.text_color+'99' }}>Mon · {5-i} spots left</div></div>
                        <div style={{ padding:'5px 14px', borderRadius:'6px', background:previewPrimary, color:previewBg==='#ffffff'?'#0D0D0D':'#fff', fontSize:'12px', fontWeight:700, cursor:'pointer' }}>Book</div>
                      </div>
                    })}
                  </div>
                )}
                {creating.key === 'coaches' && (
                  <div>
                    <div style={{ fontSize:'16px', fontWeight:700, color:form.text_color, marginBottom:'12px' }}>Our Coaches</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                      {['Coach Maria','Coach Alex'].map(function(name,i){
                        return <div key={i} style={{ background:previewPrimary+'15', borderRadius:'10px', padding:'14px', textAlign:'center' }}>
                          <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:previewPrimary, margin:'0 auto 8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, color:'#fff' }}>{name.split(' ')[1][0]}</div>
                          <div style={{ fontSize:'13px', fontWeight:600, color:form.text_color }}>{name}</div>
                          <div style={{ padding:'5px 12px', borderRadius:'6px', background:previewPrimary, color:'#fff', fontSize:'11px', marginTop:'8px', cursor:'pointer' }}>Book a lesson</div>
                        </div>
                      })}
                    </div>
                  </div>
                )}
                {creating.key === 'lead_form' && (
                  <div>
                    <div style={{ fontSize:'16px', fontWeight:700, color:form.text_color, marginBottom:'4px' }}>Get started today</div>
                    <div style={{ fontSize:'12px', color:form.text_color+'88', marginBottom:'14px' }}>Drop us your info and we'll be in touch</div>
                    {['Full name','Email address','Phone number'].map(function(f,i){
                      return <input key={i} type="text" placeholder={f} disabled style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid '+previewPrimary+'44', background:'#fff', marginBottom:'8px', fontSize:'13px', color:'#888', display:'block' }} />
                    })}
                    <div style={{ padding:'10px', borderRadius:'8px', background:previewPrimary, color:'#fff', fontSize:'13px', fontWeight:700, textAlign:'center', cursor:'pointer', marginTop:'4px' }}>Send enquiry</div>
                  </div>
                )}
                {(creating.key === 'booking' || creating.key === 'reviews' || creating.key === 'availability_badge') && (
                  <div style={{ textAlign:'center', padding:'2rem', color:form.text_color+'66', fontSize:'13px' }}>
                    <div style={{ fontSize:'28px', marginBottom:'10px' }}>{creating.icon}</div>
                    <div style={{ fontWeight:600, color:form.text_color, marginBottom:'4px' }}>{creating.label}</div>
                    <div>Preview available after saving. This widget pulls live data from your platform.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout active="settings">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'4px' }}>Website plugins</div>
        <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>Embed live widgets on your website — schedule, booking, coach profiles, reviews, and more</div>

        {/* Plugin type picker */}
        <div style={{ marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'12px', fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Create a new plugin</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'12px' }}>
            {PLUGIN_TYPES.map(function(type){
              return (
                <div key={type.key} onClick={function(){setCreating(type);setForm({ name:'', primary_color:'#D4A843', bg_color:'#ffffff', text_color:'#1a1a1a', font:'system', filter_tag:'', custom_css:'' })}}
                  style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', cursor:'pointer', transition:'border-color 0.1s' }}>
                  <div style={{ fontSize:'24px', marginBottom:'8px' }}>{type.icon}</div>
                  <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'4px' }}>{type.label}</div>
                  <div style={{ fontSize:'12px', color:'#888', lineHeight:1.5 }}>{type.desc}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Existing plugins */}
        {plugins.length > 0 && (
          <div>
            <div style={{ fontSize:'12px', fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Your plugins ({plugins.length})</div>
            <div style={{ display:'grid', gap:'10px' }}>
              {plugins.map(function(plugin){
                var type = PLUGIN_TYPES.find(function(t){return t.key===plugin.type})||{icon:'🔌',label:'Plugin'}
                return (
                  <div key={plugin.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
                    <div style={{ fontSize:'22px' }}>{type.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'3px' }}>{plugin.name}</div>
                      <div style={{ fontSize:'12px', color:'#888' }}>{type.label} · Token: <code style={{ background:'#f5f5f3', padding:'1px 6px', borderRadius:'4px', fontSize:'11px' }}>{plugin.embed_token}</code></div>
                    </div>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button style={{ ...btnGold, fontSize:'12px', padding:'5px 12px' }} onClick={function(){copyEmbed(plugin)}}>
                        {copiedId===plugin.id?'✓ Copied!':'📋 Copy embed code'}
                      </button>
                      <button style={{ ...btn, fontSize:'12px', padding:'5px 10px' }} onClick={function(){
                        var t = PLUGIN_TYPES.find(function(t){return t.key===plugin.type})
                        var cfg = plugin.config_json||{}
                        setCreating(t)
                        setEditingPlugin(plugin)
                        setForm({ name:plugin.name, primary_color:cfg.primary_color||'#D4A843', bg_color:cfg.bg_color||'#ffffff', text_color:cfg.text_color||'#1a1a1a', font:cfg.font||'system', filter_tag:cfg.filter_tag||'', custom_css:cfg.custom_css||'' })
                      }}>Edit</button>
                      <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:'#A32D2D' }} onClick={async function(){
                        await supabase.from('plugins').delete().eq('id',plugin.id)
                        setPlugins(function(p){return p.filter(function(x){return x.id!==plugin.id})})
                      }}>Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && plugins.length === 0 && (
          <div style={{ background:'#f9f9f7', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px' }}>
            No plugins yet. Create your first one above and paste the embed code on your website.
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
