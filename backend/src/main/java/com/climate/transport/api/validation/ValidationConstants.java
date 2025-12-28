package com.climate.transport.api.validation;

/**
 * API 요청 검증을 위한 상수 정의
 */
public final class ValidationConstants {

    private ValidationConstants() {
        throw new AssertionError("상수 클래스는 인스턴스화할 수 없습니다");
    }

    // 위도/경도 검증
    public static final double MIN_LATITUDE = 33.0;   // 대한민국 최남단
    public static final double MAX_LATITUDE = 43.0;   // 대한민국 최북단
    public static final double MIN_LONGITUDE = 124.0; // 대한민국 최서단
    public static final double MAX_LONGITUDE = 132.0; // 대한민국 최동단

    // 반경 검증
    public static final double MIN_RADIUS = 50.0;     // 최소 반경 50m
    public static final double MAX_RADIUS = 2000.0;   // 최대 반경 2km
    public static final double DEFAULT_RADIUS = 100.0; // 기본 반경 100m

    // 검색어 검증
    public static final int MIN_KEYWORD_LENGTH = 1;
    public static final int MAX_KEYWORD_LENGTH = 50;

    // 엑셀 파일 경로
    public static final String CLIMATE_CARD_EXCEL_PATH = "data/1._기후동행카드_적용_노선_전체_목록(버스_및_지하철).xlsx";

    // 엑셀 컬럼 인덱스
    public static final int EXCEL_ROUTE_NAME_COLUMN = 1;     // B열: 노선번호
    public static final int EXCEL_ELIGIBLE_COLUMN = 15;       // P열: 기후동행카드 적용여부

    // 기후동행카드 적용 여부 값
    public static final String ELIGIBLE_MARKER = "O";
    public static final String NOT_ELIGIBLE_MARKER = "X";
}
