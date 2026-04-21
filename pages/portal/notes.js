import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

export default function PortalNotes() {
  var [notes, setNotes] = useState([])
  var [loading, setLoading] = useState(true)
  var [showNew, setShowNew] = useState(false)
  var [newNote, setNewNote] = useState('')
  var [shareWithCoach, setShareWithCoach] = useState(false)
  var [sessionRef, setSessionRef] = useState('')
  var [saving, setSaving] = useState(false)
  var [editingId, setEditingId] = useState(null)
  var [editText, setEditText] = useState('')
  var [userId, setUserId] = useState(null)
  var [recentSessions, setRecentSessions] = useState([])

  useEffect(function(){
    async function load(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href='/login'; return }
      var uid = s.data.session.user.id
      setUserId(uid)
      var [notesR, sessR] = await Promise.all([
        supabase.from('student_notes').select('*').eq('customer_id', uid).order('created_at',{ascending:false}),
        supabase.from('appointments').select('id,starts_at,services(name)').eq('customer_id',uid).order('starts_at',{ascending:false}).limit(10),
      ])
      setNotes(notesR.data||[])
      setRecentSessions(sessR.data||[])
      setLoading(false)
    }
    load()
  },[])

  async function saveNote() {
    if (!newNote.trim()) return
    setSaving(true)
    await supabase.from('student_notes').insert({ customer_id:userId, note_text:newNote.trim(), share_with_coach:shareWithCoach, session_ref_id:sessionRef||null })
    setSaving(false); setShowNew(false); setNewNote(''); setShareWithCoach(false); setSessionRef('')
    var r = await supabase.from('student_notes').select('*').eq('customer_id',userId).order('created_at',{ascending:false})
    setNotes(r.data||[])
  }

  async function saveEdit(id) {
    await supabase.from('student_notes').update({ note_text:editText }).eq('id',id)
    setNotes(function(p){ return p.map(function(n){ return n.id===id?{...n,note_text:editText}:n }) })
    setEditingId(null)
  }

  async function deleteNote(id) {
    if (!confirm('Delete this note?')) return
    await supabase.from('student_notes').delete().eq('id',id)
    setNotes(function(p){ return p.filter(function(n){ return n.id!==id }) })
  }

  async function toggleShare(id, current) {
    await supabase.from('student_notes').update({ share_with_coach:!current }).eq('id',id)
    setNotes(function(p){ return p.map(function(n){ return n.id===id?{...n,share_with_coach:!current}:n }) })
  }

  var inp = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }

  return (
    <>
      <Head><title>My training journal — Hit Elite</title></Head>
      <div style={{ minHeight:'100vh', background:'#f5f5f3' }}>
        <nav style={{ background:'#0D0D0D', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
          <a href="/" style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', textDecoration:'none' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></a>
          <a href="/portal" style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)' }}>← My portal</a>
        </nav>
        <div style={{ maxWidth:'720px', margin:'0 auto', padding:'2rem 1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
            <div>
              <div style={{ fontSize:'22px', fontWeight:700 }}>Training journal</div>
              <div style={{ fontSize:'13px', color:'#888', marginTop:'2px' }}>Your personal session notes. Optionally share with your coach.</div>
            </div>
            <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ Add note</button>
          </div>

          {showNew && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1rem' }}>New note</div>
              <textarea style={{ ...inp, resize:'vertical', minHeight:'100px', marginBottom:'12px' }} value={newNote} onChange={function(e){setNewNote(e.target.value)}} placeholder="e.g. Felt great on the backhand today, need to work on my serve toss..." />
              {recentSessions.length > 0 && (
                <div style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Link to a session (optional)</div>
                  <select style={{ ...inp }} value={sessionRef} onChange={function(e){setSessionRef(e.target.value)}}>
                    <option value="">General note (not linked to a session)</option>
                    {recentSessions.map(function(s){
                      var svc = s.services?s.services.name:'Session'
                      var date = new Date(s.starts_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
                      return <option key={s.id} value={s.id}>{svc} — {date}</option>
                    })}
                  </select>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px', padding:'10px 14px', background:'#f9f9f7', borderRadius:'8px' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:500 }}>Share with coach</div>
                  <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>Your assigned coach will be able to see this note</div>
                </div>
                <div onClick={function(){setShareWithCoach(function(v){return !v})}} style={{ width:'38px', height:'21px', borderRadius:'11px', background:shareWithCoach?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
                  <div style={{ position:'absolute', width:'17px', height:'17px', borderRadius:'50%', background:'#fff', top:'2px', right:shareWithCoach?'2px':'19px', transition:'right .15s' }}></div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
                <button style={btnGold} onClick={saveNote} disabled={saving||!newNote.trim()}>{saving?'Saving...':'Save note'}</button>
              </div>
            </div>
          )}

          {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
          {!loading && notes.length === 0 && !showNew && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
              <div style={{ fontSize:'32px', marginBottom:'14px' }}>📓</div>
              <div style={{ fontWeight:600, marginBottom:'6px' }}>No notes yet</div>
              <div style={{ fontSize:'13px', marginBottom:'1.25rem' }}>Keep a personal training journal — track what you worked on, how you felt, and what to focus on next.</div>
              <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Write first note</button>
            </div>
          )}

          <div style={{ display:'grid', gap:'10px' }}>
            {notes.map(function(note){
              var isEditing = editingId === note.id
              return (
                <div key={note.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                    <div style={{ fontSize:'12px', color:'#aaa' }}>{new Date(note.created_at).toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'})}</div>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                      {note.share_with_coach && <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>Shared with coach</span>}
                      <button onClick={function(){setEditingId(note.id);setEditText(note.note_text)}} style={{ ...btn, fontSize:'11px', padding:'3px 8px' }}>Edit</button>
                      <button onClick={function(){deleteNote(note.id)}} style={{ ...btn, fontSize:'11px', padding:'3px 8px', color:'#A32D2D' }}>Delete</button>
                    </div>
                  </div>
                  {isEditing ? (
                    <div>
                      <textarea style={{ ...inp, resize:'vertical', minHeight:'80px', marginBottom:'8px' }} value={editText} onChange={function(e){setEditText(e.target.value)}} />
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button style={btn} onClick={function(){setEditingId(null)}}>Cancel</button>
                        <button style={btnGold} onClick={function(){saveEdit(note.id)}}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize:'13px', color:'#444', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{note.note_text}</div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px', paddingTop:'10px', borderTop:'0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize:'12px', color:'#aaa' }}>{note.share_with_coach?'Visible to your coach':'Private — only you can see this'}</div>
                    <button onClick={function(){toggleShare(note.id,note.share_with_coach)}} style={{ ...btn, fontSize:'11px', padding:'3px 10px', color:note.share_with_coach?'#888':'#185FA5' }}>
                      {note.share_with_coach?'Make private':'Share with coach'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
