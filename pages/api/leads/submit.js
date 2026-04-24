import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Allow CORS for embed forms on external websites
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    var { first_name, last_name, email, phone, source, notes } = req.body
    if (!email && !first_name) return res.status(400).json({ error: 'Name or email required' })

    await supabaseAdmin.from('leads').insert({
      first_name: first_name || '',
      last_name: last_name || '',
      email: email || '',
      phone: phone || '',
      source: source || 'Website form',
      notes: notes || '',
      stage: 'new',
    })
    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
