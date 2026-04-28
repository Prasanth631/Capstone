package com.devops.platform.controller;

import com.devops.platform.dto.ApiResponse;
import com.devops.platform.service.SecurityScanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/security")
@RequiredArgsConstructor
public class SecurityScanController {

    private final SecurityScanService securityScanService;

    /**
     * Receives Trivy scan results from the Jenkins pipeline.
     * Called by a notifyWebhook-style curl in the Jenkinsfile.
     */
    @PostMapping("/scan-result")
    public ResponseEntity<ApiResponse<String>> receiveScanResult(
            @RequestBody Map<String, Object> scanResult,
            @RequestHeader(value = "X-Jenkins-Webhook-Token", required = false) String token) {

        log.info("Received security scan result for image: {}", scanResult.get("image"));
        securityScanService.storeScanResult(scanResult);
        return ResponseEntity.ok(ApiResponse.ok("Scan result stored successfully"));
    }

    /**
     * Returns the latest scan summary for the dashboard.
     */
    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLatestScans() {
        return ResponseEntity.ok(ApiResponse.ok(securityScanService.getScanSummary()));
    }
}
