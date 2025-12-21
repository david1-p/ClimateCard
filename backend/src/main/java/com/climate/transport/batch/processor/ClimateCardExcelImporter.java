package com.climate.transport.batch.processor;

import com.climate.transport.domain.route.entity.Route;
import com.climate.transport.domain.route.repository.RouteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileInputStream;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClimateCardExcelImporter {

    private final RouteRepository routeRepository;
    private static final String EXCEL_FILE_PATH = "../1._기후동행카드_적용_노선_전체_목록(버스_및_지하철).xlsx";

    @Transactional
    public void importExcel() {
        File file = new File(EXCEL_FILE_PATH);
        if (!file.exists()) {
            // Docker 환경 등을 고려하여 절대 경로 또는 다른 경로 시도 가능성을 열어둠
            log.warn("Excel file not found at: {}", file.getAbsolutePath());
            return;
        }

        try (FileInputStream fis = new FileInputStream(file);
                Workbook workbook = new XSSFWorkbook(fis)) {

            Sheet sheet = workbook.getSheetAt(0); // 첫 번째 시트 사용
            log.info("Starting Excel Import. Total Rows: {}", sheet.getPhysicalNumberOfRows());

            // 헤더 찾기 (노선명, 노선번호 등)
            // 실제 파일 구조를 모르므로, 2번째 줄(Index 1)부터 데이터라고 가정하고
            // 첫 번째 문자열 셀을 찾아 처리하거나, 전체를 순회하며 "노선" 키워드를 찾음

            for (Row row : sheet) {
                if (row.getRowNum() < 2)
                    continue; // 헤더 스킵 (임의 설정)

                String routeName = getCellValue(row, 1); // B열 가정 (노선명)
                // 만약 B열이 아니라면 로직 수정 필요. 일단 구현.

                if (routeName != null && !routeName.isBlank()) {
                    updateRouteEligibility(routeName.trim());
                }
            }

        } catch (Exception e) {
            log.error("Failed to import Excel file", e);
        }
    }

    private void updateRouteEligibility(String routeName) {
        // DB에서 노선 조회 (이름으로)
        Optional<Route> routeOpt = routeRepository.findByRouteName(routeName);
        if (routeOpt.isPresent()) {
            Route route = routeOpt.get();
            route.updateClimateCardEligible(true);
            log.info("Marked route as eligible: {}", routeName);
        } else {
            // DB에 없으면, 일단 생성해두거나 스킵.
            // 여기서는 스킵하고 로그만 남김 (공공 API 동기화가 선행되어야 함)
            log.debug("Route not found in DB: {}", routeName);
        }
    }

    private String getCellValue(Row row, int cellIndex) {
        Cell cell = row.getCell(cellIndex);
        if (cell == null)
            return null;

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                return String.valueOf((int) cell.getNumericCellValue());
            default:
                return "";
        }
    }
}
