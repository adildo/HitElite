import { useEffect, useState, useRef } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var SEQUENCE_TEMPLATES = [
  { trigger:'new_customer', name:'Welcome series', desc:'3-email onboarding for new sign-ups', steps:3 },
  { trigger:'no_booking_7d', name:'Re-engagement', desc:'Nudge customers who haven\'t booked in 7 days', steps:2 },
  { trigger:'session_complete', name:'Post-session follow-up', desc:'Ask for review + suggest next booking', steps:2 },
  { trigger:'birthday', name:'Birthday offer', desc:'Send a special discount on their birthday', steps:1 },
]

// Drag-and-drop email builder blocks
var BLOCK_TYPES = [
  { type:'heading', icon:'H', label:'Heading', defaultContent:'Your email heading here' },
  { type:'text', icon:'¶', label:'Text', defaultContent:'Write your paragraph here. You can add as many paragraphs as you need.' },
  { type:'image', icon:'🖼', label:'Image', defaultContent:'https://via.placeholder.com/600x300' },
  { type:'button', icon:'⬡', label:'Button', defaultContent:'Book now', url:'https://yoursite.com/book' },
  { type:'divider', icon:'—', label:'Divider', defaultContent:'' },
  { type:'spacer', icon:'↕', label:'Spacer', defaultContent:'24' },
]

function generateId() { return Math.random().toString(36).substring(2,10) }

