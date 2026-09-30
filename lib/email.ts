import { Resend } from 'resend'

// Resend's shared test domain works out of the box with no setup — swap
// EMAIL_FROM for an address on your own verified domain for real deliverability.
const FROM = process.env.EMAIL_FROM || 'Bari <onboarding@resend.dev>'

function getClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const client = getClient()
  if (!client) {
    console.error('[email] RESEND_API_KEY is not set — cannot send password reset email')
    return
  }

  // The Resend SDK does NOT throw on a failed send — it resolves with
  // { data: null, error } — so the result must be checked explicitly or a
  // failure (e.g. the sandbox sender's one-recipient restriction) passes
  // completely silently.
  const { data, error } = await client.emails.send({
    from: FROM,
    to,
    subject: 'איפוס סיסמה ל-Bari',
    html: `
      <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>שלום ${name},</h2>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך ל-Bari.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;">איפוס סיסמה</a></p>
        <p>הקישור בתוקף ל-30 דקות. אם לא ביקשת איפוס סיסמה, אפשר להתעלם מהמייל הזה.</p>
      </div>
    `,
  })

  if (error) {
    console.error('[email] Resend failed to send password reset email:', JSON.stringify(error))
    return
  }
  console.log('[email] Password reset email sent, Resend id:', data?.id)
}
