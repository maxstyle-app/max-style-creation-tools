import { useRouter } from 'next/router'

export default function Success() {
  const router = useRouter()

  return (
    <main className="page">
      <section className="card">
        <h1>Thank you!</h1>

        <p>
          Your payment was successful. Your account can now be upgraded to unlimited access.
        </p>

        <p className="small">
          For this MVP version, you can manually mark users as paid inside Supabase after payment.
        </p>

        <button onClick={() => router.push('/')}>
          Go Back to Max Style Creation Tools
        </button>
      </section>
    </main>
  )
}
