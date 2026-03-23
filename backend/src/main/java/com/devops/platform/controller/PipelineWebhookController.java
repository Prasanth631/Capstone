package com.devops.platform.controller;

import com.devops.platform.dto.ApiResponse;
import com.devops.platform.dto.BuildEvent;
import com.devops.platform.service.PipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
public class PipelineWebhookController {

    private final PipelineService pipelineService;

    @PostMapping("/jenkins")
    public ResponseEntity<ApiResponse<String>> receiveJenkinsWebhook(
            @RequestBody BuildEvent event) {
        log.info("Received Jenkins webhook: job={}, build=#{}, stage={}, status={}",
                event.getJobName(), event.getBuildNumber(), event.getStage(), event.getStatus());

        pipelineService.processWebhook(event);

        return ResponseEntity.ok(
                ApiResponse.ok("Webhook processed successfully", "Build #" + event.getBuildNumber()));
    }
}
