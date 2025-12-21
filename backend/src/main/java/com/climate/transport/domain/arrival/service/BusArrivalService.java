package com.climate.transport.domain.arrival.service;

import com.climate.transport.domain.arrival.dto.BusArrivalResponse;
import com.climate.transport.domain.route.entity.Route;
import com.climate.transport.domain.route.repository.RouteRepository;
import com.climate.transport.domain.station.entity.Station;
import com.climate.transport.domain.station.repository.StationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusArrivalService {

    private final StationRepository stationRepository;
    private final RouteRepository routeRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${public-api.service-key}")
    private String publicApiKey;

    @Value("${seoul-api.service-key}")
    private String seoulApiKey;

    // 서울시 버스 도착 정보 조회 API
    private static final String ARRIVAL_API_URL = "http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRouteAll";

    public List<BusArrivalResponse> getArrivalInfo(String stationId) {
        // 정류소 정보 조회
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> new IllegalArgumentException("Station not found: " + stationId));

        String mobileNumber = station.getMobileNumber();
        if (mobileNumber == null || mobileNumber.isEmpty()) {
            log.warn("Station {} has no mobile number", stationId);
            return new ArrayList<>();
        }

        try {
            // 서울시 정류소별 버스 도착 정보 조회 API
            // arsId (고유번호)로 조회
            String url = String.format("http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?serviceKey=%s&arsId=%s&resultType=xml",
                    seoulApiKey, mobileNumber);

            log.info("Fetching arrival info from Seoul API for station: {} (arsId: {})", stationId, mobileNumber);
            String xmlResponse = restTemplate.getForObject(url, String.class);

            // XML 파싱
            return parseArrivalXml(xmlResponse);

        } catch (Exception e) {
            log.error("Failed to fetch arrival info for station {} (arsId: {}): {}",
                    stationId, mobileNumber, e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<BusArrivalResponse> parseArrivalXml(String xml) {
        List<BusArrivalResponse> arrivals = new ArrayList<>();

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new ByteArrayInputStream(xml.getBytes("UTF-8")));

            // 에러 체크
            NodeList headerCdList = doc.getElementsByTagName("headerCd");
            if (headerCdList.getLength() > 0) {
                String headerCd = headerCdList.item(0).getTextContent();
                if (!"0".equals(headerCd)) {
                    log.warn("API returned error code: {}", headerCd);
                    return arrivals;
                }
            }

            // itemList 파싱
            NodeList itemList = doc.getElementsByTagName("itemList");

            for (int i = 0; i < itemList.getLength(); i++) {
                Element item = (Element) itemList.item(i);

                String routeId = getElementText(item, "busRouteId");
                String routeName = getElementText(item, "rtNm");

                // 우리 DB에 있는 노선인지 확인하고 기후동행카드 적용 여부 체크
                Boolean climateEligible = false;
                Optional<Route> route = routeRepository.findById(routeId);
                if (route.isPresent()) {
                    climateEligible = route.get().isClimateCardEligible();
                }

                BusArrivalResponse arrival = BusArrivalResponse.builder()
                        .routeId(routeId)
                        .routeName(routeName)
                        .stationSeq(getElementText(item, "staOrd"))
                        .arrmsg1(getElementText(item, "arrmsg1"))
                        .arrmsg2(getElementText(item, "arrmsg2"))
                        .traTime1(getElementInt(item, "traTime1"))
                        .traTime2(getElementInt(item, "traTime2"))
                        .staOrd(getElementInt(item, "staOrd"))
                        .isLast1(getElementText(item, "isLast1"))
                        .isLast2(getElementText(item, "isLast2"))
                        .busType(getElementText(item, "busType"))
                        .climateCardEligible(climateEligible)
                        .build();

                arrivals.add(arrival);
            }

        } catch (Exception e) {
            log.error("Failed to parse arrival XML: {}", e.getMessage());
        }

        return arrivals;
    }

    private String getElementText(Element parent, String tagName) {
        try {
            NodeList nodeList = parent.getElementsByTagName(tagName);
            if (nodeList.getLength() > 0) {
                return nodeList.item(0).getTextContent();
            }
        } catch (Exception e) {
            log.debug("Failed to get element {}: {}", tagName, e.getMessage());
        }
        return "";
    }

    private Integer getElementInt(Element parent, String tagName) {
        try {
            String text = getElementText(parent, tagName);
            if (!text.isEmpty()) {
                return Integer.parseInt(text);
            }
        } catch (Exception e) {
            log.debug("Failed to parse int for {}: {}", tagName, e.getMessage());
        }
        return null;
    }
}
