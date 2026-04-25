package com.devops.platform.service;


import com.devops.platform.dto.PipelineStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DashboardSyncService Unit Tests")
class DashboardSyncServiceTest {

    @Mock private MetricsService metricsService;
    @Mock private PipelineService pipelineService;
    @Mock private FirestoreService firestoreService;

    private DashboardSyncService dashboardSyncService;

    @BeforeEach
    void setUp() {
        dashboardSyncService = new DashboardSyncService(metricsService, pipelineService, firestoreService);
    }

    @Test
    @DisplayName("should skip sync when Firestore is null")
    void shouldSkipWhenFirestoreNull() {
        when(firestoreService.isAvailable()).thenReturn(false);
        assertThatCode(dashboardSyncService::syncDashboardData).doesNotThrowAnyException();
        verifyNoInteractions(metricsService);
        verifyNoInteractions(pipelineService);
        verify(firestoreService, never()).mergeDashboardOverview(anyMap());
    }

    @Test
    @DisplayName("should aggregate infra telemetry and build data then merge dashboard doc")
    void shouldAggregateDataFromServices() {
        when(firestoreService.isAvailable()).thenReturn(true);
        when(metricsService.getSystemMetrics()).thenReturn(Map.of());
        when(metricsService.getDockerStatus()).thenReturn(Map.of());
        when(metricsService.getKubernetesStatus()).thenReturn(Map.of());
        when(pipelineService.getBuildAnalytics()).thenReturn(Map.of("totalBuilds", 10L));
        when(pipelineService.getLatestTestResults()).thenReturn(Map.of("totalTests", 5));
        when(pipelineService.getRecentBuilds(20)).thenReturn(List.of());
        when(pipelineService.getAllActivePipelines()).thenReturn(List.of());

        assertThatCode(() -> dashboardSyncService.syncDashboardData())
                .doesNotThrowAnyException();

        verify(metricsService).getSystemMetrics();
        verify(metricsService).getDockerStatus();
        verify(metricsService).getKubernetesStatus();
        verify(pipelineService).getBuildAnalytics();
        verify(pipelineService).getLatestTestResults();
        verify(pipelineService).getRecentBuilds(20);
        verify(pipelineService).getAllActivePipelines();
        verify(firestoreService).mergeDashboardOverview(anyMap());
    }

    @Test
    @DisplayName("should include build analytics in merged data")
    void shouldIncludeBuildAnalyticsInMerge() {
        when(firestoreService.isAvailable()).thenReturn(true);
        when(metricsService.getSystemMetrics()).thenReturn(Map.of());
        when(metricsService.getDockerStatus()).thenReturn(Map.of());
        when(metricsService.getKubernetesStatus()).thenReturn(Map.of());

        Map<String, Object> analytics = Map.of("totalBuilds", 42L, "successRate", 85.0);
        when(pipelineService.getBuildAnalytics()).thenReturn(analytics);
        when(pipelineService.getLatestTestResults()).thenReturn(Map.of());
        when(pipelineService.getRecentBuilds(20)).thenReturn(List.of());
        when(pipelineService.getAllActivePipelines()).thenReturn(List.of());

        dashboardSyncService.syncDashboardData();

        verify(firestoreService).mergeDashboardOverview(argThat(data ->
                data.containsKey("buildAnalytics") &&
                data.containsKey("testResults") &&
                data.containsKey("recentBuilds") &&
                data.containsKey("pipelines") &&
                data.containsKey("pipelineLastUpdated")
        ));
    }
}
