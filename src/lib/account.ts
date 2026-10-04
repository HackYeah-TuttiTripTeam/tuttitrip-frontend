export type Provider = 'google' | 'discord' | 'password' | 'other'

/** The login provider from the Auth0 user id (`google-oauth2|123`, `discord|123`, `auth0|123`). */
export function providerOf(sub: string | undefined): Provider {
  const prefix = sub?.split('|')[0]
  if (prefix === 'google-oauth2') return 'google'
  if (prefix === 'discord') return 'discord'
  if (prefix === 'auth0') return 'password'
  return 'other'
}

/** Google and Discord supply the name; any other account owns it (the API has the last word). */
export const canEditName = (provider: Provider) => provider !== 'google' && provider !== 'discord'
