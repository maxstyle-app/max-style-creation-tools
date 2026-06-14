import Stripe from 'stripe'

// Hardcoded exact working Stripe key
const stripe = new Stripe('sk_test_51TiDW3Fjhcru0Y0zNPfIqMNN2B5cRDrwhF54MxpUogbQm2HgPzIPaT3VTb0wD90ExFD4v3x4lEbrXwKdZYmcPSRQ0070vv9YRm')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Missing login token.' })

    // Extract the login token
    const token = authHeader.replace('Bearer ', '')
    
    // Natively decode the token to get the user's ID and Email WITHOUT using the database!
    const base64Payload = token.split('.')[1]
    const payload = Buffer.from(base64Payload, 'base64').toString('utf-8')
    const user = JSON.parse(payload)

    // Open Stripe exactly like our successful test, but pass the user data
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.sub, // This safely passes their user ID to Stripe
      line_items: [
        {
          price: 'price_1TiDvEFjhcru0Y0zr7ERrwxi',
          quantity: 1
        }
      ],
      success_url: 'https://max-style-creation-tools-production.up.railway.app/?success=true',
      cancel_url: 'https://max-style-creation-tools-production.up.railway.app/?canceled=true',
      metadata: {
        user_id: user.sub
      }
    })

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}
