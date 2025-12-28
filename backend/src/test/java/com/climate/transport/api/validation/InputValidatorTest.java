package com.climate.transport.api.validation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * InputValidator 단위 테스트
 */
@DisplayName("InputValidator 테스트")
class InputValidatorTest {

    private InputValidator inputValidator;

    @BeforeEach
    void setUp() {
        inputValidator = new InputValidator();
    }

    @Nested
    @DisplayName("위도 검증")
    class LatitudeValidation {

        @ParameterizedTest
        @ValueSource(doubles = {33.0, 37.5665, 43.0})
        @DisplayName("유효한 위도는 통과해야 함")
        void 유효한_위도는_통과(double validLat) {
            assertThatCode(() -> inputValidator.validateLatitude(validLat))
                    .doesNotThrowAnyException();
        }

        @ParameterizedTest
        @ValueSource(doubles = {32.9, 20.0, -10.0, 43.1, 50.0, 100.0})
        @DisplayName("범위 밖 위도는 예외 발생")
        void 범위_밖_위도는_예외_발생(double invalidLat) {
            assertThatThrownBy(() -> inputValidator.validateLatitude(invalidLat))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("위도는");
        }
    }

    @Nested
    @DisplayName("경도 검증")
    class LongitudeValidation {

        @ParameterizedTest
        @ValueSource(doubles = {124.0, 126.9780, 132.0})
        @DisplayName("유효한 경도는 통과해야 함")
        void 유효한_경도는_통과(double validLng) {
            assertThatCode(() -> inputValidator.validateLongitude(validLng))
                    .doesNotThrowAnyException();
        }

        @ParameterizedTest
        @ValueSource(doubles = {123.9, 100.0, -50.0, 132.1, 150.0, 200.0})
        @DisplayName("범위 밖 경도는 예외 발생")
        void 범위_밖_경도는_예외_발생(double invalidLng) {
            assertThatThrownBy(() -> inputValidator.validateLongitude(invalidLng))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("경도는");
        }
    }

    @Nested
    @DisplayName("반경 검증")
    class RadiusValidation {

        @ParameterizedTest
        @ValueSource(doubles = {50, 100, 500, 1000, 2000})
        @DisplayName("유효한 반경은 통과해야 함")
        void 유효한_반경은_통과(double validRadius) {
            assertThatCode(() -> inputValidator.validateRadius(validRadius))
                    .doesNotThrowAnyException();
        }

        @ParameterizedTest
        @ValueSource(doubles = {49, 0, -100, 2001, 5000, 10000})
        @DisplayName("범위 밖 반경은 예외 발생")
        void 범위_밖_반경은_예외_발생(double invalidRadius) {
            assertThatThrownBy(() -> inputValidator.validateRadius(invalidRadius))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("반경은");
        }
    }

    @Nested
    @DisplayName("검색 키워드 검증")
    class KeywordValidation {

