package com.climate.transport.batch.processor;

import com.climate.transport.api.validation.ValidationConstants;
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
import java.io.IOException;
import java.util.Optional;

/**
 * 기후동행카드 적용 노선 엑셀 임포터
 * 엑셀 파일에서 기후동행카드 적용 노선 목록을 읽어서 DB 업데이트
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ClimateCardExcelImporter {

    private final RouteRepository routeRepository;
    private static final int HEADER_ROW_INDEX = 0;

    @Transactional
    public void importExcel() {
        File file = new File(ValidationConstants.CLIMATE_CARD_EXCEL_PATH);

        if (!file.exists()) {
            log.warn("엑셀 파일을 찾을 수 없습니다: {}", file.getAbsolutePath());
            throw new IllegalStateException("기후동행카드 노선 목록 엑셀 파일이 존재하지 않습니다");
        }

        try (FileInputStream fis = new FileInputStream(file);
             Workbook workbook = new XSSFWorkbook(fis)) {

            Sheet sheet = workbook.getSheetAt(0);
            log.info("엑셀 임포트 시작 - 총 행 수: {}", sheet.getPhysicalNumberOfRows());

            int processedCount = 0;
            int updatedCount = 0;

            for (Row row : sheet) {
                // 헤더 행 스킵
                if (row.getRowNum() == HEADER_ROW_INDEX) {
                    continue;
                }

                String routeName = getCellValue(row, ValidationConstants.EXCEL_ROUTE_NAME_COLUMN);
                String eligible = getCellValue(row, ValidationConstants.EXCEL_ELIGIBLE_COLUMN);

                if (isEligibleRoute(routeName, eligible)) {
                    boolean updated = updateRouteEligibility(routeName.trim());
                    processedCount++;
                    if (updated) {
                        updatedCount++;
                    }
                }
            }

            log.info("엑셀 임포트 완료 - 처리: {}건, 업데이트: {}건", processedCount, updatedCount);

        } catch (IOException e) {
            log.error("엑셀 파일 읽기 실패", e);
            throw new IllegalStateException("엑셀 파일 처리 중 오류가 발생했습니다", e);
        } catch (Exception e) {
            log.error("엑셀 임포트 실패", e);
            throw new IllegalStateException("엑셀 데이터 처리 중 오류가 발생했습니다", e);
        }
    }

    /**
     * 기후동행카드 적용 노선인지 확인
     */
    private boolean isEligibleRoute(String routeName, String eligible) {
        return routeName != null
                && !routeName.isBlank()
                && ValidationConstants.ELIGIBLE_MARKER.equals(eligible);
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
