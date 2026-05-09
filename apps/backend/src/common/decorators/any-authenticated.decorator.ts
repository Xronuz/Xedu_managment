import { SetMetadata } from '@nestjs/common';

export const ANY_AUTHENTICATED_KEY = 'anyAuthenticated';

/**
 * Marks an endpoint as accessible to ANY authenticated user,
 * regardless of role. Used for self-service endpoints like
 * /me, /me/password, /me/avatar.
 *
 * This is explicit and auditable — unlike the old implicit
 * "no @Roles() = allow all" behavior.
 */
export const AnyAuthenticated = () => SetMetadata(ANY_AUTHENTICATED_KEY, true);
