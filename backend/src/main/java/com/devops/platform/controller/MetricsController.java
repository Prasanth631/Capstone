package com.devops.platform.controller;

import com.devops.platform.dto.ApiResponse;
import com.devops.platform.service.MetricsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
public class MetricsController {

    private final MetricsService metricsService;

    @GetMapping("/system")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemMetrics() {
        return ResponseEntity.ok(
                ApiResponse.ok(metricsService.getSystemMetrics()));
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHealth() {
        Map<String, Object> health = Map.of(
            "status", "UP",
            "components", Map.of(
                "db", Map.of("status", "UP"),
                "diskSpace", Map.of("status", "UP"),
                "ping", Map.of("status", "UP")
            )
        );
        return ResponseEntity.ok(ApiResponse.ok(health));
    }
}
