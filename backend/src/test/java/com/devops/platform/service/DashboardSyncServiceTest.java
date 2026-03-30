package com.devops.platform.service;


import com.google.cloud.firestore.Firestore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DashboardSyncService Unit Tests")
class DashboardSyncServiceTest {

    @Mock private Firestore firestore;
    @Mock private PipelineService pipelineService;
    @Mock private MetricsService metricsService;

    private DashboardSyncService dashboardSyncService;

    @BeforeEach
    void setUp() {
        dashboardSyncService = new DashboardSyncService(firestore, pipelineService, metricsService);
    }

    @Test
    @DisplayName("should skip sync when Firestore is null")
    void shouldSkipWhenFirestoreNull() {
        DashboardSyncService nullService = new DashboardSyncService(null, pipelineService, metricsService);
        assertThatCode(nullService::syncDashboardData).doesNotThrowAnyException();

        // Should not call any downstream services when Firestore is null
        verifyNoInteractions(pipelineService);
        verifyNoInteractions(metricsService);
    }

    @Test
    @DisplayName("should aggregate data from pipeline and metrics services")
    void shouldAggregateDataFromServices() {
        // This test verifies that the sync method calls all necessary services
        // The actual Firestore write will fail in test (no real connection), 
        // but we verify the service interactions
        var pagedResponse = com.devops.platform.dto.PagedBuildResponse.builder()
                .builds(List.of())
                .nextCursor(null)
                .build();
        when(pipelineService.getPagedBuilds(20, null)).thenReturn(pagedResponse);
        when(pipelineService.getAllActivePipelines()).thenReturn(List.of());
        when(pipelineService.getBuildAnalytics()).thenReturn(Map.of());
        when(metricsService.getSystemMetrics()).thenReturn(Map.of());
        when(metricsService.getDockerStatus()).thenReturn(Map.of());
        when(metricsService.getKubernetesStatus()).thenReturn(Map.of());

        // The Firestore mock will fail on .collection(), but we catch the exception in the service
        assertThatCode(() -> dashboardSyncService.syncDashboardData())
                .doesNotThrowAnyException();

        verify(pipelineService).getPagedBuilds(20, null);
        verify(pipelineService).getAllActivePipelines();
        verify(pipelineService).getBuildAnalytics();
        verify(metricsService).getSystemMetrics();
        verify(metricsService).getDockerStatus();
        verify(metricsService).getKubernetesStatus();
    }
}
