-- 보안 감사 로그 테이블 생성
-- 모든 API 요청에 대한 로그를 저장하여 보안 감사 추적

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_uri VARCHAR(500),
    query_string TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    is_admin_api BOOLEAN DEFAULT FALSE,
    api_key_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_status_code ON audit_logs(status_code);
CREATE INDEX idx_audit_logs_is_admin_api ON audit_logs(is_admin_api);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 파티셔닝을 위한 준비 (선택 사항, 대용량 데이터 시)
COMMENT ON TABLE audit_logs IS '보안 감사 로그 - 모든 API 요청 기록';
COMMENT ON COLUMN audit_logs.ip_address IS '클라이언트 IP 주소';
COMMENT ON COLUMN audit_logs.is_admin_api IS 'Admin API 요청 여부';
COMMENT ON COLUMN audit_logs.api_key_used IS 'API Key 인증 사용 여부';
COMMENT ON COLUMN audit_logs.response_time_ms IS '응답 시간 (밀리초)';
