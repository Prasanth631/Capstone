package com.devops.platform.service;

import com.devops.platform.dto.PipelineStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardSyncService {

    private final MetricsService metricsService;
    private final PipelineService pipelineService;
    private final FirestoreService firestoreService;

    /**
     * Periodic full-dashboard refresh: pushes infra telemetry AND pipeline/build
     * data into the {@code dashboard/overview} Firestore document so the
     * frontend always has fresh data regardless of whether webhook events
     * are flowing.
     */
    @Scheduled(fixedRateString = "${dashboard.metrics-refresh-ms:5000}")
    public void syncDashboardData() {
        if (!firestoreService.isAvailable()) {
            return;
        }

        try {
            long now = Instant.now().toEpochMilli();
            Map<String, Object> dashboardData = new HashMap<>();

            // Infra telemetry
            dashboardData.put("metrics", metricsService.getSystemMetrics());
            dashboardData.put("dockerStatus", metricsService.getDockerStatus());
            dashboardData.put("k8sStatus", metricsService.getKubernetesStatus());

            // Build / pipeline data — ensures dashboard is populated even when
            // no webhook events have fired (e.g. after a backfill or cold start).
            dashboardData.put("buildAnalytics", pipelineService.getBuildAnalytics());
            dashboardData.put("testResults", pipelineService.getLatestTestResults());

            List<PipelineStatus> recentBuilds = pipelineService.getRecentBuilds(20);
            dashboardData.put("recentBuilds", recentBuilds);

            dashboardData.put("pipelines", pipelineService.getAllActivePipelines());

            dashboardData.put("metricsLastUpdated", now);
            dashboardData.put("pipelineLastUpdated", now);
            dashboardData.put("lastUpdated", now);

            firestoreService.mergeDashboardOverview(dashboardData);
            log.debug("Successfully refreshed full dashboard projection");
        } catch (Exception e) {
            log.error("Error syncing dashboard data to Firestore", e);
        }
    }
}
