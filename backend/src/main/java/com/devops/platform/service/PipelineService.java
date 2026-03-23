package com.devops.platform.service;

import com.devops.platform.dto.BuildEvent;
import com.devops.platform.dto.PipelineStatus;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineService {

    private final FirestoreService firestoreService;
    private final Counter buildTotalCounter;
    private final Timer buildDurationTimer;

    // In-memory pipeline state (for real-time dashboard queries)
    private final Map<String, PipelineStatus> activePipelines = new ConcurrentHashMap<>();
    private final List<BuildEvent> recentBuilds = Collections.synchronizedList(new ArrayList<>());

    private static final List<String> PIPELINE_STAGES = List.of(
            "Checkout", "Build", "Unit & Integration Tests", "Static Analysis",
            "API Tests", "Docker Build & Push", "Deploy to Dev", "Smoke Test",
            "Deploy to Staging", "Manual Approval", "Deploy to Production"
    );

    public void processWebhook(BuildEvent event) {
        log.info("Processing webhook: job={}, build=#{}, stage={}, status={}",
                event.getJobName(), event.getBuildNumber(), event.getStage(), event.getStatus());

        // Update metrics
        buildTotalCounter.increment();
        if (event.getDuration() > 0) {
            buildDurationTimer.record(event.getDuration(), TimeUnit.MILLISECONDS);
        }

        // Update in-memory pipeline state
        updatePipelineState(event);

        // Persist to Firestore
        firestoreService.writeBuildEvent(event);

        // Track in recent builds
        recentBuilds.add(0, event);
        if (recentBuilds.size() > 100) {
            recentBuilds.subList(100, recentBuilds.size()).clear();
        }

        // If it's a deployment stage, write deployment record
        if (event.getStage() != null && event.getStage().toLowerCase().contains("deploy")) {
            String namespace = extractNamespace(event.getStage());
            firestoreService.writeDeployment(namespace, event.getBuildNumber(),
                    event.getStatus(), event.getMetadata());
        }
    }

    private void updatePipelineState(BuildEvent event) {
        String pipelineKey = event.getJobName() + "-" + event.getBuildNumber();

        activePipelines.compute(pipelineKey, (key, existing) -> {
            PipelineStatus status = existing != null ? existing : PipelineStatus.builder()
                    .buildNumber(event.getBuildNumber())
                    .jobName(event.getJobName())
                    .overallStatus("IN_PROGRESS")
                    .stages(buildInitialStages())
                    .startTime(event.getTimestamp())
                    .build();

            // Update the specific stage
            if (event.getStage() != null) {
                for (PipelineStatus.StageInfo stage : status.getStages()) {
                    if (stage.getName().equalsIgnoreCase(event.getStage())) {
                        stage.setStatus(event.getStatus());
                        stage.setDuration(event.getDuration());
                        break;
                    }
                }
            }

            // Update overall status
            if ("FAILURE".equals(event.getStatus())) {
                status.setOverallStatus("FAILURE");
            } else if (event.getStage() != null &&
                       event.getStage().equalsIgnoreCase("Deploy to Production") &&
                       "SUCCESS".equals(event.getStatus())) {
                status.setOverallStatus("SUCCESS");
                status.setEndTime(event.getTimestamp());
                status.setTotalDuration(event.getTimestamp() - status.getStartTime());
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
        if (stage.toLowerCase().contains("production")) return "production";
        if (stage.toLowerCase().contains("staging")) return "staging";
        return "dev";
    }

    public PipelineStatus getActivePipeline(String jobName) {
        return activePipelines.entrySet().stream()
                .filter(e -> e.getKey().startsWith(jobName))
                .max(Comparator.comparingInt(e -> e.getValue().getBuildNumber()))
                .map(Map.Entry::getValue)
                .orElse(null);
    }

    public List<PipelineStatus> getAllActivePipelines() {
        return new ArrayList<>(activePipelines.values());
    }

    public List<BuildEvent> getRecentBuilds(int limit) {
        return recentBuilds.stream().limit(limit).toList();
    }

    public Map<String, Object> getBuildAnalytics() {
        Map<String, Object> analytics = new HashMap<>();

        long totalBuilds = recentBuilds.size();
        long successCount = recentBuilds.stream()
                .filter(b -> "SUCCESS".equals(b.getStatus()))
                .count();
        double successRate = totalBuilds > 0 ? (double) successCount / totalBuilds * 100 : 0;
        OptionalDouble avgDuration = recentBuilds.stream()
                .mapToLong(BuildEvent::getDuration)
                .filter(d -> d > 0)
                .average();

        analytics.put("totalBuilds", totalBuilds);
        analytics.put("successCount", successCount);
        analytics.put("failureCount", totalBuilds - successCount);
        analytics.put("successRate", Math.round(successRate * 100.0) / 100.0);
        analytics.put("avgDurationMs", avgDuration.orElse(0));
        analytics.put("shortestBuildMs", recentBuilds.stream()
                .mapToLong(BuildEvent::getDuration).filter(d -> d > 0).min().orElse(0));
        analytics.put("longestBuildMs", recentBuilds.stream()
                .mapToLong(BuildEvent::getDuration).max().orElse(0));

        return analytics;
    }
}
