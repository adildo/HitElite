import { useEffect, useState, useRef } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Messages() {
  var [conversations, setConversations] = useState([])
  var [activeConv, setActiveConv] = useState(null)
  var [messages, setMessages] = useState([])
  var [newMessage, setNewMessage] = useState('')
  var [loading, setLoading] = useState(true)
  var [sending, setSending] = useState(false)
  var [myId, setMyId] = useState(null)
  var [myProfile, setMyProfile] = useState(null)
  var [search, setSearch] = useState('')
  var [showNewConv, setShowNewConv] = useState(false)
  var [contacts, setContacts] = useState([])
  var messagesEndRef = useRef(null)

  useEffect(function(){
    async function init(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) return
      setMyId(s.data.session.user.id)
      var p = await supabase.from('profiles').select('*').eq('id',s.data.session.user.id).single()
      setMyProfile(p.data)
      loadConversations(s.data.session.user.id)
      loadContacts()
    }
    init()
  },[])

  async function loadConversations(uid) {
    var r = await supabase.from('messages').select('*, sender:profiles!messages_sender_id_fkey(full_name,role), recipient:profiles!messages_recipient_id_fkey(full_name,role)').or('sender_id.eq.'+uid+',recipient_id.eq.'+uid).order('created_at',{ascending:false}).limit(100)
    // Group by conversation partner
    var convMap = {}
    ;(r.data||[]).forEach(function(msg){
      var partnerId = msg.sender_id===uid ? msg.recipient_id : msg.sender_id
      var partner = msg.sender_id===uid ? msg.recipient : msg.sender
      if (!convMap[partnerId]) convMap[partnerId] = { partner_id:partnerId, partner, messages:[], unread:0 }
      convMap[partnerId].messages.push(msg)
      if (msg.recipient_id===uid && !msg.read_at) convMap[partnerId].unread++
    })
    setConversations(Object.values(convMap))
    setLoading(false)
  }

  async function loadContacts() {
    var r = await supabase.from('profiles').select('id,full_name,email,role').in('role',['coach','staff','manager','customer']).eq('is_active',true).order('full_name').limit(100)
    setContacts(r.data||[])
  }

  async function openConversation(conv) {
    setActiveConv(conv)
    setShowNewConv(false)
    // Load full message thread
    var r = await supabase.from('messages').select('*, sender:profiles!messages_sender_id_fkey(full_name,role)').or('and(sender_id.eq.'+myId+',recipient_id.eq.'+conv.partner_id+'),and(sender_id.eq.'+conv.partner_id+',recipient_id.eq.'+myId+')').order('created_at')
    setMessages(r.data||[])
    // Mark as read
    await supabase.from('messages').update({read_at:new Date().toISOString()}).eq('recipient_id',myId).eq('sender_id',conv.partner_id).is('read_at',null)
    setTimeout(function(){ messagesEndRef.current&&messagesEndRef.current.scrollIntoView({behavior:'smooth'}) },100)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !activeConv || !myId) return
    setSending(true)
    var r = await supabase.from('messages').insert({ sender_id:myId, recipient_id:activeConv.partner_id, content:newMessage.trim(), message_type:'direct' })
    if (!r.error) {
      setMessages(function(p){ return [...p, { id:Date.now().toString(), sender_id:myId, recipient_id:activeConv.partner_id, content:newMessage.trim(), created_at:new Date().toISOString(), sender:myProfile }] })
      setNewMessage('')
      setTimeout(function(){ messagesEndRef.current&&messagesEndRef.current.scrollIntoView({behavior:'smooth'}) },50)
    }
    setSending(false)
  }

  async function startNewConversation(contact) {
    var existing = conversations.find(function(c){ return c.partner_id === contact.id })
    if (existing) { openConversation(existing); return }
    var newConv = { partner_id:contact.id, partner:contact, messages:[], unread:0 }
    setConversations(function(p){ return [newConv,...p] })
    setActiveConv(newConv)
    setMessages([])
    setShowNewConv(false)
  }

  var filteredConvs = conversations.filter(function(c){
    return !search || (c.partner&&c.partner.full_name&&c.partner.full_name.toLowerCase().includes(search.toLowerCase()))
  })

  var inp = { padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }

  function roleColor(role){ var c={admin:'#B8922E',manager:'#534AB7',coach:'#0F6E56',staff:'#5F5E5A',customer:'#185FA5'}; return c[role]||'#888' }

  return (
    <AdminLayout active="messages">
      <div style={{ padding:0, height:'calc(100vh - 0px)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'1rem 2rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff' }}>
          <div style={{ fontSize:'18px', fontWeight:700 }}>Messages</div>
          <button style={btnGold} onClick={function(){setShowNewConv(function(x){return !x})}}>+ New message</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', flex:1, minHeight:0 }}>
          {/* Conversation list */}
          <div style={{ borderRight:'0.5px solid rgba(0,0,0,0.08)', background:'#fff', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'10px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
              <input type="text" style={{ ...inp, width:'100%' }} placeholder="Search conversations..." value={search} onChange={function(e){setSearch(e.target.value)}} />
            </div>

            {showNewConv && (
              <div style={{ padding:'10px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)', background:'#FFFBF0' }}>
                <div style={{ fontSize:'12px', fontWeight:600, color:'#888', marginBottom:'8px' }}>Start a conversation with:</div>
                <div style={{ maxHeight:'200px', overflowY:'auto' }}>
                  {contacts.map(function(c){
                    if (c.id === myId) return null
                    var ini = (c.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                    return (
                      <div key={c.id} onClick={function(){startNewConversation(c)}} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 6px', borderRadius:'6px', cursor:'pointer' }}>
                        <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#f1f1f1', color:roleColor(c.role), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700 }}>{ini}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'12px', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.full_name}</div>
                          <div style={{ fontSize:'10px', color:'#aaa' }}>{c.role}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ flex:1, overflowY:'auto' }}>
              {loading && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
              {!loading && filteredConvs.length === 0 && (
                <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>
                  No conversations yet.<br />Click <strong>+ New message</strong> to start one.
                </div>
              )}
              {filteredConvs.map(function(conv){
                var isActive = activeConv && activeConv.partner_id === conv.partner_id
                var lastMsg = conv.messages[0]
                var partner = conv.partner||{}
                var ini = (partner.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                return (
                  <div key={conv.partner_id} onClick={function(){openConversation(conv)}} style={{ display:'flex', gap:'10px', padding:'12px 14px', cursor:'pointer', background:isActive?'#FFFBF0':'transparent', borderBottom:'0.5px solid rgba(0,0,0,0.04)', borderLeft:isActive?'3px solid #D4A843':'3px solid transparent' }}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#0D0D0D', color:'#D4A843', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700 }}>{ini}</div>
                      {conv.unread > 0 && <div style={{ position:'absolute', top:'-2px', right:'-2px', width:'16px', height:'16px', borderRadius:'50%', background:'#A32D2D', color:'#fff', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{conv.unread}</div>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                        <div style={{ fontSize:'13px', fontWeight:conv.unread>0?700:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{partner.full_name||'Unknown'}</div>
                        {lastMsg && <div style={{ fontSize:'10px', color:'#aaa', flexShrink:0, marginLeft:'4px' }}>{new Date(lastMsg.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>}
                      </div>
                      <div style={{ fontSize:'11px', color:'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lastMsg?lastMsg.content:'No messages yet'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Message thread */}
          {!activeConv ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'#f9f9f7' }}>
              <div style={{ textAlign:'center', color:'#888' }}>
                <div style={{ fontSize:'36px', marginBottom:'14px' }}>💬</div>
                <div style={{ fontSize:'15px', fontWeight:600, color:'#1a1a1a', marginBottom:'6px' }}>Select a conversation</div>
                <div style={{ fontSize:'13px' }}>Or click + New message to start a new one</div>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', background:'#f9f9f7' }}>
              {/* Thread header */}
              <div style={{ padding:'12px 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', background:'#fff', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#0D0D0D', color:'#D4A843', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700 }}>
                  {(activeConv.partner&&activeConv.partner.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)}
                </div>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:600 }}>{activeConv.partner&&activeConv.partner.full_name||'Unknown'}</div>
                  <div style={{ fontSize:'11px', color:'#888' }}>{activeConv.partner&&activeConv.partner.role}</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:'1rem', display:'flex', flexDirection:'column', gap:'10px' }}>
                {messages.length === 0 && <div style={{ textAlign:'center', color:'#aaa', fontSize:'13px', padding:'2rem' }}>No messages yet. Say hello!</div>}
                {messages.map(function(msg){
                  var isMe = msg.sender_id === myId
                  var time = new Date(msg.created_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})
                  var date = new Date(msg.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})
                  return (
                    <div key={msg.id} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start' }}>
                      <div style={{ maxWidth:'65%' }}>
                        <div style={{ fontSize:'10px', color:'#aaa', marginBottom:'3px', textAlign:isMe?'right':'left' }}>{isMe?'You':(msg.sender&&msg.sender.full_name||'Unknown')} · {date} {time}</div>
                        <div style={{ padding:'10px 14px', borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px', background:isMe?'#D4A843':'#fff', color:isMe?'#0D0D0D':'#1a1a1a', fontSize:'13px', lineHeight:1.5, border:isMe?'none':'0.5px solid rgba(0,0,0,0.08)', boxShadow:'0 1px 2px rgba(0,0,0,0.06)' }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef}></div>
              </div>

              {/* Compose */}
              <div style={{ padding:'12px 1.25rem', borderTop:'0.5px solid rgba(0,0,0,0.08)', background:'#fff', display:'flex', gap:'10px' }}>
                <input type="text" style={{ ...inp, flex:1 }} placeholder={'Message '+((activeConv.partner&&activeConv.partner.full_name)||'')+'...'} value={newMessage} onChange={function(e){setNewMessage(e.target.value)}} onKeyDown={function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} />
                <button style={btnGold} onClick={sendMessage} disabled={sending||!newMessage.trim()}>{sending?'Sending...':'Send'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
