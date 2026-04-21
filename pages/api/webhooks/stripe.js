import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  let event
  try {
    const buf = await getRawBody(req)
    event = webhookSecret ? stripe.webhooks.constructEvent(buf, sig, webhookSecret) : JSON.parse(buf.toString())
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { booking_type, booking_id, customer_id, payment_mode } = session.metadata || {}
      const amountPaid = session.amount_total / 100
      await supabaseAdmin.from('payments').update({ status: 'succeeded' }).eq('metadata_json->>session_id', session.id)
      if (booking_type === 'appointment' && booking_id) await supabaseAdmin.from('appointments').update({ payment_status: payment_mode === 'deposit' ? 'partial' : 'paid', amount_paid: amountPaid, status: 'confirmed' }).eq('id', booking_id)
      if (booking_type === 'enrollment' && booking_id) await supabaseAdmin.from('enrollments').update({ payment_status: 'paid', amount_paid: amountPaid, status: 'enrolled' }).eq('id', booking_id)
      if (customer_id) {
        const ls = await supabaseAdmin.from('loyalty_settings').select('is_enabled,earn_rules_json').limit(1).maybeSingle()
        if (ls.data && ls.data.is_enabled) {
          const rule = (ls.data.earn_rules_json||[]).find(r => r.key === (booking_type==='appointment'?'per_appointment':'per_class') && r.enabled)
          if (rule) {
            const pts = rule.points||10
            const ex = await supabaseAdmin.from('loyalty_points').select('id,total_points,lifetime_points').eq('customer_id',customer_id).maybeSingle()
            if (ex.data) await supabaseAdmin.from('loyalty_points').update({ total_points:(ex.data.total_points||0)+pts, lifetime_points:(ex.data.lifetime_points||0)+pts }).eq('id',ex.data.id)
            else await supabaseAdmin.from('loyalty_points').insert({ customer_id, total_points:pts, lifetime_points:pts, referral_code:Math.random().toString(36).substring(2,10).toUpperCase() })
            await supabaseAdmin.from('loyalty_transactions').insert({ customer_id, points:pts, type:'earn', reason:'Booking payment', ref_type:booking_type, ref_id:booking_id })
          }
        }
      }
    }
    if (event.type === 'payment_intent.payment_failed') await supabaseAdmin.from('payments').update({ status:'failed' }).eq('stripe_payment_intent_id', event.data.object.id)
    if (['customer.subscription.updated','customer.subscription.created'].includes(event.type)) {
      const sub = event.data.object
      await supabaseAdmin.from('customer_memberships').update({ status:sub.status==='active'?'active':sub.status, next_billing_at:new Date(sub.current_period_end*1000).toISOString() }).eq('stripe_subscription_id',sub.id)
    }
    if (event.type === 'customer.subscription.deleted') await supabaseAdmin.from('customer_memberships').update({ status:'cancelled', cancelled_at:new Date().toISOString() }).eq('stripe_subscription_id',event.data.object.id)
    return res.status(200).json({ received: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
