package com.climate.transport.domain.arrival.service;

import com.climate.transport.domain.arrival.dto.BusArrivalResponse;
import com.climate.transport.domain.route.entity.Route;
import com.climate.transport.domain.route.repository.RouteRepository;
import com.climate.transport.domain.station.entity.Station;
import com.climate.transport.domain.station.repository.StationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.net.ssl.*;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class BusArrivalService {

    private final StationRepository stationRepository;
    private final RouteRepository routeRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate;

    // bus.go.kr 버스 도착 정보 조회 API
    private static final String ARRIVAL_API_URL = "https://bus.go.kr/sbus/bus/selectBusArrive.do";

    public BusArrivalService(StationRepository stationRepository, RouteRepository routeRepository) {
        this.stationRepository = stationRepository;
        this.routeRepository = routeRepository;
        this.restTemplate = createRestTemplate();
    }

    /**
     * SSL 인증서 검증을 비활성화한 RestTemplate 생성
     * bus.go.kr의 SSL 인증서 문제를 우회하기 위함
     */
    private RestTemplate createRestTemplate() {
        try {
            TrustManager[] trustAllCerts = new TrustManager[] {
                    new X509TrustManager() {
                        public X509Certificate[] getAcceptedIssuers() {
                            return null;
                        }

                        public void checkClientTrusted(X509Certificate[] certs, String authType) {
                        }

                        public void checkServerTrusted(X509Certificate[] certs, String authType) {
                        }
                    }
            };

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());

            HostnameVerifier allHostsValid = (hostname, session) -> true;
            HttpsURLConnection.setDefaultHostnameVerifier(allHostsValid);

            return new RestTemplate();
        } catch (NoSuchAlgorithmException | KeyManagementException e) {
            log.error("Failed to create RestTemplate with SSL bypass: {}", e.getMessage());
            return new RestTemplate();
        }
    }

    public List<BusArrivalResponse> getArrivalInfo(String stationId) {
        // 정류소 정보 조회
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> new IllegalArgumentException("Station not found: " + stationId));

        // 같은 위치(10m 이내)에 있는 다른 정류소 ID들 찾기
        List<Station> nearbyStations = stationRepository.findStationsWithinRadius(station.getLocation(), 10.0);

        // 모든 근처 정류소 ID로 도착 정보 조회 시도
        for (Station nearbyStation : nearbyStations) {
            try {
                ArrivalResult result = fetchArrivalInfoWithDisplayId(nearbyStation.getStationId(),
                        nearbyStation.getStationName());

                // 도착 정보가 있으면 바로 반환
                if (!result.arrivals.isEmpty()) {
                    log.info("Found arrival info using station ID: {} ({})", nearbyStation.getStationId(),
                            nearbyStation.getStationName());

                    // displayId가 없으면 API에서 가져온 값으로 업데이트
                    if (nearbyStation.getDisplayId() == null && result.displayId != null) {
                        updateStationDisplayId(nearbyStation, result.displayId);
                    }

                    return result.arrivals;
                }
            } catch (Exception e) {
                log.debug("No arrival info for station ID: {}", nearbyStation.getStationId());
            }
        }

        log.info("No arrival info found for any nearby stations of: {} ({})", stationId, station.getStationName());
        return new ArrayList<>();
    }

    /**
     * bus.go.kr API로부터 도착 정보 조회
     */
    private List<BusArrivalResponse> fetchArrivalInfo(String stationId, String stationName) {
        try {
            // bus.go.kr API 호출 (stopId 파라미터 사용)
            String url = String.format("%s?stopId=%s", ARRIVAL_API_URL, stationId);

            log.debug("Fetching arrival info from bus.go.kr for station: {} ({})", stationId, stationName);

            // 브라우저처럼 보이기 위한 헤더 설정
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("X-Requested-With", "XMLHttpRequest");
            headers.set("Accept", "application/json, text/javascript, */*; q=0.01");

            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    String.class);

            String jsonResponse = response.getBody();

            // JSON 파싱
            return parseArrivalJson(jsonResponse);

        } catch (Exception e) {
            log.debug("Failed to fetch arrival info for station {}: {}", stationId, e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 도착 정보와 displayId를 함께 조회
     */
    private ArrivalResult fetchArrivalInfoWithDisplayId(String stationId, String stationName) {
        try {
            String url = String.format("%s?stopId=%s", ARRIVAL_API_URL, stationId);

            log.debug("Fetching arrival info from bus.go.kr for station: {} ({})", stationId, stationName);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("User-Agent",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("X-Requested-With", "XMLHttpRequest");
            headers.set("Accept", "application/json, text/javascript, */*; q=0.01");

            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.GET,
                    entity,
                    String.class);

            String jsonResponse = response.getBody();
            return parseArrivalJsonWithDisplayId(jsonResponse);

        } catch (Exception e) {
            log.debug("Failed to fetch arrival info for station {}: {}", stationId, e.getMessage());
            return new ArrivalResult(new ArrayList<>(), null);
        }
    }

    /**
     * Station의 displayId 업데이트
     */
    @Transactional
    public void updateStationDisplayId(Station station, String displayId) {
        station.setDisplayId(displayId);
        stationRepository.save(station);
        log.info("Updated displayId for station {}: {}", station.getStationId(), displayId);
    }

    /**
     * 도착 정보 결과를 담는 내부 클래스
     */
    private static class ArrivalResult {
        List<BusArrivalResponse> arrivals;
        String displayId;

        ArrivalResult(List<BusArrivalResponse> arrivals, String displayId) {
            this.arrivals = arrivals;
            this.displayId = displayId;
        }
    }

    private List<BusArrivalResponse> parseArrivalJson(String json) {
        List<BusArrivalResponse> arrivals = new ArrayList<>();

        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode responseVO = root.path("ResponseVO");

            int code = responseVO.path("code").asInt();
            if (code != 0) {
                log.warn("API returned error code: {}, message: {}", code, responseVO.path("message").asText());
                return arrivals;
            }

            JsonNode resultList = responseVO.path("data").path("resultList");
            if (!resultList.isArray()) {
                return arrivals;
            }

            for (JsonNode item : resultList) {
                String routeId = String.valueOf(item.path("rtid").asLong());
                String routeName = item.path("rtnum").asText();

                // 우리 DB에 있는 노선인지 확인하고 기후동행카드 적용 여부 체크
                Boolean climateEligible = "1".equals(item.path("clmtcardUse").asText());

                // DB의 노선 정보로 다시 확인
                Optional<Route> route = routeRepository.findById(routeId);
                if (route.isPresent()) {
                    climateEligible = route.get().isClimateCardEligible();
                }

                // 도착 정보 파싱
                String arrmsg1 = item.path("wavgs1").asText("");
                String arrmsg2 = item.path("wavgs2").asText("");
                Integer traTime1 = item.path("wavgs11").asInt(0);
                Integer traTime2 = item.path("wavgs22").asInt(0);
                String statnm1 = item.path("wstatnm1").asText("");
                String statnm2 = item.path("wstatnm2").asText("");

                BusArrivalResponse arrival = BusArrivalResponse.builder()
                        .routeId(routeId)
                        .routeName(routeName)
                        .stationSeq(String.valueOf(item.path("ord").asInt()))
                        .arrmsg1(arrmsg1.isEmpty() ? statnm1 : arrmsg1)
                        .arrmsg2(arrmsg2.isEmpty() ? statnm2 : arrmsg2)
                        .traTime1(traTime1 > 0 ? traTime1 : null)
                        .traTime2(traTime2 > 0 ? traTime2 : null)
                        .staOrd(item.path("ord").asInt())
                        .isLast1(item.path("wstat1").asText())
                        .isLast2(item.path("wstat2").asText())
                        .busType(String.valueOf(item.path("rttp").asInt()))
                        .climateCardEligible(climateEligible)
                        .build();

                arrivals.add(arrival);
            }

        } catch (Exception e) {
            log.error("Failed to parse arrival JSON: {}", e.getMessage(), e);
        }

        return arrivals;
    }

    /**
     * 도착 정보와 displayId(stnuid) 함께 파싱
     */
    private ArrivalResult parseArrivalJsonWithDisplayId(String json) {
        List<BusArrivalResponse> arrivals = new ArrayList<>();
        String displayId = null;

        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode responseVO = root.path("ResponseVO");

            int code = responseVO.path("code").asInt();
            if (code != 0) {
                log.warn("API returned error code: {}, message: {}", code, responseVO.path("message").asText());
                return new ArrivalResult(arrivals, null);
            }

            JsonNode resultList = responseVO.path("data").path("resultList");
            if (!resultList.isArray() || resultList.isEmpty()) {
                return new ArrivalResult(arrivals, null);
            }

            // 첫 번째 결과에서 stnuid (displayId) 추출
            JsonNode firstItem = resultList.get(0);
            displayId = firstItem.path("stnuid").asText(null);

            for (JsonNode item : resultList) {
                String routeId = String.valueOf(item.path("rtid").asLong());
                String routeName = item.path("rtnum").asText();

                Boolean climateEligible = "1".equals(item.path("clmtcardUse").asText());

                Optional<Route> route = routeRepository.findById(routeId);
                if (route.isPresent()) {
                    climateEligible = route.get().isClimateCardEligible();
                }

                String arrmsg1 = item.path("wavgs1").asText("");
                String arrmsg2 = item.path("wavgs2").asText("");
                Integer traTime1 = item.path("wavgs11").asInt(0);
                Integer traTime2 = item.path("wavgs22").asInt(0);
                String statnm1 = item.path("wstatnm1").asText("");
                String statnm2 = item.path("wstatnm2").asText("");

                BusArrivalResponse arrival = BusArrivalResponse.builder()
                        .routeId(routeId)
                        .routeName(routeName)
                        .stationSeq(String.valueOf(item.path("ord").asInt()))
                        .arrmsg1(arrmsg1.isEmpty() ? statnm1 : arrmsg1)
                        .arrmsg2(arrmsg2.isEmpty() ? statnm2 : arrmsg2)
                        .traTime1(traTime1 > 0 ? traTime1 : null)
                        .traTime2(traTime2 > 0 ? traTime2 : null)
                        .staOrd(item.path("ord").asInt())
                        .isLast1(item.path("wstat1").asText())
                        .isLast2(item.path("wstat2").asText())
                        .busType(String.valueOf(item.path("rttp").asInt()))
                        .climateCardEligible(climateEligible)
                        .build();

                arrivals.add(arrival);
            }

        } catch (Exception e) {
            log.error("Failed to parse arrival JSON: {}", e.getMessage(), e);
        }

        return new ArrivalResult(arrivals, displayId);
    }
}
