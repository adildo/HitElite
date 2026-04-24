import Stripe from 'stripe'

export default async function handler(req, res) {
  const hasSecret = !!process.env.STRIPE_SECRET_KEY
  const hasWebhook = !!process.env.STRIPE_WEBHOOK_SECRET
  const mode = process.env.STRIPE_SECRET_KEY
    ? (process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'live' : 'test')
    : null

  if (!hasSecret) return res.status(200).json({ connected: false })

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    await stripe.balance.retrieve()
    return res.status(200).json({ connected: true, mode, webhook: hasWebhook })
  } catch (err) {
    return res.status(200).json({ connected: false, error: err.message })
  }
}
