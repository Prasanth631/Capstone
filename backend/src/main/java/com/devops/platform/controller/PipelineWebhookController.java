package com.devops.platform.controller;

import com.devops.platform.dto.ApiResponse;
import com.devops.platform.dto.BuildEvent;
import com.devops.platform.config.JenkinsProperties;
import com.devops.platform.service.PipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
public class PipelineWebhookController {

    private final PipelineService pipelineService;
    private final JenkinsProperties jenkinsProperties;

    @PostMapping("/jenkins")
    public ResponseEntity<ApiResponse<String>> receiveJenkinsWebhook(
            @RequestHeader(value = "X-Jenkins-Webhook-Token", required = false) String webhookToken,
            @RequestBody BuildEvent event) {
        if (!isWebhookAuthorized(webhookToken)) {
            log.warn("Rejected unsigned/invalid Jenkins webhook for job={} build=#{}",
                    event.getJobName(), event.getBuildNumber());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid webhook signature"));
        }

        log.info("Received Jenkins webhook: job={}, build=#{}, stage={}, status={}",
                event.getJobName(), event.getBuildNumber(), event.getStage(), event.getStatus());

        pipelineService.processWebhook(event);

        return ResponseEntity.ok(
                ApiResponse.ok("Webhook processed successfully", "Build #" + event.getBuildNumber()));
    }

    private boolean isWebhookAuthorized(String webhookToken) {
        String configuredSecret = jenkinsProperties.getWebhookSecret();

        // Dev mode: no secret configured on the backend → accept any webhook
        if (configuredSecret == null || configuredSecret.isBlank()) {
            log.warn("Accepting webhook without auth - JENKINS_WEBHOOK_SECRET is not configured. "
                    + "Set jenkins.webhook-secret for production use.");
            return true;
        }

        // Secret configured but no token provided by caller
        if (webhookToken == null || webhookToken.isBlank()) {
            return false;
        }

        return MessageDigest.isEqual(
                webhookToken.getBytes(StandardCharsets.UTF_8),
                configuredSecret.getBytes(StandardCharsets.UTF_8)
        );
    }
}
