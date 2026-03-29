package com.devops.platform.service;

import com.devops.platform.config.JenkinsProperties;
import com.devops.platform.dto.BuildEvent;
import com.devops.platform.dto.PagedBuildResponse;
import com.devops.platform.dto.PipelineStatus;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineService {

    private final FirestoreService firestoreService;
    private final JenkinsProperties jenkinsProperties;
    private final Counter buildTotalCounter;
    private final Timer buildDurationTimer;

    @Value("${github.repo-url:https://github.com/Prasanth631/Capstone}")
    private String githubRepoUrl;

    // Transient in-memory state for active pipelines while webhook events are flowing
    private final Map<String, PipelineStatus> activePipelines = new ConcurrentHashMap<>();

    private static final List<String> PIPELINE_STAGES = List.of(
            "Checkout", "Build", "Unit & Integration Tests", "Static Analysis",
            "API Tests", "Docker Build & Push", "Deploy to Dev", "Smoke Test",
            "Deploy to Staging", "Manual Approval", "Deploy to Production"
    );

    @PostConstruct
    public void restoreActiveStateFromFirestore() {
        if (!firestoreService.isAvailable()) {
            log.info("Firestore unavailable; active pipeline state starts empty");
            return;
        }

        List<PipelineStatus> active = firestoreService.getActivePipelines(200);
        for (PipelineStatus status : active) {
            activePipelines.put(pipelineKey(status.getJobName(), status.getBuildNumber()), status);
        }
        log.info("Restored {} active pipelines from Firestore", activePipelines.size());
    }

    public void processWebhook(BuildEvent event) {
        log.info("Processing webhook: job={}, build=#{}, stage={}, status={}",
                event.getJobName(), event.getBuildNumber(), event.getStage(), event.getStatus());

        buildTotalCounter.increment();
        if (event.getDuration() > 0) {
            buildDurationTimer.record(event.getDuration(), TimeUnit.MILLISECONDS);
        }

        PipelineStatus status = updatePipelineState(event);

        // Construct URLs if not already provided by the webhook
        if (status.getJenkinsUrl() == null || status.getJenkinsUrl().isBlank()) {
            String baseUrl = jenkinsProperties.getBaseUrl();
            if (baseUrl != null && !baseUrl.isBlank()) {
                String jobPath = event.getJobName() != null ? event.getJobName().replace("/", "/job/") : "unknown";
                status.setJenkinsUrl(baseUrl.replaceAll("/+$", "") + "/job/" + jobPath + "/" + event.getBuildNumber() + "/");
            }
        }
        if (status.getGithubUrl() == null || status.getGithubUrl().isBlank()) {
            status.setGithubUrl(githubRepoUrl);
        }

        // Persist canonical summary + raw event stream in Firestore
        firestoreService.upsertBuildSummary(status, event.getGitCommit(), "webhook");
        firestoreService.appendBuildEvent(event);

        if (isTerminalStatus(status.getOverallStatus())) {
            activePipelines.remove(pipelineKey(status.getJobName(), status.getBuildNumber()));
        }

        if (event.getStage() != null && event.getStage().toLowerCase().contains("deploy")) {
            String namespace = extractNamespace(event.getStage());
            firestoreService.writeDeployment(namespace, event.getBuildNumber(),
                    event.getStatus(), event.getMetadata());
        }
    }

    private PipelineStatus updatePipelineState(BuildEvent event) {
        String key = pipelineKey(event.getJobName(), event.getBuildNumber());
        long timestamp = event.getTimestamp() > 0 ? event.getTimestamp() : Instant.now().toEpochMilli();

        return activePipelines.compute(key, (pipelineKey, existing) -> {
            PipelineStatus status = existing != null ? existing : PipelineStatus.builder()
                    .buildNumber(event.getBuildNumber())
                    .jobName(event.getJobName())
                    .overallStatus("IN_PROGRESS")
                    .gitBranch(event.getGitBranch())
                    .gitCommit(event.getGitCommit())
                    .triggerType(event.getTriggerType())
                    .jenkinsUrl(event.getJenkinsUrl())
                    .stages(buildInitialStages())
                    .startTime(timestamp)
                    .build();

            if (event.getGitBranch() != null && !event.getGitBranch().isBlank()) {
                status.setGitBranch(event.getGitBranch());
            }
            if (event.getTriggerType() != null && !event.getTriggerType().isBlank()) {
                status.setTriggerType(event.getTriggerType());
            }

            if (event.getStage() != null) {
                boolean matched = false;
                for (PipelineStatus.StageInfo stage : status.getStages()) {
                    if (event.getStage().equalsIgnoreCase(stage.getName())) {
                        stage.setStatus(event.getStatus());
                        stage.setDuration(event.getDuration());
                        matched = true;
                        break;
                    }
                }

                // Support custom/unexpected stage names from Jenkins
                if (!matched) {
                    status.getStages().add(PipelineStatus.StageInfo.builder()
                            .name(event.getStage())
                            .status(event.getStatus())
                            .duration(event.getDuration())
                            .order(status.getStages().size() + 1)
                            .build());
                }
            }

            if ("FAILURE".equalsIgnoreCase(event.getStatus()) || "ABORTED".equalsIgnoreCase(event.getStatus())) {
                status.setOverallStatus("FAILURE");
                status.setEndTime(timestamp);
                status.setTotalDuration(Math.max(timestamp - status.getStartTime(), 0));
            } else if ("SUCCESS".equalsIgnoreCase(event.getStatus())) {
                // Mark fully successful when production deployment succeeds.
                if ("Deploy to Production".equalsIgnoreCase(event.getStage())) {
                    status.setOverallStatus("SUCCESS");
                    status.setEndTime(timestamp);
                    status.setTotalDuration(Math.max(timestamp - status.getStartTime(), 0));
                }
            } else {
                status.setOverallStatus("IN_PROGRESS");
            }

            return status;
        });
    }

    private List<PipelineStatus.StageInfo> buildInitialStages() {
        List<PipelineStatus.StageInfo> stages = new ArrayList<>();
        for (int i = 0; i < PIPELINE_STAGES.size(); i++) {
            stages.add(PipelineStatus.StageInfo.builder()
                    .name(PIPELINE_STAGES.get(i))
                    .status("PENDING")
                    .order(i + 1)
                    .build());
        }
        return stages;
    }

    private String extractNamespace(String stage) {
        String normalized = stage.toLowerCase();
        if (normalized.contains("production")) return "production";
        if (normalized.contains("staging")) return "staging";
        return "dev";
    }

    private String pipelineKey(String jobName, int buildNumber) {
        return (jobName == null ? "unknown-job" : jobName) + "-" + buildNumber;
    }

    private boolean isTerminalStatus(String status) {
        return "SUCCESS".equalsIgnoreCase(status) || "FAILURE".equalsIgnoreCase(status);
    }

    public PipelineStatus getActivePipeline(String jobName) {
        if (firestoreService.isAvailable()) {
            return firestoreService.getActivePipelines(200).stream()
                    .filter(p -> p.getJobName() != null && p.getJobName().equalsIgnoreCase(jobName))
                    .max(Comparator.comparingInt(PipelineStatus::getBuildNumber))
                    .orElse(null);
        }

        return activePipelines.values().stream()
                .filter(p -> p.getJobName() != null && p.getJobName().equalsIgnoreCase(jobName))
                .max(Comparator.comparingInt(PipelineStatus::getBuildNumber))
                .orElse(null);
    }

    public List<PipelineStatus> getAllActivePipelines() {
        if (firestoreService.isAvailable()) {
            return firestoreService.getActivePipelines(200);
        }
        return new ArrayList<>(activePipelines.values());
    }

    public PagedBuildResponse getPagedBuilds(int limit, @Nullable String cursor) {
        if (firestoreService.isAvailable()) {
            return firestoreService.getPagedBuilds(limit, cursor);
        }

        List<PipelineStatus> builds = activePipelines.values().stream()
                .sorted(Comparator.comparingLong(PipelineStatus::getStartTime).reversed())
                .limit(Math.max(limit, 1))
                .toList();
        return PagedBuildResponse.builder().builds(builds).nextCursor(null).build();
    }

    public List<PipelineStatus> getRecentBuilds(int limit) {
        return getPagedBuilds(limit, null).getBuilds();
    }

    public Map<String, Object> getBuildAnalytics() {
        if (firestoreService.isAvailable()) {
            return firestoreService.getBuildAnalytics(1000);
        }

        long totalBuilds = activePipelines.size();
        long successCount = activePipelines.values().stream()
                .filter(b -> "SUCCESS".equals(b.getOverallStatus()))
                .count();
        double successRate = totalBuilds > 0 ? (double) successCount / totalBuilds * 100 : 0;
        double avgDuration = activePipelines.values().stream()
                .mapToLong(PipelineStatus::getTotalDuration)
                .filter(d -> d > 0)
                .average()
                .orElse(0);

        return Map.of(
                "totalBuilds", totalBuilds,
                "successCount", successCount,
                "failureCount", totalBuilds - successCount,
                "successRate", Math.round(successRate * 100.0) / 100.0,
                "avgDurationMs", avgDuration,
                "shortestBuildMs", activePipelines.values().stream()
                        .mapToLong(PipelineStatus::getTotalDuration).filter(d -> d > 0).min().orElse(0),
                "longestBuildMs", activePipelines.values().stream()
                        .mapToLong(PipelineStatus::getTotalDuration).max().orElse(0)
        );
    }
}
