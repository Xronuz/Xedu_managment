import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';

export function initSentry(config: ConfigService) {
  const dsn = config.get<string>('SENTRY_DSN');
  const environment = config.get<string>('NODE_ENV') || 'development';

  if (!dsn) {
    return false; // Sentry o'chirilgan
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    sampleRate: 1.0,
    release: config.get<string>('SENTRY_RELEASE') || 'unknown',
    beforeSend(event) {
      if (event.request) {
        delete (event.request as any).cookies;
        delete (event.request as any).headers?.authorization;
      }
      return event;
    },
  });

  return true;
}