        @ParameterizedTest
        @ValueSource(strings = {"421", "버스", "서울역", "가나다라마"})
        @DisplayName("유효한 키워드는 통과해야 함")
        void 유효한_키워드는_통과(String validKeyword) {
            assertThatCode(() -> inputValidator.validateKeyword(validKeyword))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("null 키워드는 예외 발생")
        void null_키워드는_예외_발생() {
            assertThatThrownBy(() -> inputValidator.validateKeyword(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("검색어를 입력해주세요");
        }

        @Test
        @DisplayName("빈 문자열은 예외 발생")
        void 빈_문자열은_예외_발생() {
            assertThatThrownBy(() -> inputValidator.validateKeyword(""))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("검색어를 입력해주세요");
        }

        @Test
        @DisplayName("공백만 있는 문자열은 예외 발생")
        void 공백만_있는_문자열은_예외_발생() {
            assertThatThrownBy(() -> inputValidator.validateKeyword("   "))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("검색어를 입력해주세요");
        }

        @Test
        @DisplayName("HTML 태그가 포함된 키워드는 XSS 방지를 위해 거부")
        void HTML_태그_포함_키워드는_거부() {
            String xssAttempt = "<script>alert('xss')</script>";

            assertThatThrownBy(() -> inputValidator.validateKeyword(xssAttempt))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("HTML 태그를 포함할 수 없습니다");
        }

        @Test
        @DisplayName("IMG 태그도 XSS 공격 가능하므로 거부")
        void IMG_태그도_거부() {
            String xssAttempt = "<img src=x onerror=alert('xss')>";

            assertThatThrownBy(() -> inputValidator.validateKeyword(xssAttempt))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("HTML 태그를 포함할 수 없습니다");
        }

        @Test
        @DisplayName("ReDoS 공격 시도 - 많은 꺾쇠 괄호는 빠르게 거부")
        void ReDoS_공격_시도_빠른_거부() {
            // 이전 정규식(.*<[^>]+>.*)은 이런 입력에 대해 exponential time 소요
            // 새로운 contains() 방식은 O(n)으로 즉시 처리
            // MAX_KEYWORD_LENGTH(50) 이내로 유지
            String redosAttempt = "<".repeat(30);

            assertThatThrownBy(() -> inputValidator.validateKeyword(redosAttempt))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("HTML 태그를 포함할 수 없습니다");
        }

        @Test
        @DisplayName("중첩된 태그 패턴도 안전하게 거부")
        void 중첩된_태그_패턴_거부() {
            String nestedPattern = "<a<a<a<a<a<a";

            assertThatThrownBy(() -> inputValidator.validateKeyword(nestedPattern))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("HTML 태그를 포함할 수 없습니다");
        }

        @Test
        @DisplayName("닫는 꺾쇠만 있어도 거부")
        void 닫는_꺾쇠만_있어도_거부() {
            String onlyClosing = "abc > def";

            assertThatThrownBy(() -> inputValidator.validateKeyword(onlyClosing))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("HTML 태그를 포함할 수 없습니다");
        }

        @Test
        @DisplayName("최소 길이 미만 키워드는 예외 발생")
        void 최소_길이_미만_키워드는_예외_발생() {
            // ValidationConstants.MIN_KEYWORD_LENGTH가 1이면 이 테스트는 통과할 것
            // 만약 2 이상이면 단일 문자는 거부되어야 함
            String tooShort = "";

            assertThatThrownBy(() -> inputValidator.validateKeyword(tooShort))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("최대 길이 초과 키워드는 예외 발생")
        void 최대_길이_초과_키워드는_예외_발생() {
            String tooLong = "a".repeat(ValidationConstants.MAX_KEYWORD_LENGTH + 1);

            assertThatThrownBy(() -> inputValidator.validateKeyword(tooLong))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("최대");
        }
    }

    @Nested
    @DisplayName("정류소 ID 검증")
    class StationIdValidation {

        @ParameterizedTest
        @ValueSource(strings = {"101000290", "123456", "999999999"})
        @DisplayName("유효한 정류소 ID는 통과해야 함")
        void 유효한_정류소_ID는_통과(String validStationId) {
            assertThatCode(() -> inputValidator.validateStationId(validStationId))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("null 정류소 ID는 예외 발생")
        void null_정류소_ID는_예외_발생() {
            assertThatThrownBy(() -> inputValidator.validateStationId(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("정류소 ID를 입력해주세요");
        }

        @Test
        @DisplayName("빈 문자열은 예외 발생")
        void 빈_문자열은_예외_발생() {
            assertThatThrownBy(() -> inputValidator.validateStationId(""))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("정류소 ID를 입력해주세요");
        }

        @ParameterizedTest
        @ValueSource(strings = {"abc123", "123-456", "정류소1", "12.34"})
        @DisplayName("숫자가 아닌 문자가 포함된 ID는 예외 발생")
        void 숫자가_아닌_문자_포함_ID는_예외_발생(String invalidStationId) {
            assertThatThrownBy(() -> inputValidator.validateStationId(invalidStationId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("유효하지 않은 정류소 ID 형식");
        }
    }

    @Nested
    @DisplayName("노선 ID 검증")
    class RouteIdValidation {

        @ParameterizedTest
        @ValueSource(strings = {"100100409", "421", "N30", "간선버스"})
        @DisplayName("유효한 노선 ID는 통과해야 함")
        void 유효한_노선_ID는_통과(String validRouteId) {
            assertThatCode(() -> inputValidator.validateRouteId(validRouteId))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("null 노선 ID는 예외 발생")
        void null_노선_ID는_예외_발생() {
            assertThatThrownBy(() -> inputValidator.validateRouteId(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("노선 ID를 입력해주세요");
        }

        @Test
        @DisplayName("빈 문자열은 예외 발생")
        void 빈_문자열은_예외_발생() {
            assertThatThrownBy(() -> inputValidator.validateRouteId(""))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("노선 ID를 입력해주세요");
        }
    }
}
