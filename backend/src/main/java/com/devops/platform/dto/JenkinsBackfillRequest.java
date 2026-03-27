package com.devops.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JenkinsBackfillRequest {
    private Boolean allJobs;
    private Integer perJobLimit;
    private List<String> jobNames;
}
