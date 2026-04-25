package com.devops.platform.controller;

import com.devops.platform.dto.ApiResponse;
import com.devops.platform.dto.PagedBuildResponse;
import com.devops.platform.dto.PipelineStatus;
import com.devops.platform.service.FirebaseTokenService;
import com.devops.platform.service.MetricsService;
import com.devops.platform.service.PipelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final PipelineService pipelineService;
    private final MetricsService metricsService;
    private final FirebaseTokenService firebaseTokenService;

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
        return ResponseEntity.ok(
                ApiResponse.ok(pipelineService.getLatestTestResults()));
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

    @GetMapping("/firebase-token")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFirebaseToken(Authentication authentication) {
        String principalName = resolvePrincipalName(authentication);
        Collection<? extends GrantedAuthority> authorities = resolveAuthorities(authentication);

        return firebaseTokenService
                .createDashboardToken(principalName, authorities)
                .<ResponseEntity<ApiResponse<Map<String, Object>>>>map(token -> ResponseEntity.ok(
                        ApiResponse.ok(Map.of(
                                "token", token,
                                "uid", principalName,
                                "issuedAt", Instant.now().toEpochMilli()
                        ))
                ))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(ApiResponse.error("Firebase realtime auth is not available")));
    }

    private String resolvePrincipalName(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return "guest-dashboard";
        }

        String principalName = authentication.getName();
        if (principalName == null || principalName.isBlank()) {
            return "guest-dashboard";
        }
        return principalName;
    }

    private Collection<? extends GrantedAuthority> resolveAuthorities(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return List.of();
        }
        return authentication.getAuthorities();
    }
}
