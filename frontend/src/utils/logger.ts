/**
 * 환경변수 기반 로깅 유틸리티
 * - 개발 환경에서만 로그 출력
 * - 프로덕션 환경에서는 로그 비활성화 (보안 강화)
 */

const isDev = import.meta.env.DEV;

/**
 * 로거 객체
 * - 개발 환경: console.log/error 사용
 * - 프로덕션: 아무것도 출력하지 않음
 */
export const logger = {
  /**
   * 일반 로그 (개발 환경에서만 출력)
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * 에러 로그 (개발 환경에서만 출력)
   * 프로덕션에서는 Sentry로 전송
   */
  error: (...args: any[]) => {
    if (isDev) {
      console.error(...args);
    }
    // 프로덕션에서는 Sentry가 자동으로 캡처
  },

  /**
   * 경고 로그 (개발 환경에서만 출력)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * 디버그 로그 (개발 환경에서만 출력)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};
