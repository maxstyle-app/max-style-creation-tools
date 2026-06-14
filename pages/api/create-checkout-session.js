import Stripe from 'stripe'

export default async function handler(req, res) {
  try {
    // Hardcoding your exact test key so it CANNOT fail
    const stripe = new Stripe('sk_test_51TiDW3Fjhcru0Y0zNPfIqMNN2B5cRDrwhF54MxpUogbQm2HgPzIPaT3VTb0wD90ExFD4v3x4lEbrXwKdZYmcPSRQ0070vv9YRm');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1TiDvEFjhcru0Y0zr7ERrwxi',
          quantity: 1
        }
      ],
      success_url: 'https://max-style-creation-tools-production.up.railway.app/?success=true',
      cancel_url: 'https://max-style-creation-tools-production.up.railway.app/?canceled=true',
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
