package com.devops.platform.service;

import com.devops.platform.config.JenkinsProperties;
import com.devops.platform.dto.BuildEvent;
import com.devops.platform.dto.PagedBuildResponse;
import com.devops.platform.dto.PipelineStatus;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PipelineService Unit Tests")
class PipelineServiceTest {

    @Mock private FirestoreService firestoreService;
    @Mock private Counter buildTotalCounter;
    @Mock private Timer buildDurationTimer;

    private JenkinsProperties jenkinsProperties;
    private PipelineService pipelineService;

    @BeforeEach
    void setUp() {
        jenkinsProperties = new JenkinsProperties();
        jenkinsProperties.setBaseUrl("http://localhost:8080");
        pipelineService = new PipelineService(firestoreService, jenkinsProperties, buildTotalCounter, buildDurationTimer);
    }

    private BuildEvent buildEvent(String stage, String status, int buildNumber) {
        return BuildEvent.builder()
                .buildNumber(buildNumber)
                .jobName("devops-platform")
                .stage(stage)
                .status(status)
                .duration(1500L)
                .gitBranch("main")
                .gitCommit("abc123")
                .triggerType("push")
                .timestamp(System.currentTimeMillis())
                .build();
    }

    @Nested
    @DisplayName("processWebhook")
    class ProcessWebhook {

        @Test
        @DisplayName("should increment build counter on each webhook")
        void shouldIncrementBuildCounter() {
            BuildEvent event = buildEvent("Checkout", "SUCCESS", 1);
            pipelineService.processWebhook(event);

            verify(buildTotalCounter).increment();
        }

        @Test
        @DisplayName("should record duration when positive")
        void shouldRecordDurationWhenPositive() {
            BuildEvent event = buildEvent("Build", "SUCCESS", 2);
            event.setDuration(5000L);
            pipelineService.processWebhook(event);

            verify(buildDurationTimer).record(eq(5000L), any());
        }

        @Test
        @DisplayName("should not record duration when zero")
        void shouldNotRecordDurationWhenZero() {
            BuildEvent event = buildEvent("Build", "SUCCESS", 3);
            event.setDuration(0L);
            pipelineService.processWebhook(event);

            verify(buildDurationTimer, never()).record(anyLong(), any());
        }

        @Test
        @DisplayName("should persist build summary to Firestore")
        void shouldPersistBuildSummary() {
            BuildEvent event = buildEvent("Build", "SUCCESS", 4);
            pipelineService.processWebhook(event);

            verify(firestoreService).upsertBuildSummary(any(PipelineStatus.class), eq("abc123"), eq("webhook"), any());
            verify(firestoreService).appendBuildEvent(event);
        }

        @Test
        @DisplayName("should set overall status to FAILURE on failure event")
        void shouldSetFailureStatus() {
            BuildEvent event = buildEvent("Build", "FAILURE", 5);
            pipelineService.processWebhook(event);

            verify(firestoreService).upsertBuildSummary(
                    argThat(status -> "FAILURE".equals(status.getOverallStatus())),
                    anyString(), eq("webhook"), any());
        }

        @Test
        @DisplayName("should set overall status to SUCCESS on production deploy success")
        void shouldSetSuccessOnProductionDeploy() {
            // First, process a checkout to start the pipeline
            pipelineService.processWebhook(buildEvent("Checkout", "SUCCESS", 6));
            // Then production deploy success
            pipelineService.processWebhook(buildEvent("Deploy to Production", "SUCCESS", 6));

            verify(firestoreService, atLeastOnce()).upsertBuildSummary(
                    argThat(status -> "SUCCESS".equals(status.getOverallStatus())),
                    anyString(), eq("webhook"), any());
        }

        @Test
        @DisplayName("should keep IN_PROGRESS for intermediate stages")
        void shouldKeepInProgressForIntermediateStages() {
            BuildEvent event = buildEvent("Build", "SUCCESS", 7);
            pipelineService.processWebhook(event);

            verify(firestoreService).upsertBuildSummary(
                    argThat(status -> "IN_PROGRESS".equals(status.getOverallStatus())),
                    anyString(), eq("webhook"), any());
        }

        @Test
        @DisplayName("should construct Jenkins URL from base URL")
        void shouldConstructJenkinsUrl() {
            BuildEvent event = buildEvent("Build", "SUCCESS", 8);
            pipelineService.processWebhook(event);

            verify(firestoreService).upsertBuildSummary(
                    argThat(status -> status.getJenkinsUrl() != null && status.getJenkinsUrl().contains("8")),
                    anyString(), eq("webhook"), any());
        }

        @Test
        @DisplayName("should write deployment on deploy stages")
        void shouldWriteDeploymentOnDeployStage() {
            BuildEvent event = buildEvent("Deploy to Dev", "SUCCESS", 9);
            pipelineService.processWebhook(event);

            verify(firestoreService).writeDeployment(eq("dev"), eq(9), eq("SUCCESS"), any());
        }

        @Test
        @DisplayName("should extract production namespace correctly")
        void shouldExtractProductionNamespace() {
            BuildEvent event = buildEvent("Deploy to Production", "SUCCESS", 10);
            pipelineService.processWebhook(event);

            verify(firestoreService).writeDeployment(eq("production"), eq(10), eq("SUCCESS"), any());
        }

        @Test
        @DisplayName("should extract staging namespace correctly")
        void shouldExtractStagingNamespace() {
            BuildEvent event = buildEvent("Deploy to Staging", "SUCCESS", 11);
            pipelineService.processWebhook(event);

            verify(firestoreService).writeDeployment(eq("staging"), eq(11), eq("SUCCESS"), any());
        }

