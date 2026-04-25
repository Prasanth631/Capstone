package com.devops.platform.controller;

import com.devops.platform.dto.PagedBuildResponse;
import com.devops.platform.dto.PipelineStatus;
import com.devops.platform.service.MetricsService;
import com.devops.platform.service.PipelineService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "dashboard-user", roles = {"USER"})
@DisplayName("MetricsController Integration Tests")
class MetricsControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private MetricsService metricsService;
    @MockitoBean private PipelineService pipelineService;

    @Test
    @DisplayName("GET /api/metrics/system - should return system metrics")
    void shouldReturnSystemMetrics() throws Exception {
        when(metricsService.getSystemMetrics()).thenReturn(Map.of(
                "cpuUsage", 0.45,
                "availableProcessors", 8,
                "jvmHeapUsed", 256000000L,
                "threadCount", 42
        ));

        mockMvc.perform(get("/api/metrics/system"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cpuUsage").value(0.45))
                .andExpect(jsonPath("$.data.availableProcessors").value(8));
    }

    @Test
    @DisplayName("GET /api/metrics/health - should return UP status")
    void shouldReturnHealthStatus() throws Exception {
        mockMvc.perform(get("/api/metrics/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.components.db.status").value("UP"))
                .andExpect(jsonPath("$.data.components.ping.status").value("UP"));
    }

    @Nested
    @DisplayName("Dashboard Endpoints")
    class DashboardEndpoints {

        @Test
        @DisplayName("GET /api/dashboard/builds - should return paged builds")
        void shouldReturnPagedBuilds() throws Exception {
            PipelineStatus build = PipelineStatus.builder()
                    .buildNumber(1).jobName("test-job").overallStatus("SUCCESS").build();
            PagedBuildResponse response = PagedBuildResponse.builder()
                    .builds(List.of(build)).nextCursor("next-abc").build();
            when(pipelineService.getPagedBuilds(anyInt(), any())).thenReturn(response);

            mockMvc.perform(get("/api/dashboard/builds").param("limit", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.builds").isArray())
                    .andExpect(jsonPath("$.data.builds[0].buildNumber").value(1));
        }

        @Test
        @DisplayName("GET /api/dashboard/pipeline-status - should return active pipelines")
        void shouldReturnActivePipelines() throws Exception {
            when(pipelineService.getAllActivePipelines()).thenReturn(List.of());

            mockMvc.perform(get("/api/dashboard/pipeline-status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("GET /api/dashboard/pipeline-status/{jobName} - should return specific pipeline")
        void shouldReturnSpecificPipeline() throws Exception {
            PipelineStatus status = PipelineStatus.builder()
                    .buildNumber(5).jobName("my-job").overallStatus("IN_PROGRESS").build();
            when(pipelineService.getActivePipeline("my-job")).thenReturn(status);

            mockMvc.perform(get("/api/dashboard/pipeline-status/my-job"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.buildNumber").value(5));
        }

        @Test
        @DisplayName("GET /api/dashboard/pipeline-status/{jobName} - should handle missing pipeline")
        void shouldHandleMissingPipeline() throws Exception {
            when(pipelineService.getActivePipeline("nonexistent")).thenReturn(null);

            mockMvc.perform(get("/api/dashboard/pipeline-status/nonexistent"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("No active pipeline for job: nonexistent"));
        }

        @Test
        @DisplayName("GET /api/dashboard/test-results - should return test results summary")
        void shouldReturnTestResults() throws Exception {
            when(pipelineService.getLatestTestResults()).thenReturn(Map.of("totalTests", 0, "passRate", 0.0));

            mockMvc.perform(get("/api/dashboard/test-results"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.totalTests").value(0))
                    .andExpect(jsonPath("$.data.passRate").value(0.0));
        }

        @Test
        @DisplayName("GET /api/dashboard/docker-status - should return docker status")
        void shouldReturnDockerStatus() throws Exception {
            when(metricsService.getDockerStatus()).thenReturn(Map.of("containers", Map.of("running", 3, "total", 5)));

            mockMvc.perform(get("/api/dashboard/docker-status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.containers.running").value(3));
        }

        @Test
        @DisplayName("GET /api/dashboard/k8s-status - should return kubernetes status")
        void shouldReturnK8sStatus() throws Exception {
            when(metricsService.getKubernetesStatus()).thenReturn(Map.of("namespaces", List.of()));

            mockMvc.perform(get("/api/dashboard/k8s-status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.namespaces").isArray());
        }

        @Test
        @DisplayName("GET /api/dashboard/build-analytics - should return build analytics")
        void shouldReturnBuildAnalytics() throws Exception {
            when(pipelineService.getBuildAnalytics()).thenReturn(Map.of(
                    "totalBuilds", 100L, "successRate", 95.0));

            mockMvc.perform(get("/api/dashboard/build-analytics"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.totalBuilds").value(100))
                    .andExpect(jsonPath("$.data.successRate").value(95.0));
        }
    }
}
