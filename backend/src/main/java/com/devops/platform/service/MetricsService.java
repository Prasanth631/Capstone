package com.devops.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.ThreadMXBean;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetricsService {

    public Map<String, Object> getSystemMetrics() {
        Map<String, Object> metrics = new HashMap<>();

        // CPU metrics
        com.sun.management.OperatingSystemMXBean osBean = 
            (com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
        double load = osBean.getCpuLoad();
        metrics.put("cpuUsage", load >= 0 ? load : 0.0);
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
        Map<String, Object> status = new HashMap<>();
        List<Map<String, String>> containerDetails = new ArrayList<>();
        int running = 0;
        int total = 0;

        List<String> lines = executeCommand("docker", "ps", "-a", "--format", "{{.Names}}|{{.Image}}|{{.State}}|{{.Status}}");
        
        for (String line : lines) {
            String[] parts = line.split("\\|");
            if (parts.length >= 4) {
                total++;
                boolean isRunning = "running".equalsIgnoreCase(parts[2]);
                if (isRunning) running++;
                
                containerDetails.add(Map.of(
                    "name", parts[0],
                    "image", parts[1],
                    "status", parts[2],
                    "health", isRunning ? "healthy" : "N/A",
                    "uptime", parts[3]
                ));
            }
        }

        status.put("containers", Map.of(
            "running", running,
            "total", total,
            "details", containerDetails
        ));
        return status;
    }

    public Map<String, Object> getKubernetesStatus() {
        Map<String, Object> status = new HashMap<>();
        List<Map<String, Object>> namespacesData = new ArrayList<>();
        
        // Define the namespaces we care about
        String[] targetNamespaces = {"dev", "staging", "production"};
        
        for (String ns : targetNamespaces) {
            List<String> lines = executeCommand("kubectl", "get", "pods", "-n", ns, "--no-headers");
            int total = 0;
            int running = 0;
            String lastRollout = "N/A";
            
            for (String line : lines) {
                if (line.trim().isEmpty()) continue;
                total++;
                if (line.contains("Running")) {
                    running++;
                }
                // Just use the age of the first pod as a simplistic rollout time for the dashboard
                if (lastRollout.equals("N/A")) {
                    String[] parts = line.trim().split("\\s+");
                    if (parts.length >= 5) {
                        lastRollout = parts[4] + " ago";
                    }
                }
            }
            
            Map<String, Object> nsData = new HashMap<>();
            nsData.put("namespace", ns);
            nsData.put("pods", Map.of("running", running, "total", total));
            nsData.put("replicaHealth", total > 0 && running == total ? "healthy" : (total > 0 ? "degraded" : "unknown"));
            nsData.put("lastRollout", lastRollout);
            
            namespacesData.add(nsData);
        }

        status.put("namespaces", namespacesData);
        return status;
    }

    private List<String> executeCommand(String... command) {
        try {
            Process process = new ProcessBuilder(command).start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                return reader.lines().toList();
            }
        } catch (Exception e) {
            log.error("Failed to execute external command", e);
            return Collections.emptyList();
        }
    }
}
