package com.devops.platform.service;


import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DashboardSyncService Unit Tests")
class DashboardSyncServiceTest {

    @Mock private MetricsService metricsService;
    @Mock private FirestoreService firestoreService;

    private DashboardSyncService dashboardSyncService;

    @BeforeEach
    void setUp() {
        dashboardSyncService = new DashboardSyncService(metricsService, firestoreService);
    }

    @Test
    @DisplayName("should skip sync when Firestore is null")
    void shouldSkipWhenFirestoreNull() {
        when(firestoreService.isAvailable()).thenReturn(false);
        assertThatCode(dashboardSyncService::syncDashboardData).doesNotThrowAnyException();
        verifyNoInteractions(metricsService);
        verify(firestoreService, never()).mergeDashboardOverview(anyMap());
    }

    @Test
    @DisplayName("should aggregate infra telemetry and merge dashboard doc")
    void shouldAggregateDataFromServices() {
        when(firestoreService.isAvailable()).thenReturn(true);
        when(metricsService.getSystemMetrics()).thenReturn(Map.of());
        when(metricsService.getDockerStatus()).thenReturn(Map.of());
        when(metricsService.getKubernetesStatus()).thenReturn(Map.of());

        assertThatCode(() -> dashboardSyncService.syncDashboardData())
                .doesNotThrowAnyException();

        verify(metricsService).getSystemMetrics();
        verify(metricsService).getDockerStatus();
        verify(metricsService).getKubernetesStatus();
        verify(firestoreService).mergeDashboardOverview(anyMap());
    }
}
