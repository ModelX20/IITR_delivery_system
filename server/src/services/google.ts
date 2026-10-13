import { OAuth2Client } from 'google-auth-library';
import { env, googleCallbackUrl } from '../config/env';

export interface GoogleProfile {
  /** Google's stable account id. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  client ??= new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: googleCallbackUrl,
  });
  return client;
}

// An object so tests can stub `profileFromCode` instead of calling Google.
export const googleAuth = {
  isEnabled(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  },

  /** Google's consent screen URL. `state` is echoed back to the callback to prevent CSRF. */
  authUrl(state: string): string {
    return getClient().generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
      access_type: 'online',
    });
  },

  /** Exchanges the callback code for tokens and returns the verified identity from the ID token. */
  async profileFromCode(code: string): Promise<GoogleProfile> {
    const { tokens } = await getClient().getToken(code);
    if (!tokens.id_token) throw new Error('Google did not return an ID token');

    // Verifies the signature, issuer, expiry and that the token was issued for our client ID.
    const ticket = await getClient().verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error('Google ID token is missing sub or email');

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name?.trim() || payload.email.split('@')[0],
    };
  },
};
