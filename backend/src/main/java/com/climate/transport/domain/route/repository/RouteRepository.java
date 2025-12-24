package com.climate.transport.domain.route.repository;

import com.climate.transport.domain.route.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 노선 데이터 저장소
 */
public interface RouteRepository extends JpaRepository<Route, String> {

    /**
     * 노선명으로 노선 조회
     */
    Optional<Route> findByRouteName(String routeName);

    /**
     * 노선명 키워드 검색
     */
    @Query("SELECT r FROM Route r WHERE r.routeName LIKE %:keyword% ORDER BY r.routeName")
    List<Route> searchByRouteName(@Param("keyword") String keyword);

    /**
     * 모든 노선의 기후동행카드 적용 여부를 false로 초기화
     * (Bulk Update - 성능 최적화)
     */
    @Modifying
    @Query("UPDATE Route r SET r.climateCardEligible = false")
    void resetAllClimateCardEligibility();
}
