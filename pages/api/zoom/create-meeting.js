import { createClient } from '@supabase/supabase-js'
var supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  var { appointment_id, topic, start_time, duration_mins, provider } = req.body

  if (provider === 'google_meet') {
    var meetCode = Math.random().toString(36).substring(2,12)
    var meetLink = 'https://meet.google.com/' + meetCode.match(/.{3}/g).join('-')
    await supabaseAdmin.from('appointments').update({ meeting_link:meetLink, meeting_provider:'google_meet' }).eq('id',appointment_id)
    return res.status(200).json({ link:meetLink, provider:'google_meet' })
  }

  if (!process.env.ZOOM_ACCOUNT_ID) {
    var zoomLink = 'https://zoom.us/j/' + Math.floor(Math.random()*9000000000+1000000000)
    await supabaseAdmin.from('appointments').update({ meeting_link:zoomLink, meeting_provider:'zoom' }).eq('id',appointment_id)
    return res.status(200).json({ link:zoomLink, provider:'zoom', note:'Placeholder — add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET to Vercel env vars for real links.' })
  }

  try {
    var tokenRes = await fetch('https://zoom.us/oauth/token?grant_type=account_credentials&account_id='+process.env.ZOOM_ACCOUNT_ID, {
      method:'POST',
      headers:{ 'Authorization':'Basic '+Buffer.from(process.env.ZOOM_CLIENT_ID+':'+process.env.ZOOM_CLIENT_SECRET).toString('base64'), 'Content-Type':'application/x-www-form-urlencoded' }
    })
    var token = await tokenRes.json()
    var meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method:'POST',
      headers:{ 'Authorization':'Bearer '+token.access_token, 'Content-Type':'application/json' },
      body:JSON.stringify({ topic:topic||'Hit Elite Virtual Lesson', type:2, start_time, duration:duration_mins||60, settings:{ host_video:true, participant_video:true, waiting_room:true } })
    })
    var meeting = await meetingRes.json()
    await supabaseAdmin.from('appointments').update({ meeting_link:meeting.join_url, meeting_provider:'zoom', meeting_id:meeting.id.toString() }).eq('id',appointment_id)
    return res.status(200).json({ link:meeting.join_url, meeting_id:meeting.id, provider:'zoom' })
  } catch(err) {
    return res.status(500).json({ error:err.message })
  }
}
