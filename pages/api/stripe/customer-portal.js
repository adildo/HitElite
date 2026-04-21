import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { customer_id } = req.body
  if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: 'Stripe not configured' })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    const profileResult = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', customer_id).single()
    if (!profileResult.data || !profileResult.data.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found for this user' })
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: profileResult.data.stripe_customer_id,
      return_url: process.env.NEXT_PUBLIC_APP_URL + '/portal/profile',
    })
    return res.status(200).json({ url: session.url })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
