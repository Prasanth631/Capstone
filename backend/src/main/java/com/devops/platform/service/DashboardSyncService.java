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
    private final PipelineService pipelineService;
    private final FirestoreService firestoreService;

    private long lastPipelineSyncTime = 0;
    private final Map<String, Object> cachedPipelineData = new HashMap<>();

    /** Consecutive Firestore failures – used as a circuit breaker. */
    private int consecutiveFailures = 0;
    /** After this many consecutive failures, pause syncing entirely. */
    private static final int MAX_CONSECUTIVE_FAILURES = 3;
    /** How long to wait before retrying after circuit opens (10 minutes). */
    private static final long CIRCUIT_OPEN_COOLDOWN_MS = 600_000;
    private long circuitOpenedAt = 0;

    /**
     * Periodic full-dashboard refresh: pushes infra telemetry AND pipeline/build
     * data into the {@code dashboard/overview} Firestore document so the
     * frontend always has fresh data regardless of whether webhook events
     * are flowing.
     */
    @Scheduled(fixedRateString = "${dashboard.metrics-refresh-ms:30000}")
    public void syncDashboardData() {
        if (!firestoreService.isAvailable()) {
            return;
        }

        // Circuit breaker: if we've hit too many consecutive Firestore failures,
        // stop trying for a while to avoid spamming quota-exhausted errors.
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            long elapsed = Instant.now().toEpochMilli() - circuitOpenedAt;
            if (elapsed < CIRCUIT_OPEN_COOLDOWN_MS) {
                // Still in cooldown, skip silently
                return;
            }
            // Cooldown expired, try again
            log.info("Dashboard sync circuit breaker: cooldown expired, retrying...");
            consecutiveFailures = 0;
        }

        try {
            long now = Instant.now().toEpochMilli();
            Map<String, Object> dashboardData = new HashMap<>();

            // Infra telemetry (cheap, local — always available)
            dashboardData.put("metrics", metricsService.getSystemMetrics());
            dashboardData.put("dockerStatus", metricsService.getDockerStatus());
            dashboardData.put("k8sStatus", metricsService.getKubernetesStatus());
            dashboardData.put("metricsLastUpdated", now);

            // Pipeline data (expensive, hits Firestore — rate limit to once every 5 minutes)
            if (now - lastPipelineSyncTime > 300_000 || cachedPipelineData.isEmpty()) {
                cachedPipelineData.put("buildAnalytics", pipelineService.getBuildAnalytics());
                cachedPipelineData.put("testResults", pipelineService.getLatestTestResults());
                cachedPipelineData.put("recentBuilds", pipelineService.getRecentBuilds(20));
                cachedPipelineData.put("pipelines", pipelineService.getAllActivePipelines());
                lastPipelineSyncTime = now;
            }

            dashboardData.putAll(cachedPipelineData);
            dashboardData.put("pipelineLastUpdated", lastPipelineSyncTime);
            dashboardData.put("lastUpdated", now);

            firestoreService.mergeDashboardOverview(dashboardData);
            consecutiveFailures = 0; // reset on success
            log.debug("Successfully refreshed full dashboard projection");
        } catch (Exception e) {
            consecutiveFailures++;
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                circuitOpenedAt = Instant.now().toEpochMilli();
                log.warn("Dashboard sync circuit breaker OPEN — pausing for {} minutes after {} consecutive failures: {}",
                        CIRCUIT_OPEN_COOLDOWN_MS / 60000, consecutiveFailures, e.getMessage());
            } else {
                log.error("Error syncing dashboard data to Firestore (failure {}/{})",
                        consecutiveFailures, MAX_CONSECUTIVE_FAILURES, e);
            }
        }
    }
}
