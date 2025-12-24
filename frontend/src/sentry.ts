import * as Sentry from "@sentry/react";

/**
 * Sentry 초기화
 * - 에러 추적
 * - 성능 모니터링
 * - 브레드크럼 (사용자 행동 추적)
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // DSN이 없으면 Sentry 비활성화
  if (!dsn) {
    console.log('Sentry DSN이 설정되지 않았습니다. Sentry를 사용하지 않습니다.');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,  // development, production

    // 성능 모니터링 샘플링 비율 (100%)
    tracesSampleRate: 1.0,

    // 에러 샘플링 비율 (100% - 모든 에러 추적)
    sampleRate: 1.0,

    // Release 버전 (배포 추적)
    release: import.meta.env.VITE_APP_VERSION || '0.0.1',

    // 통합 기능 (v8에서는 자동 통합)
    // integrations: [],

    // 프로덕션 환경에서만 에러 전송
    enabled: import.meta.env.PROD,

    // 개인정보 전송 비활성화
    beforeSend(event, hint) {
      // 로컬/개발 환경에서는 콘솔에만 출력
      if (import.meta.env.DEV) {
        console.error('Sentry Event:', event, hint);
        return null;  // 개발 환경에서는 전송 안 함
      }

      // 네트워크 에러는 제외 (사용자 환경 문제)
      const error = hint.originalException;
      if (error instanceof Error && error.message.includes('Network Error')) {
        return null;
      }

      // 404 에러는 제외
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }

      return event;
    },

    // 에러 필터링
    ignoreErrors: [
      // 브라우저 확장 프로그램 에러
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',

      // 네트워크 에러
      'Network request failed',
      'Failed to fetch',

      // 스크립트 로딩 에러
      'Script error',
    ],

    // URL 블랙리스트 (추적 안 함)
    denyUrls: [
      // 브라우저 확장 프로그램
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}

/**
 * 사용자 정보 설정 (로그인 후)
 */
export function setSentryUser(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email: email,
  });
}

/**
 * 사용자 정보 제거 (로그아웃 후)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * 커스텀 에러 로깅
 */
export function logError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * 커스텀 메시지 로깅
 */
export function logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}
