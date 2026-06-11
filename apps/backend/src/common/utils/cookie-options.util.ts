import { ConfigService } from '@nestjs/config';

/**
 * httpOnly auth cookie sozlamalari — auth.controller va super-admin.controller
 * (impersonation) o'rtasida bo'lishiladi. HTTPS'da cross-site (sameSite=none),
 * lokal http'da lax.
 */
export function buildCookieOptions(config: ConfigService) {
  const isHttps = config.get('APP_URL', '').startsWith('https://');
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? ('none' as const) : ('lax' as const),
    path: '/',
  };
}
