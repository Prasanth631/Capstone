package com.devops.platform.controller;

import com.devops.platform.dto.ApiResponse;
import com.devops.platform.dto.JenkinsBackfillRequest;
import com.devops.platform.dto.JenkinsBackfillResponse;
import com.devops.platform.service.JenkinsBackfillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final JenkinsBackfillService jenkinsBackfillService;

    @PostMapping("/backfill/jenkins")
    public ResponseEntity<ApiResponse<JenkinsBackfillResponse>> triggerJenkinsBackfill(
            @RequestBody(required = false) JenkinsBackfillRequest request,
            @RequestParam(required = false) Boolean allJobs,
            @RequestParam(required = false) Integer perJobLimit,
            @RequestParam(required = false) List<String> jobNames) {

        JenkinsBackfillRequest effective = request != null ? request : new JenkinsBackfillRequest();
        if (allJobs != null) {
            effective.setAllJobs(allJobs);
        }
        if (perJobLimit != null) {
            effective.setPerJobLimit(perJobLimit);
        }
        if (jobNames != null && !jobNames.isEmpty()) {
            effective.setJobNames(jobNames);
        }

        JenkinsBackfillResponse response = jenkinsBackfillService.runBackfill(effective);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