        @Test
        @DisplayName("should handle custom/unexpected stage names gracefully")
        void shouldHandleCustomStageNames() {
            BuildEvent event = buildEvent("Custom Security Scan", "SUCCESS", 12);
            pipelineService.processWebhook(event);

            verify(firestoreService).upsertBuildSummary(
                    argThat(status -> status.getStages().stream()
                            .anyMatch(s -> "Custom Security Scan".equals(s.getName()))),
                    anyString(), eq("webhook"), any());
        }

        @Test
        @DisplayName("should handle ABORTED status as FAILURE")
        void shouldHandleAbortedAsFailure() {
            BuildEvent event = buildEvent("Build", "ABORTED", 13);
            pipelineService.processWebhook(event);

            verify(firestoreService).upsertBuildSummary(
                    argThat(status -> "FAILURE".equals(status.getOverallStatus())),
                    anyString(), eq("webhook"), any());
        }
    }

    @Nested
    @DisplayName("getActivePipeline")
    class GetActivePipeline {

        @Test
        @DisplayName("should delegate to Firestore when available")
        void shouldDelegateToFirestore() {
            when(firestoreService.isAvailable()).thenReturn(true);
            PipelineStatus expected = PipelineStatus.builder()
                    .jobName("devops-platform").buildNumber(5).build();
            when(firestoreService.getActivePipelines(200)).thenReturn(List.of(expected));

            PipelineStatus result = pipelineService.getActivePipeline("devops-platform");
            assertThat(result).isNotNull();
            assertThat(result.getBuildNumber()).isEqualTo(5);
        }

        @Test
        @DisplayName("should return null when no active pipeline found")
        void shouldReturnNullWhenNotFound() {
            when(firestoreService.isAvailable()).thenReturn(true);
            when(firestoreService.getActivePipelines(200)).thenReturn(List.of());

            PipelineStatus result = pipelineService.getActivePipeline("nonexistent-job");
            assertThat(result).isNull();
        }

        @Test
        @DisplayName("should fall back to in-memory when Firestore unavailable")
        void shouldFallBackToInMemory() {
            when(firestoreService.isAvailable()).thenReturn(false);

            PipelineStatus result = pipelineService.getActivePipeline("devops-platform");
            assertThat(result).isNull();
        }
    }

    @Nested
    @DisplayName("getAllActivePipelines")
    class GetAllActivePipelines {

        @Test
        @DisplayName("should return Firestore pipelines when available")
        void shouldReturnFirestorePipelines() {
            when(firestoreService.isAvailable()).thenReturn(true);
            List<PipelineStatus> expected = List.of(
                    PipelineStatus.builder().jobName("job1").buildNumber(1).build()
            );
            when(firestoreService.getActivePipelines(200)).thenReturn(expected);

            List<PipelineStatus> result = pipelineService.getAllActivePipelines();
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("should return empty list when Firestore unavailable and no in-memory state")
        void shouldReturnEmptyWhenFirestoreUnavailable() {
            when(firestoreService.isAvailable()).thenReturn(false);

            List<PipelineStatus> result = pipelineService.getAllActivePipelines();
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getPagedBuilds")
    class GetPagedBuilds {

        @Test
        @DisplayName("should delegate to Firestore when available")
        void shouldDelegateToFirestore() {
            when(firestoreService.isAvailable()).thenReturn(true);
            PagedBuildResponse expected = PagedBuildResponse.builder()
                    .builds(List.of()).nextCursor("abc").build();
            when(firestoreService.getPagedBuilds(20, null)).thenReturn(expected);

            PagedBuildResponse result = pipelineService.getPagedBuilds(20, null);
            assertThat(result.getNextCursor()).isEqualTo("abc");
        }

        @Test
        @DisplayName("should return in-memory fallback when Firestore unavailable")
        void shouldReturnInMemoryFallback() {
            when(firestoreService.isAvailable()).thenReturn(false);

            PagedBuildResponse result = pipelineService.getPagedBuilds(10, null);
            assertThat(result).isNotNull();
            assertThat(result.getBuilds()).isEmpty();
            assertThat(result.getNextCursor()).isNull();
        }
    }

    @Nested
    @DisplayName("getBuildAnalytics")
    class GetBuildAnalytics {

        @Test
        @DisplayName("should delegate to Firestore when available")
        void shouldDelegateToFirestore() {
            when(firestoreService.isAvailable()).thenReturn(true);
            Map<String, Object> expected = Map.of("totalBuilds", 100L, "successRate", 95.0);
            when(firestoreService.getBuildAnalytics(1000)).thenReturn(expected);

            Map<String, Object> result = pipelineService.getBuildAnalytics();
            assertThat(result).containsEntry("totalBuilds", 100L);
        }

        @Test
        @DisplayName("should compute in-memory analytics when Firestore unavailable")
        void shouldComputeInMemoryAnalytics() {
            when(firestoreService.isAvailable()).thenReturn(false);

            Map<String, Object> result = pipelineService.getBuildAnalytics();
            assertThat(result).containsKeys("totalBuilds", "successCount", "failureCount",
                    "successRate", "avgDurationMs");
        }
    }

    @Nested
    @DisplayName("getRecentBuilds")
    class GetRecentBuilds {

        @Test
        @DisplayName("should return recent builds with correct limit")
        void shouldReturnRecentBuilds() {
            when(firestoreService.isAvailable()).thenReturn(true);
            PagedBuildResponse expected = PagedBuildResponse.builder()
                    .builds(List.of(PipelineStatus.builder().buildNumber(1).build()))
                    .build();
            when(firestoreService.getPagedBuilds(5, null)).thenReturn(expected);

            List<PipelineStatus> result = pipelineService.getRecentBuilds(5);
            assertThat(result).hasSize(1);
        }
    }
}
