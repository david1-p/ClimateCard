/**
 * 버스 도착 메시지 포맷팅 유틸리티
 */

/**
 * 도착 메시지에서 띄어쓰기를 추가하여 포맷팅
 * "0분0초후" → "0분 0초 후"
 * "곧 도착" → "곧 도착" (변경 없음)
 */
export function formatArrivalMessage(message: string): string {
  if (!message) return '';

  // "곧 도착"이나 "출발대기" 같은 메시지는 그대로 반환
  if (message.includes('곧') || message.includes('대기') || message.includes('없음')) {
    return message;
  }

  // "0분0초후" → "0분 0초 후" 변환
  // 정규식으로 "분"과 "초" 사이에 공백 추가, "초"와 "후" 사이에 공백 추가
  return message
    .replace(/(\d+분)(\d+초)/g, '$1 $2')  // "0분0초" → "0분 0초"
    .replace(/(초)(후)/g, '$1 $2');        // "초후" → "초 후"
}

/**
 * 도착 시간(초)으로부터 긴급도 확인
 * 1분(60초) 이내 또는 "곧 도착"이면 true
 */
export function isUrgentArrival(traTime: number | null, message: string): boolean {
  // "곧 도착" 메시지인 경우
  if (message && message.includes('곧')) {
    return true;
  }

  // traTime이 있고 60초 이하인 경우
  if (traTime !== null && traTime <= 60) {
    return true;
  }

  return false;
}

/**
 * 도착 메시지의 긴급도에 따른 CSS 클래스 반환
 */
export function getArrivalTextClass(traTime: number | null, message: string): string {
  const baseClass = 'text-[11px] font-medium truncate max-w-[120px]';

  if (isUrgentArrival(traTime, message)) {
    return `${baseClass} text-red-600 font-extrabold`;
  }

  return `${baseClass} text-foreground`;
}
