package com.devops.platform.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;

@DisplayName("SecurityScanService Unit Tests")
class SecurityScanServiceTest {

    @Nested
    @DisplayName("when Firestore is unavailable (null)")
    class WhenFirestoreUnavailable {

        private SecurityScanService service;

        @BeforeEach
        void setUp() {
            service = new SecurityScanService(null);
        }

        @Test
        @DisplayName("isAvailable should return false")
        void isAvailableShouldReturnFalse() {
            assertThat(service.isAvailable()).isFalse();
        }

        @Test
        @DisplayName("storeScanResult should not throw")
        void storeScanResultShouldNotThrow() {
            Map<String, Object> result = Map.of(
                    "image", "prasanth631/devops-platform:42",
                    "criticalCount", 0,
                    "highCount", 3
            );
            assertThatCode(() -> service.storeScanResult(result))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("getLatestScans should return empty list")
        void getLatestScansShouldReturnEmptyList() {
            assertThat(service.getLatestScans()).isEmpty();
        }

        @Test
        @DisplayName("getScanSummary should return a valid summary with zero counts")
        void getScanSummaryShouldReturnZeroCounts() {
            Map<String, Object> summary = service.getScanSummary();

            assertThat(summary).isNotNull();
            assertThat(summary).containsKeys(
                    "scans", "totalCritical", "totalHigh", "totalMedium",
                    "totalLow", "isClean", "scanCount", "generatedAt"
            );
            assertThat(summary.get("totalCritical")).isEqualTo(0);
            assertThat(summary.get("totalHigh")).isEqualTo(0);
            assertThat(summary.get("isClean")).isEqualTo(true);
            assertThat(summary.get("scanCount")).isEqualTo(0);
        }
    }
}
