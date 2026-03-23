package com.devops.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.lang.management.ThreadMXBean;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetricsService {

    public Map<String, Object> getSystemMetrics() {
        Map<String, Object> metrics = new HashMap<>();

        // CPU metrics
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        metrics.put("cpuUsage", osBean.getSystemLoadAverage());
        metrics.put("availableProcessors", osBean.getAvailableProcessors());

        // Memory metrics
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        long heapUsed = memoryBean.getHeapMemoryUsage().getUsed();
        long heapMax = memoryBean.getHeapMemoryUsage().getMax();
        long nonHeapUsed = memoryBean.getNonHeapMemoryUsage().getUsed();

        metrics.put("jvmHeapUsed", heapUsed);
        metrics.put("jvmHeapMax", heapMax);
        metrics.put("jvmHeapUsagePercent", heapMax > 0 ? (double) heapUsed / heapMax * 100 : 0);
        metrics.put("jvmNonHeapUsed", nonHeapUsed);

        // System memory
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        metrics.put("memoryUsed", usedMemory);
        metrics.put("memoryTotal", totalMemory);
        metrics.put("memoryUsagePercent", (double) usedMemory / totalMemory * 100);

        // Thread metrics
        ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
        metrics.put("threadCount", threadBean.getThreadCount());
        metrics.put("peakThreadCount", threadBean.getPeakThreadCount());
        metrics.put("daemonThreadCount", threadBean.getDaemonThreadCount());

        // JVM uptime
        metrics.put("uptimeMs", ManagementFactory.getRuntimeMXBean().getUptime());

        return metrics;
    }

    public Map<String, Object> getDockerStatus() {
        // Simulated Docker status — in production, this would call the Docker Engine API
        Map<String, Object> status = new HashMap<>();
        status.put("containers", Map.of(
            "running", 4,
            "total", 5,
            "details", new Map[]{
                Map.of("name", "devops-backend", "image", "devops-platform:latest",
                       "status", "running", "health", "healthy", "uptime", "2h 15m"),
                Map.of("name", "devops-frontend", "image", "devops-frontend:latest",
                       "status", "running", "health", "healthy", "uptime", "2h 15m"),
                Map.of("name", "postgres", "image", "postgres:15-alpine",
                       "status", "running", "health", "healthy", "uptime", "2h 16m"),
                Map.of("name", "prometheus", "image", "prom/prometheus:latest",
                       "status", "running", "health", "healthy", "uptime", "2h 14m"),
                Map.of("name", "grafana", "image", "grafana/grafana:latest",
                       "status", "stopped", "health", "N/A", "uptime", "N/A")
            }
        ));
        return status;
    }

    public Map<String, Object> getKubernetesStatus() {
        // Simulated K8s status — in production, this would call the Kubernetes API
        Map<String, Object> status = new HashMap<>();

        Map<String, Object> dev = Map.of(
            "namespace", "dev", "pods", Map.of("running", 2, "total", 2),
            "replicaHealth", "healthy", "lastRollout", "10 minutes ago");
        Map<String, Object> staging = Map.of(
            "namespace", "staging", "pods", Map.of("running", 2, "total", 2),
            "replicaHealth", "healthy", "lastRollout", "1 hour ago");
        Map<String, Object> production = Map.of(
            "namespace", "production", "pods", Map.of("running", 3, "total", 3),
            "replicaHealth", "healthy", "lastRollout", "3 hours ago",
            "hpa", Map.of("minReplicas", 2, "maxReplicas", 10, "currentReplicas", 3, "targetCpuUtilization", 60));

        status.put("namespaces", new Map[]{dev, staging, production});
        return status;
    }
}
