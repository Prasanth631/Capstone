package com.devops.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuildEvent {

    private int buildNumber;
    private String jobName;
    private String stage;
    private String status;         // SUCCESS, FAILURE, IN_PROGRESS, ABORTED
    private long duration;         // milliseconds
    private String gitBranch;
    private String gitCommit;
    private String triggerType;    // push, PR, manual
    private long timestamp;
    private Map<String, Object> testResults;
    private Map<String, Object> metadata;
}
