package com.devops.platform.controller;

import com.devops.platform.dto.ApiResponse;
import com.devops.platform.dto.PagedBuildResponse;
import com.devops.platform.dto.PipelineStatus;
import com.devops.platform.service.MetricsService;
import com.devops.platform.service.PipelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final PipelineService pipelineService;
    private final MetricsService metricsService;

    @GetMapping("/builds")
    public ResponseEntity<ApiResponse<PagedBuildResponse>> getRecentBuilds(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String cursor) {
        return ResponseEntity.ok(
                ApiResponse.ok(pipelineService.getPagedBuilds(limit, cursor)));
    }

    @GetMapping("/pipeline-status")
    public ResponseEntity<ApiResponse<List<PipelineStatus>>> getPipelineStatus() {
        return ResponseEntity.ok(
                ApiResponse.ok(pipelineService.getAllActivePipelines()));
    }

    @GetMapping("/pipeline-status/{jobName}")
    public ResponseEntity<ApiResponse<PipelineStatus>> getPipelineStatusForJob(
            @PathVariable String jobName) {
        PipelineStatus status = pipelineService.getActivePipeline(jobName);
        if (status == null) {
            return ResponseEntity.ok(ApiResponse.ok("No active pipeline for job: " + jobName, null));
        }
        return ResponseEntity.ok(ApiResponse.ok(status));
    }

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemMetrics() {
        return ResponseEntity.ok(
                ApiResponse.ok(metricsService.getSystemMetrics()));
    }

    @GetMapping("/test-results")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTestResults() {
        // Real test results are pushed via webhook events and read via Firestore onSnapshot
        // This endpoint returns aggregate zeros — the frontend gets live data from Firestore
        Map<String, Object> summary = Map.of(
            "totalTests", 0,
            "passed", 0,
            "failed", 0,
            "skipped", 0,
            "passRate", 0.0,
            "lastRunTimestamp", 0
        );
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/docker-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDockerStatus() {
        return ResponseEntity.ok(
                ApiResponse.ok(metricsService.getDockerStatus()));
    }

    @GetMapping("/k8s-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getKubernetesStatus() {
        return ResponseEntity.ok(
                ApiResponse.ok(metricsService.getKubernetesStatus()));
    }

    @GetMapping("/build-analytics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBuildAnalytics() {
        return ResponseEntity.ok(
                ApiResponse.ok(pipelineService.getBuildAnalytics()));
    }
}
