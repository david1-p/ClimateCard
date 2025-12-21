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
    private static final String EXCEL_FILE_PATH = "data/1._기후동행카드_적용_노선_전체_목록(버스_및_지하철).xlsx";

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

            int processedCount = 0;
            int updatedCount = 0;

            // 첫 번째 행은 헤더이므로 스킵
            for (Row row : sheet) {
                if (row.getRowNum() == 0)
                    continue; // 헤더 스킵

                // B열(index 1): 노선번호
                // P열(index 15): 기후동행카드 적용여부 (O/X)
                String routeName = getCellValue(row, 1);
                String eligible = getCellValue(row, 15);

                if (routeName != null && !routeName.isBlank() && "O".equals(eligible)) {
                    boolean updated = updateRouteEligibility(routeName.trim());
                    processedCount++;
                    if (updated) {
                        updatedCount++;
                    }
                }
            }

            log.info("Excel Import Complete. Processed: {}, Updated: {}", processedCount, updatedCount);

        } catch (Exception e) {
            log.error("Failed to import Excel file", e);
        }
    }

    private boolean updateRouteEligibility(String routeName) {
        // DB에서 노선 조회 (이름으로)
        Optional<Route> routeOpt = routeRepository.findByRouteName(routeName);
        if (routeOpt.isPresent()) {
            Route route = routeOpt.get();
            route.updateClimateCardEligible(true);
            log.debug("Marked route as eligible: {}", routeName);
            return true;
        } else {
            // DB에 없으면 스킵 (공공 API 동기화가 선행되어야 함)
            log.debug("Route not found in DB: {}", routeName);
            return false;
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
