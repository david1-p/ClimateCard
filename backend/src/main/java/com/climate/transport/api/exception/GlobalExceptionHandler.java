package com.climate.transport.api.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 전역 예외 처리 핸들러
 * - 사용자 친화적인 에러 메시지 제공
 * - 내부 구현 정보 노출 방지
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * 잘못된 입력 (검증 실패)
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("잘못된 입력: {}", ex.getMessage());

        Map<String, Object> body = createErrorBody(
                HttpStatus.BAD_REQUEST,
                "Bad Request",
                ex.getMessage()
        );

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * 잘못된 상태 (비즈니스 로직 오류)
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalStateException(IllegalStateException ex) {
        log.error("비즈니스 로직 오류: {}", ex.getMessage());

        Map<String, Object> body = createErrorBody(
                HttpStatus.CONFLICT,
                "Conflict",
                ex.getMessage()
        );

        return new ResponseEntity<>(body, HttpStatus.CONFLICT);
    }

    /**
     * 필수 파라미터 누락
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParameter(MissingServletRequestParameterException ex) {
        log.warn("필수 파라미터 누락: {}", ex.getParameterName());

        Map<String, Object> body = createErrorBody(
                HttpStatus.BAD_REQUEST,
                "Bad Request",
                String.format("필수 파라미터가 누락되었습니다: %s", ex.getParameterName())
        );

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * 타입 불일치
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("타입 불일치: {} - {}", ex.getName(), ex.getValue());

        Map<String, Object> body = createErrorBody(
                HttpStatus.BAD_REQUEST,
                "Bad Request",
                String.format("잘못된 파라미터 형식입니다: %s", ex.getName())
        );

        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * 예상치 못한 예외 (보안상 상세 정보 노출 방지)
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        log.error("예상치 못한 오류 발생", ex);

        Map<String, Object> body = createErrorBody(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        );

        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * 에러 응답 바디 생성
     */
    private Map<String, Object> createErrorBody(HttpStatus status, String error, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        return body;
    }
}
