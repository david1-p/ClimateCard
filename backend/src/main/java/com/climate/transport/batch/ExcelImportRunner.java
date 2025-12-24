package com.climate.transport.batch;

import com.climate.transport.batch.processor.ClimateCardExcelImporter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 애플리케이션 시작 시 기후동행카드 엑셀 데이터 자동 임포트
 * 개발/운영 환경에서만 실행 (테스트 환경 제외)
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Profile("!test")  // 테스트 프로파일에서는 실행하지 않음
public class ExcelImportRunner implements CommandLineRunner {

    private final ClimateCardExcelImporter importer;

    @Override
    public void run(String... args) {
        try {
            log.info("기후동행카드 엑셀 데이터 자동 임포트 시작");
            importer.importExcel();
        } catch (IllegalStateException e) {
            log.warn("엑셀 파일 임포트 건너뜀: {}", e.getMessage());
        } catch (Exception e) {
            log.error("엑셀 데이터 임포트 실패", e);
        }
    }
}
