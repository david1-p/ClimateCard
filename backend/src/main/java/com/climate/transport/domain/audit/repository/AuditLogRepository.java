package com.climate.transport.domain.audit.repository;

import com.climate.transport.domain.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 감사 로그 저장소
 */
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * IP 주소로 최근 로그 조회
     */
    List<AuditLog> findTop10ByIpAddressOrderByTimestampDesc(String ipAddress);

    /**
     * Admin API 로그만 조회
     */
    List<AuditLog> findTop100ByIsAdminApiTrueOrderByTimestampDesc();

    /**
     * 에러 로그만 조회 (4xx, 5xx)
     */
    @Query("SELECT a FROM AuditLog a WHERE a.statusCode >= 400 ORDER BY a.timestamp DESC")
    List<AuditLog> findRecentErrors();

    /**
     * 특정 기간 동안의 로그 조회
     */
    @Query("SELECT a FROM AuditLog a WHERE a.timestamp BETWEEN :startTime AND :endTime ORDER BY a.timestamp DESC")
    List<AuditLog> findByTimestampBetween(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    /**
     * IP별 요청 횟수 집계 (의심스러운 IP 탐지)
     */
    @Query("SELECT a.ipAddress, COUNT(a) as count FROM AuditLog a " +
           "WHERE a.timestamp >= :since " +
           "GROUP BY a.ipAddress " +
           "HAVING COUNT(a) > :threshold " +
           "ORDER BY count DESC")
    List<Object[]> findSuspiciousIps(
        @Param("since") LocalDateTime since,
        @Param("threshold") long threshold
    );
}
