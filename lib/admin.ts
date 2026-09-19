// New signups need approval before using the app; only this address can grant it.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'moran.h988@gmail.com'

export function isAdminEmail(email: string) {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}