export default function Marketing() {
  var [tab, setTab] = useState('campaigns')
  var [campaigns, setCampaigns] = useState([])
  var [sequences, setSequences] = useState([])
  var [customers, setCustomers] = useState([])
  var [segments, setSegments] = useState([])
  var [loading, setLoading] = useState(true)
  var [showBuilder, setShowBuilder] = useState(false)
  var [editingCampaign, setEditingCampaign] = useState(null)

  // Campaign form
  var [campName, setCampName] = useState('')
  var [campType, setCampType] = useState('email')
  var [campSubject, setCampSubject] = useState('')
  var [campAudience, setCampAudience] = useState('all')
  var [campStatus, setCampStatus] = useState('draft')
  var [campBody, setCampBody] = useState('')

  // Email builder blocks
  var [blocks, setBlocks] = useState([
    { id:generateId(), type:'heading', content:'Welcome to our newsletter!' },
    { id:generateId(), type:'text', content:'Hello {first_name}, thanks for being part of our community.' },
    { id:generateId(), type:'button', content:'Book a session', url:'https://yoursite.com/book' },
  ])
  var [dragBlock, setDragBlock] = useState(null)
  var [dragOverIdx, setDragOverIdx] = useState(null)
  var [editingBlock, setEditingBlock] = useState(null)
  var [previewMode, setPreviewMode] = useState(false)
  var [sending, setSending] = useState(false)
  var [sentMsg, setSentMsg] = useState(null)

  useEffect(function(){ loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var [campR, seqR, custR, segR] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at',{ascending:false}),
      supabase.from('sequences').select('*').order('created_at',{ascending:false}),
      supabase.from('profiles').select('id,full_name,email').eq('role','customer').eq('is_active',true),
      supabase.from('saved_segments').select('id,name,filters_json,customer_count').order('name'),
    ])
    setCampaigns(campR.data||[])
    setSequences(seqR.data||[])
    setCustomers(custR.data||[])
    setSegments(segR.data||[])
    setLoading(false)
  }

  // ── BLOCK DRAG & DROP ──
  function handleBlockDragStart(e, idx) {
    setDragBlock(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleBlockDragOver(e, idx) {
    e.preventDefault()
    setDragOverIdx(idx)
  }
  function handleBlockDrop(e, idx) {
    e.preventDefault()
    if (dragBlock === null || dragBlock === idx) { setDragBlock(null); setDragOverIdx(null); return }
    var newBlocks = [...blocks]
    var [removed] = newBlocks.splice(dragBlock, 1)
    newBlocks.splice(idx, 0, removed)
    setBlocks(newBlocks)
    setDragBlock(null); setDragOverIdx(null)
  }
  function addBlock(type) {
    var def = BLOCK_TYPES.find(function(b){return b.type===type})
    setBlocks(function(p){ return [...p, { id:generateId(), type:type, content:def.defaultContent, url:def.url||'' }] })
  }
  function removeBlock(id) { setBlocks(function(p){ return p.filter(function(b){return b.id!==id}) }) }
  function updateBlock(id, key, val) { setBlocks(function(p){ return p.map(function(b){ return b.id===id?{...b,[key]:val}:b }) }) }
  function duplicateBlock(idx) {
    var newBlock = { ...blocks[idx], id:generateId() }
    var newBlocks = [...blocks]
    newBlocks.splice(idx+1, 0, newBlock)
    setBlocks(newBlocks)
  }

  function blocksToHtml() {
    return blocks.map(function(b){
      if (b.type==='heading') return '<h2 style="font-family:sans-serif;font-size:24px;font-weight:700;color:#1a1a1a;margin:0 0 16px">'+b.content+'</h2>'
      if (b.type==='text') return '<p style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#444;margin:0 0 14px">'+b.content+'</p>'
      if (b.type==='image') return '<img src="'+b.content+'" style="width:100%;border-radius:8px;margin:0 0 16px" alt="" />'
      if (b.type==='button') return '<div style="text-align:center;margin:16px 0"><a href="'+(b.url||'#')+'" style="display:inline-block;padding:12px 28px;background:#D4A843;color:#0D0D0D;font-family:sans-serif;font-size:15px;font-weight:700;border-radius:8px;text-decoration:none">'+b.content+'</a></div>'
      if (b.type==='divider') return '<hr style="border:none;border-top:1px solid #eee;margin:16px 0" />'
      if (b.type==='spacer') return '<div style="height:'+(b.content||24)+'px"></div>'
      return ''
    }).join('\n')
  }

  async function saveCampaign() {
    if (!campName.trim()) return
    setSending(true)
    var payload = { name:campName, type:campType, subject:campSubject, body:campType==='email'?blocksToHtml():campBody, audience_type:campAudience, status:campStatus, blocks_json:campType==='email'?blocks:null }
    if (editingCampaign) {
      await supabase.from('campaigns').update(payload).eq('id',editingCampaign.id)
    } else {
      await supabase.from('campaigns').insert(payload)
    }
    setSending(false); setShowBuilder(false); setEditingCampaign(null)
    resetCampaignForm(); loadAll()
    setSentMsg('Campaign saved!')
    setTimeout(function(){setSentMsg(null)},3000)
  }

  function resetCampaignForm() {
    setCampName(''); setCampType('email'); setCampSubject(''); setCampBody(''); setCampAudience('all'); setCampStatus('draft')
    setBlocks([
      { id:generateId(), type:'heading', content:'Your email heading' },
      { id:generateId(), type:'text', content:'Write your message here.' },
      { id:generateId(), type:'button', content:'Book now', url:'' },
    ])
  }

  function openEditCampaign(c) {
    setCampName(c.name||''); setCampType(c.type||'email'); setCampSubject(c.subject||''); setCampBody(c.body||''); setCampAudience(c.audience_type||'all'); setCampStatus(c.status||'draft')
    if (c.blocks_json && c.blocks_json.length) setBlocks(c.blocks_json)
    setEditingCampaign(c); setShowBuilder(true)
  }

  async function createSequence(t) {
    await supabase.from('sequences').insert({ name:t.name, trigger_type:t.trigger, description:t.desc, steps_json:[], is_active:false })
    loadAll()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var tabStyle = function(t){ return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' } }

  function BlockEditor({ block, idx }) {
    var isOver = dragOverIdx === idx
    var def = BLOCK_TYPES.find(function(b){return b.type===block.type})||{}
    return (
      <div
        draggable onDragStart={function(e){handleBlockDragStart(e,idx)}} onDragOver={function(e){handleBlockDragOver(e,idx)}} onDrop={function(e){handleBlockDrop(e,idx)}} onDragLeave={function(){setDragOverIdx(null)}}
        style={{ border:isOver?'2px dashed #D4A843':editingBlock===block.id?'2px solid #D4A843':'2px solid transparent', borderRadius:'8px', marginBottom:'4px', position:'relative', background:isOver?'rgba(212,168,67,0.04)':'transparent', transition:'border-color .1s' }}
      >
        <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'8px' }}>
          {/* Drag handle */}
          <div style={{ cursor:'grab', color:'#ccc', fontSize:'16px', userSelect:'none', paddingTop:'3px', flexShrink:0 }}>⋮⋮</div>
          {/* Block content */}
          <div style={{ flex:1 }} onClick={function(){setEditingBlock(editingBlock===block.id?null:block.id)}}>
            {block.type==='heading' && <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a', padding:'4px 0' }}>{block.content}</div>}
            {block.type==='text' && <div style={{ fontSize:'14px', color:'#555', lineHeight:1.6, padding:'4px 0' }}>{block.content}</div>}
            {block.type==='image' && <img src={block.content} alt="" style={{ width:'100%', maxHeight:'200px', objectFit:'cover', borderRadius:'6px' }} onError={function(e){e.target.style.display='none'}} />}
            {block.type==='button' && <div style={{ textAlign:'center', padding:'8px 0' }}><span style={{ display:'inline-block', padding:'10px 24px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'14px', fontWeight:700 }}>{block.content}</span></div>}
            {block.type==='divider' && <hr style={{ border:'none', borderTop:'1px solid #eee', margin:'8px 0' }} />}
            {block.type==='spacer' && <div style={{ height:'20px', background:'rgba(0,0,0,0.03)', borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#ccc' }}>Spacer ({block.content}px)</div>}
          </div>
          {/* Actions */}
          <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
            <button style={{ ...btn, fontSize:'11px', padding:'3px 6px', color:'#888' }} onClick={function(){duplicateBlock(idx)}}>⧉</button>
            <button style={{ ...btn, fontSize:'11px', padding:'3px 6px', color:'#A32D2D' }} onClick={function(){removeBlock(block.id)}}>✕</button>
          </div>
        </div>
        {/* Inline editor */}
        {editingBlock === block.id && (
          <div style={{ padding:'8px 16px 14px', borderTop:'1px solid rgba(0,0,0,0.06)', background:'#f9f9f7', borderBottomLeftRadius:'6px', borderBottomRightRadius:'6px' }}>
            {(block.type==='heading'||block.type==='text') && (
              <textarea style={{ ...inp, resize:'none', minHeight:block.type==='heading'?'48px':'80px' }} value={block.content} onChange={function(e){updateBlock(block.id,'content',e.target.value)}} />
            )}
            {block.type==='image' && (
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Image URL</div>
                <input style={inp} value={block.content} onChange={function(e){updateBlock(block.id,'content',e.target.value)}} placeholder="https://..." />
              </div>
            )}
            {block.type==='button' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Button text</div><input style={inp} value={block.content} onChange={function(e){updateBlock(block.id,'content',e.target.value)}} /></div>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Link URL</div><input style={inp} value={block.url||''} onChange={function(e){updateBlock(block.id,'url',e.target.value)}} placeholder="https://..." /></div>
              </div>
            )}
            {block.type==='spacer' && (
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Height (px)</div>
                <input type="number" style={{ ...inp, width:'100px' }} value={block.content} onChange={function(e){updateBlock(block.id,'content',e.target.value)}} />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <AdminLayout active="marketing">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div><div style={{ fontSize:'22px', fontWeight:700 }}>Marketing</div><div style={{ fontSize:'13px', color:'#888' }}>Campaigns, automation sequences, and lead nurturing</div></div>
          {tab==='campaigns' && <button style={btnGold} onClick={function(){setShowBuilder(function(x){return !x});setEditingCampaign(null);resetCampaignForm()}}>+ New campaign</button>}
        </div>

        {sentMsg && <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'10px 16px', fontSize:'13px', color:'#0F6E56', marginBottom:'1rem' }}>✓ {sentMsg}</div>}

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          <button style={tabStyle('campaigns')} onClick={function(){setTab('campaigns')}}>Campaigns</button>
          <button style={tabStyle('sequences')} onClick={function(){setTab('sequences')}}>Sequences</button>
          <button style={tabStyle('reviews')} onClick={function(){setTab('reviews')}}>Review requests</button>
        </div>

        {/* ── CAMPAIGNS TAB ── */}
        {tab === 'campaigns' && (
          <div>
            {/* Email builder */}
            {showBuilder && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', marginBottom:'1.25rem', overflow:'hidden' }}>
                <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f9f9f7' }}>
                  <div style={{ fontSize:'15px', fontWeight:600 }}>{editingCampaign?'Edit campaign':'New campaign'}</div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button style={{ ...btn, background:previewMode?'#534AB7':'transparent', color:previewMode?'#fff':'#666', borderColor:previewMode?'#534AB7':'rgba(0,0,0,0.2)', fontSize:'12px' }} onClick={function(){setPreviewMode(function(v){return !v})}}>👁 {previewMode?'Edit':'Preview'}</button>
                    <button style={btn} onClick={function(){setShowBuilder(false);setEditingCampaign(null)}}>Cancel</button>
                    <button style={btnGold} onClick={saveCampaign} disabled={sending}>{sending?'Saving...':'Save campaign'}</button>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', minHeight:'600px' }}>
                  {/* Left: Settings */}
                  <div style={{ borderRight:'0.5px solid rgba(0,0,0,0.08)', padding:'1.25rem', display:'flex', flexDirection:'column', gap:'12px', background:'#fafaf8' }}>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Campaign name</div><input style={inp} value={campName} onChange={function(e){setCampName(e.target.value)}} placeholder="e.g. Spring promotion" /></div>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Type</div>
                      <select style={{ ...inp, fontFamily:'inherit' }} value={campType} onChange={function(e){setCampType(e.target.value)}}>
                        <option value="email">Email</option><option value="sms">SMS</option>
                      </select>
                    </div>
                    {campType==='email' && <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Subject line</div><input style={inp} value={campSubject} onChange={function(e){setCampSubject(e.target.value)}} placeholder="Your subject..." /></div>}
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Send to</div>
                      <select style={{ ...inp, fontFamily:'inherit' }} value={campAudience} onChange={function(e){setCampAudience(e.target.value)}}>
                        <option value="all">All customers ({customers.length})</option>
                        {segments.map(function(s){ return <option key={s.id} value={s.id}>{s.name} ({s.customer_count||0})</option> })}
                      </select>
                    </div>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Status</div>
                      <select style={{ ...inp, fontFamily:'inherit' }} value={campStatus} onChange={function(e){setCampStatus(e.target.value)}}>
                        <option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="sent">Sent</option>
                      </select>
                    </div>

                    {campType === 'email' && !previewMode && (
                      <div>
                        <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:500 }}>Add blocks</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                          {BLOCK_TYPES.map(function(bt){
                            return (
                              <button key={bt.type} onClick={function(){addBlock(bt.type)}} style={{ ...btn, fontSize:'12px', padding:'6px 8px', display:'flex', alignItems:'center', gap:'6px', justifyContent:'flex-start' }}>
                                <span style={{ fontSize:'14px' }}>{bt.icon}</span>
                                <span>{bt.label}</span>
                              </button>
                            )
                          })}
                        </div>
                        <div style={{ marginTop:'10px', padding:'8px', background:'rgba(212,168,67,0.08)', borderRadius:'6px', fontSize:'11px', color:'#8B6914' }}>
                          💡 Drag blocks to reorder. Click a block to edit it.
                        </div>
                        <div style={{ marginTop:'8px' }}>
                          <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Personalization tokens</div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                            {['{first_name}','{last_name}','{email}','{booking_date}'].map(function(t){
                              return <button key={t} onClick={function(){navigator.clipboard&&navigator.clipboard.writeText(t)}} style={{ fontSize:'10px', padding:'2px 6px', borderRadius:'4px', border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', cursor:'pointer', fontFamily:'monospace', color:'#534AB7' }}>{t}</button>
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                    {campType === 'sms' && (
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>SMS Message</div><textarea style={{ ...inp, resize:'none', height:'120px' }} value={campBody} onChange={function(e){setCampBody(e.target.value)}} placeholder="Write your SMS message... Use {first_name} for personalization." /></div>
                    )}
                  </div>

                  {/* Right: Canvas */}
                  <div style={{ padding:'1.5rem', background:'#f5f5f3', overflowY:'auto' }}>
                    {campType === 'email' && (
                      <div style={{ maxWidth:'600px', margin:'0 auto', background:'#fff', borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 20px rgba(0,0,0,0.08)' }}>
                        {/* Email header */}
                        <div style={{ background:'#0D0D0D', padding:'20px 32px', textAlign:'center' }}>
                          <div style={{ fontSize:'20px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></div>
                        </div>
                        <div style={{ padding:'32px' }}>
                          {previewMode ? (
                            <div dangerouslySetInnerHTML={{ __html: blocksToHtml() }} />
                          ) : (
                            <div>
                              {blocks.map(function(block, idx){
                                return <BlockEditor key={block.id} block={block} idx={idx} />
                              })}
                              {blocks.length === 0 && (
                                <div style={{ textAlign:'center', padding:'3rem', color:'#ccc', border:'2px dashed #eee', borderRadius:'8px' }}>
                                  <div style={{ fontSize:'32px', marginBottom:'8px' }}>✉</div>
                                  Add blocks from the left panel to build your email
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Email footer */}
                        <div style={{ background:'#f9f9f7', padding:'20px 32px', textAlign:'center', fontSize:'11px', color:'#aaa' }}>
                          You're receiving this because you're a Hit Elite member. <span style={{ color:'#D4A843', cursor:'pointer' }}>Unsubscribe</span>
                        </div>
                      </div>
                    )}
                    {campType === 'sms' && (
                      <div style={{ maxWidth:'360px', margin:'0 auto', background:'#fff', borderRadius:'20px', padding:'1.5rem', boxShadow:'0 2px 20px rgba(0,0,0,0.08)' }}>
                        <div style={{ fontSize:'12px', color:'#888', textAlign:'center', marginBottom:'14px' }}>SMS Preview</div>
                        <div style={{ background:'#0D0D0D', color:'#fff', borderRadius:'14px 14px 14px 4px', padding:'12px 16px', fontSize:'14px', lineHeight:1.5 }}>
                          {campBody||'Your SMS message will appear here...'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Campaign list */}
            {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
            {!loading && campaigns.length===0 && !showBuilder && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'14px' }}>📣</div>
                <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>No campaigns yet</div>
                <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Create your first email or SMS campaign with the drag-and-drop builder.</div>
                <button style={btnGold} onClick={function(){setShowBuilder(true)}}>+ Create first campaign</button>
              </div>
            )}
            <div style={{ display:'grid', gap:'10px' }}>
              {campaigns.map(function(c){
                var sc = { draft:['#F1EFE8','#5F5E5A'], scheduled:['#FAEEDA','#854F0B'], sent:['#E1F5EE','#0F6E56'], cancelled:['#FCEBEB','#A32D2D'] }[c.status]||['#F1EFE8','#5F5E5A']
                return (
                  <div key={c.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
                    <div style={{ fontSize:'22px' }}>{c.type==='sms'?'💬':'✉️'}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'3px' }}>{c.name}</div>
                      <div style={{ fontSize:'12px', color:'#888' }}>{c.type==='sms'?'SMS':'Email'} · {c.audience_type==='all'?'All customers':'Segment'} · {c.created_at?new Date(c.created_at).toLocaleDateString():''}</div>
                      {c.subject && <div style={{ fontSize:'12px', color:'#aaa', marginTop:'2px' }}>Subject: {c.subject}</div>}
                    </div>
                    <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{c.status||'draft'}</span>
                    <button style={{ ...btn, fontSize:'12px', padding:'5px 10px' }} onClick={function(){openEditCampaign(c)}}>Edit</button>
                    <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:'#A32D2D' }} onClick={async function(){if(confirm('Delete this campaign?')){await supabase.from('campaigns').delete().eq('id',c.id);loadAll()}}}>Delete</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SEQUENCES TAB ── */}
        {tab === 'sequences' && (
          <div>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Pre-built sequence templates</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'12px', marginBottom:'1.5rem' }}>
              {SEQUENCE_TEMPLATES.map(function(t){
                var exists = sequences.find(function(s){return s.trigger_type===t.trigger})
                return (
                  <div key={t.trigger} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                    <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>{t.name}</div>
                    <div style={{ fontSize:'12px', color:'#888', marginBottom:'10px', lineHeight:1.5 }}>{t.desc}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'11px', color:'#aaa' }}>{t.steps} step{t.steps!==1?'s':''}</span>
                      {exists ? <span style={{ fontSize:'12px', color:'#0F6E56', fontWeight:500 }}>✓ Created</span> : <button style={{ ...btnGold, fontSize:'12px', padding:'5px 12px' }} onClick={function(){createSequence(t)}}>Use template</button>}
                    </div>
                  </div>
                )
              })}
            </div>
            {sequences.length > 0 && (
              <div>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Your sequences</div>
                <div style={{ display:'grid', gap:'10px' }}>
                  {sequences.map(function(s){
                    return (
                      <div key={s.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'12px 1.25rem', display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'13px', fontWeight:600 }}>{s.name}</div>
                          <div style={{ fontSize:'12px', color:'#888' }}>Trigger: {s.trigger_type}</div>
                        </div>
                        <div onClick={async function(){ await supabase.from('sequences').update({is_active:!s.is_active}).eq('id',s.id); setSequences(function(prev){return prev.map(function(x){return x.id===s.id?{...x,is_active:!x.is_active}:x})}) }} style={{ width:'34px', height:'19px', borderRadius:'10px', background:s.is_active?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
                          <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background:'#fff', top:'2px', right:s.is_active?'2px':'17px', transition:'right .15s' }}></div>
                        </div>
                        <span style={{ fontSize:'12px', color:s.is_active?'#0F6E56':'#888' }}>{s.is_active?'Active':'Paused'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {tab === 'reviews' && (
          <div style={{ display:'grid', gap:'14px', maxWidth:'560px' }}>
            {[
              { label:'Ask for review after every completed session', on:true },
              { label:'Redirect 5-star reviews to Google', on:true },
              { label:'Auto-publish reviews to website plugin', on:false },
            ].map(function(r,i){
              return <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:i<2?'0.5px solid rgba(0,0,0,0.06)':'none', fontSize:'13px' }}>
                <span>{r.label}</span>
                <div style={{ width:'34px', height:'19px', borderRadius:'10px', background:r.on?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0 }}>
                  <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background:'#fff', top:'2px', right:r.on?'2px':'17px' }}></div>
                </div>
              </div>
            })}
            <div style={{ marginTop:'1rem', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'13px', color:'#888', textAlign:'center', padding:'1rem 0' }}>No reviews yet. Reviews appear here once customers submit them.</div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
