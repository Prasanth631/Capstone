package com.devops.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PipelineStatus {

    private int buildNumber;
    private String jobName;
    private String overallStatus;   // SUCCESS, FAILURE, IN_PROGRESS
    private List<StageInfo> stages;
    private long startTime;
    private long endTime;
    private long totalDuration;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StageInfo {
        private String name;
        private String status;       // SUCCESS, FAILURE, IN_PROGRESS, PENDING
        private long duration;
        private int order;
        private Map<String, Object> details;
    }
}
