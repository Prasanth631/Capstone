package com.devops.platform.service;

import com.devops.platform.dto.BuildEvent;
import com.devops.platform.dto.PipelineStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;

@DisplayName("FirestoreService Unit Tests")
class FirestoreServiceTest {

    @Nested
    @DisplayName("when Firestore is unavailable (null)")
    class FirestoreUnavailable {

        private FirestoreService firestoreService;

        @BeforeEach
        void setUp() {
            firestoreService = new FirestoreService(null);
        }

        @Test
        @DisplayName("isAvailable should return false")
        void isAvailableShouldReturnFalse() {
            assertThat(firestoreService.isAvailable()).isFalse();
        }

        @Test
        @DisplayName("appendBuildEvent should not throw")
        void appendBuildEventShouldNotThrow() {
            BuildEvent event = BuildEvent.builder()
                    .buildNumber(1).jobName("test").stage("Build").status("SUCCESS").build();
            assertThatCode(() -> firestoreService.appendBuildEvent(event, 1))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("upsertBuildSummary should not throw")
        void upsertBuildSummaryShouldNotThrow() {
            PipelineStatus status = PipelineStatus.builder()
                    .buildNumber(1).jobName("test").overallStatus("SUCCESS").build();
            assertThatCode(() -> firestoreService.upsertBuildSummary(status, "abc123", "webhook"))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("getActivePipelines should return empty list")
        void getActivePipelinesShouldReturnEmptyList() {
            assertThat(firestoreService.getActivePipelines(10)).isEmpty();
        }

        @Test
        @DisplayName("getPagedBuilds should return empty response")
        void getPagedBuildsShouldReturnEmptyResponse() {
            var result = firestoreService.getPagedBuilds(10, null);
            assertThat(result).isNotNull();
            assertThat(result.getBuilds()).isEmpty();
        }

        @Test
        @DisplayName("getBuildAnalytics should return default analytics when Firestore is null")
        void getBuildAnalyticsShouldReturnDefaultAnalytics() {
            var result = firestoreService.getBuildAnalytics(100);
            assertThat(result).isNotEmpty();
            assertThat(result).containsKeys("totalBuilds", "successCount", "failureCount",
                    "successRate", "avgDurationMs");
            assertThat(result.get("totalBuilds")).isEqualTo(0L);
        }

        @Test
        @DisplayName("getDashboardOverview should return null")
        void getDashboardOverviewShouldReturnNull() {
            assertThat(firestoreService.getDashboardOverview()).isNull();
        }

        @Test
        @DisplayName("getBackfillState should return null")
        void getBackfillStateShouldReturnNull() {
            assertThat(firestoreService.getBackfillState()).isNull();
        }

        @Test
        @DisplayName("writeBackfillState should not throw")
        void writeBackfillStateShouldNotThrow() {
            assertThatCode(() -> firestoreService.writeBackfillState(Map.of("key", "value")))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("writeDeployment should not throw")
        void writeDeploymentShouldNotThrow() {
            assertThatCode(() -> firestoreService.writeDeployment("dev", 1, "SUCCESS", null))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("upsertBackfillBuild should not throw")
        void upsertBackfillBuildShouldNotThrow() {
            assertThatCode(() -> firestoreService.upsertBackfillBuild(
                    "job", 1, "SUCCESS", System.currentTimeMillis(), 1000L, null, null))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("mergeDashboardOverview should not throw")
        void mergeDashboardOverviewShouldNotThrow() {
            assertThatCode(() -> firestoreService.mergeDashboardOverview(Map.of("lastUpdated", System.currentTimeMillis())))
                    .doesNotThrowAnyException();
        }
    }
}
