package com.devops.platform.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;

@DisplayName("MetricsService Unit Tests")
class MetricsServiceTest {

    private MetricsService metricsService;

    @BeforeEach
    void setUp() {
        metricsService = new MetricsService();
    }

    @Test
    @DisplayName("getSystemMetrics should return all expected keys")
    void getSystemMetricsShouldReturnAllKeys() {
        Map<String, Object> metrics = metricsService.getSystemMetrics();

        assertThat(metrics).isNotNull();
        assertThat(metrics).containsKeys(
                "cpuUsage",
                "availableProcessors",
                "jvmHeapUsed",
                "jvmHeapMax",
                "jvmHeapUsagePercent",
                "jvmNonHeapUsed",
                "memoryUsed",
                "memoryTotal",
                "memoryUsagePercent",
                "threadCount",
                "peakThreadCount",
                "daemonThreadCount",
                "uptimeMs"
        );
    }

    @Test
    @DisplayName("CPU usage should be within valid range")
    void cpuUsageShouldBeValid() {
        Map<String, Object> metrics = metricsService.getSystemMetrics();
        double cpuUsage = (double) metrics.get("cpuUsage");
        assertThat(cpuUsage).isGreaterThanOrEqualTo(0.0);
    }

    @Test
    @DisplayName("available processors should be at least 1")
    void availableProcessorsShouldBePositive() {
        Map<String, Object> metrics = metricsService.getSystemMetrics();
        int processors = (int) metrics.get("availableProcessors");
        assertThat(processors).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("JVM heap used should be positive")
    void jvmHeapUsedShouldBePositive() {
        Map<String, Object> metrics = metricsService.getSystemMetrics();
        long heapUsed = (long) metrics.get("jvmHeapUsed");
        assertThat(heapUsed).isGreaterThan(0);
    }

    @Test
    @DisplayName("heap usage percent should be between 0 and 100")
    void heapUsagePercentShouldBeInRange() {
        Map<String, Object> metrics = metricsService.getSystemMetrics();
        double heapPercent = (double) metrics.get("jvmHeapUsagePercent");
        assertThat(heapPercent).isBetween(0.0, 100.0);
    }

    @Test
    @DisplayName("memory usage percent should be between 0 and 100")
    void memoryUsagePercentShouldBeInRange() {
        Map<String, Object> metrics = metricsService.getSystemMetrics();
        double memPercent = (double) metrics.get("memoryUsagePercent");
        assertThat(memPercent).isBetween(0.0, 100.0);
    }

    @Test
    @DisplayName("thread count should be positive")
    void threadCountShouldBePositive() {
        Map<String, Object> metrics = metricsService.getSystemMetrics();
        int threadCount = (int) metrics.get("threadCount");
        assertThat(threadCount).isGreaterThan(0);
    }

    @Test
    @DisplayName("uptime should be positive")
    void uptimeShouldBePositive() {
        Map<String, Object> metrics = metricsService.getSystemMetrics();
        long uptime = (long) metrics.get("uptimeMs");
        assertThat(uptime).isGreaterThan(0);
    }

    @Test
    @DisplayName("getDockerStatus should return containers key even when Docker is not running")
    void getDockerStatusShouldReturnContainersKey() {
        Map<String, Object> status = metricsService.getDockerStatus();
        assertThat(status).containsKey("containers");
    }

    @Test
    @DisplayName("getKubernetesStatus should return namespaces key even when kubectl is not available")
    void getKubernetesStatusShouldReturnNamespacesKey() {
        Map<String, Object> status = metricsService.getKubernetesStatus();
        assertThat(status).containsKey("namespaces");
    }
}
