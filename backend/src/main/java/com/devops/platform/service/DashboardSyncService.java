package com.devops.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardSyncService {

    private final MetricsService metricsService;
    private final FirestoreService firestoreService;

    // Refresh infra/system telemetry only; pipeline state is pushed immediately by webhook events.
    @Scheduled(fixedRateString = "${dashboard.metrics-refresh-ms:5000}")
    public void syncDashboardData() {
        if (!firestoreService.isAvailable()) {
            return;
        }

        try {
            long now = Instant.now().toEpochMilli();
            Map<String, Object> dashboardData = new HashMap<>();
            dashboardData.put("metrics", metricsService.getSystemMetrics());
            dashboardData.put("dockerStatus", metricsService.getDockerStatus());
            dashboardData.put("k8sStatus", metricsService.getKubernetesStatus());
            dashboardData.put("metricsLastUpdated", now);
            dashboardData.put("lastUpdated", now);
            firestoreService.mergeDashboardOverview(dashboardData);
            log.debug("Successfully refreshed dashboard infra telemetry");
        } catch (Exception e) {
            log.error("Error syncing dashboard data to Firestore", e);
        }
    }
}
