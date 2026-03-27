package com.devops.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JenkinsBackfillResponse {
    private boolean success;
    private String message;
    private int jobsProcessed;
    private int buildsProcessed;
    private int perJobLimit;
}
