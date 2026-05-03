import { Module, Global, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * FIREBASE_ADMIN token — inject firebase-admin.app.App vào các service.
 */
export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

/**
 * FirebaseModule — Global singleton khởi tạo Firebase Admin SDK.
 *
 * Cách hoạt động:
 *   1. Đọc FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY từ env
 *   2. Khởi tạo Firebase App một lần duy nhất (singleton via getApps() guard)
 *   3. Expose firebase-admin.app qua token FIREBASE_ADMIN
 *
 * Nếu thiếu env → không throw, log warning, app vẫn chạy (stub mode)
 *
 * Env vars required:
 *   FCM_PROJECT_ID    — Firebase project id (e.g. "ev-charging-app-76c33")
 *   FCM_CLIENT_EMAIL  — Service account client_email
 *   FCM_PRIVATE_KEY   — Service account private_key (ký tự \n được replace đúng)
 */
@Global()
@Module({
  providers: [
    {
      provide:    FIREBASE_ADMIN,
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService): admin.app.App | null => {
        const logger    = new Logger('FirebaseModule');
        const projectId = cfg.get<string>('FCM_PROJECT_ID');
        const email     = cfg.get<string>('FCM_CLIENT_EMAIL');
        const rawKey    = cfg.get<string>('FCM_PRIVATE_KEY');

        if (!projectId || !email || !rawKey) {
          logger.warn(
            'FCM env vars (FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY) '
            + 'not set — Firebase Admin SDK running in STUB mode (no push sent)',
          );
          return null;
        }

        // Normalize private key: Docker env có thể truyền \n dưới dạng literal string
        const privateKey = rawKey.replace(/\\n/g, '\n');

        // Singleton guard — tránh "FirebaseApp already exists"
        if (admin.apps.length > 0) {
          logger.log(`Firebase Admin SDK already initialized — reusing app "${admin.apps[0]?.name}"`);
          return admin.apps[0]!;
        }

        try {
          const app = admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail: email,
              privateKey,
            }),
          });
          logger.log(`Firebase Admin SDK initialized for project="${projectId}"`);
          return app;
        } catch (err: any) {
          logger.error(
            `Failed to initialize Firebase Admin SDK: ${err.message}`,
            err.stack,
          );
          return null;
        }
      },
    },
  ],
  exports: [FIREBASE_ADMIN],
})
export class FirebaseModule {}
