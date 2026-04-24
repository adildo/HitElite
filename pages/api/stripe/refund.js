import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { payment_id, amount, reason } = req.body
  if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: 'Stripe not configured' })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    const paymentResult = await supabaseAdmin.from('payments').select('*').eq('id', payment_id).single()
    if (!paymentResult.data || !paymentResult.data.stripe_payment_intent_id) {
      return res.status(400).json({ error: 'Payment not found or no Stripe PI' })
    }
    const refundParams = { payment_intent: paymentResult.data.stripe_payment_intent_id, reason: reason || 'requested_by_customer' }
    if (amount) refundParams.amount = Math.round(parseFloat(amount) * 100)

    const refund = await stripe.refunds.create(refundParams)
    const isPartial = amount && parseFloat(amount) < parseFloat(paymentResult.data.amount)
    await supabaseAdmin.from('payments').update({ status: isPartial ? 'partially_refunded' : 'refunded', stripe_charge_id: refund.id }).eq('id', payment_id)

    return res.status(200).json({ refund })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
