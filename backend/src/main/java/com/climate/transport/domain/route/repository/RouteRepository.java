package com.climate.transport.domain.route.repository;

import com.climate.transport.domain.route.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RouteRepository extends JpaRepository<Route, String> {
    Optional<Route> findByRouteName(String routeName);

    @Query("SELECT r FROM Route r WHERE r.routeName LIKE %:keyword% ORDER BY r.routeName")
    List<Route> searchByRouteName(@Param("keyword") String keyword);
}
