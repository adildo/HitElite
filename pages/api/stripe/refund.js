import { createClient } from '@supabase/supabase-js'

var supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  var { payment_id, amount, reason } = req.body
  if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: 'Stripe not configured' })

  var Stripe = require('stripe')
  var stripe = Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    var paymentResult = await supabaseAdmin.from('payments').select('*').eq('id', payment_id).single()
    if (!paymentResult.data || !paymentResult.data.stripe_payment_intent_id) {
      return res.status(400).json({ error: 'Payment not found or no Stripe PI' })
    }
    var pi = paymentResult.data.stripe_payment_intent_id
    var refundParams = { payment_intent: pi, reason: reason || 'requested_by_customer' }
    if (amount) refundParams.amount = Math.round(parseFloat(amount) * 100)

    var refund = await stripe.refunds.create(refundParams)
    var isPartial = amount && parseFloat(amount) < parseFloat(paymentResult.data.amount)
    await supabaseAdmin.from('payments').update({ status: isPartial ? 'partially_refunded' : 'refunded', stripe_charge_id: refund.id }).eq('id', payment_id)

    return res.status(200).json({ refund })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
