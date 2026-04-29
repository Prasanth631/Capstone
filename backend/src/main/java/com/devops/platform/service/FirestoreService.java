package com.devops.platform.service;

import com.devops.platform.dto.BuildEvent;
import com.devops.platform.dto.PagedBuildResponse;
import com.devops.platform.dto.PipelineStatus;
import com.google.cloud.firestore.AggregateQuerySnapshot;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.SetOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Slf4j
@SuppressWarnings("null")
public class FirestoreService {

    @Nullable
    private final Firestore firestore;

    /** Circuit breaker: when quota is exhausted, skip all Firestore operations. */
    private volatile boolean quotaExhausted = false;
    private volatile long quotaExhaustedAt = 0;
    private static final long QUOTA_COOLDOWN_MS = 600_000; // 10 minutes

    public FirestoreService(@Nullable Firestore firestore) {
        this.firestore = firestore;
        if (!isAvailable()) {
            log.warn("Firestore is not available - all write operations will be no-ops");
        }
    }

    public boolean isAvailable() {
        return firestore != null && !isQuotaBlocked();
    }

    private boolean isQuotaBlocked() {
        if (!quotaExhausted) return false;
        long elapsed = System.currentTimeMillis() - quotaExhaustedAt;
        if (elapsed > QUOTA_COOLDOWN_MS) {
            quotaExhausted = false;
            log.info("Firestore quota cooldown expired, resuming operations");
            return false;
        }
        return true;
    }

    private void handleException(String operation, Exception e) {
        String msg = e.getMessage() != null ? e.getMessage() : "";
        Throwable cause = e.getCause();
        String causeMsg = cause != null && cause.getMessage() != null ? cause.getMessage() : msg;

        if (causeMsg.contains("RESOURCE_EXHAUSTED") || msg.contains("RESOURCE_EXHAUSTED")) {
            if (!quotaExhausted) {
                quotaExhausted = true;
                quotaExhaustedAt = System.currentTimeMillis();
                log.warn("Firestore QUOTA EXHAUSTED during {}. All Firestore operations paused for {} minutes.",
                        operation, QUOTA_COOLDOWN_MS / 60000);
            }
            // Don't log the full stack trace for quota errors — it's noise
        } else {
            log.error("Firestore error during {}: {}", operation, msg);
        }
    }

    public void appendBuildEvent(BuildEvent event, long eventSequence) {
        if (!isAvailable()) {
            log.debug("Firestore unavailable - skipping appendBuildEvent for build #{}", event.getBuildNumber());
            return;
        }

        try {
            String docId = buildDocId(event.getJobName(), event.getBuildNumber());
            long eventTimestamp = normalizedTimestamp(event.getTimestamp());
            Map<String, Object> data = new HashMap<>();
            data.put("buildNumber", event.getBuildNumber());
            data.put("jobName", event.getJobName());
            data.put("stage", event.getStage());
            data.put("status", event.getStatus());
            data.put("duration", event.getDuration());
            data.put("gitBranch", event.getGitBranch());
            data.put("gitCommit", event.getGitCommit());
            data.put("triggerType", event.getTriggerType());
            data.put("timestamp", eventTimestamp);
            data.put("eventTimestamp", eventTimestamp);
            data.put("eventSequence", eventSequence);
            data.put("metadata", event.getMetadata());
            data.put("testResults", event.getTestResults());

            firestore.collection("builds")
                    .document(docId)
                    .collection("events")
                    .document(buildEventDocId(eventTimestamp, eventSequence))
                    .set(data)
                    .get();

            Map<String, Object> lastEvent = new HashMap<>();
            lastEvent.put("lastStage", event.getStage());
            lastEvent.put("lastStatus", event.getStatus());
            lastEvent.put("lastEventTimestamp", eventTimestamp);
            lastEvent.put("lastEventSequence", eventSequence);
            lastEvent.put("lastUpdated", Instant.now().toEpochMilli());
            firestore.collection("builds").document(docId).set(lastEvent, SetOptions.merge()).get();

            log.info("Build event appended to Firestore: {}", docId);
        } catch (Exception e) {
            handleException("appendBuildEvent", e);
        }
    }

    public void appendDashboardEvent(BuildEvent event, PipelineStatus status, long eventSequence, long eventTimestamp) {
        if (!isAvailable()) {
            return;
        }

        try {
            Map<String, Object> feedEvent = new HashMap<>();
            feedEvent.put("jobName", event.getJobName());
            feedEvent.put("buildNumber", event.getBuildNumber());
            feedEvent.put("stage", event.getStage());
            feedEvent.put("stageOrder", numberFrom(event.getMetadata(), "stageOrder", 0));
            feedEvent.put("stageStatus", event.getStatus());
            feedEvent.put("overallStatus", status.getOverallStatus());
            feedEvent.put("duration", event.getDuration());
            feedEvent.put("gitBranch", event.getGitBranch());
            feedEvent.put("gitCommit", event.getGitCommit());
            feedEvent.put("triggerType", event.getTriggerType());
            feedEvent.put("jenkinsUrl", status.getJenkinsUrl());
            feedEvent.put("githubUrl", status.getGithubUrl());
            feedEvent.put("eventTimestamp", eventTimestamp);
            feedEvent.put("eventSequence", eventSequence);
            feedEvent.put("source", "jenkins-webhook");

            firestore.collection("dashboardEvents")
                    .document(dashboardEventDocId(eventTimestamp, event.getBuildNumber(), eventSequence))
                    .set(feedEvent)
                    .get();
        } catch (Exception e) {
            handleException("appendDashboardEvent", e);
        }
    }

    public void upsertBuildSummary(PipelineStatus summary, @Nullable String gitCommit, String source) {
        upsertBuildSummary(summary, gitCommit, source, null);
    }

    public void upsertBuildSummary(PipelineStatus summary, @Nullable String gitCommit, String source,
                                   @Nullable Map<String, Object> testResults) {
        if (!isAvailable()) return;

        try {
            String docId = buildDocId(summary.getJobName(), summary.getBuildNumber());
            Map<String, Object> data = new HashMap<>();
            data.put("buildNumber", summary.getBuildNumber());
            data.put("jobName", summary.getJobName());
            data.put("overallStatus", summary.getOverallStatus());
            data.put("stages", summary.getStages() != null ? summary.getStages() : List.of());
            data.put("startTime", summary.getStartTime());
            data.put("endTime", summary.getEndTime());
            data.put("totalDuration", summary.getTotalDuration());
            if (summary.getGitBranch() != null && !summary.getGitBranch().isBlank()) {
                data.put("gitBranch", summary.getGitBranch());
            }
            if (gitCommit != null && !gitCommit.isBlank()) {
                data.put("gitCommit", gitCommit);
            }
            if (summary.getGitCommit() != null && !summary.getGitCommit().isBlank()) {
                data.put("gitCommit", summary.getGitCommit());
            }
            if (summary.getTriggerType() != null && !summary.getTriggerType().isBlank()) {
                data.put("triggerType", summary.getTriggerType());
            }
            if (summary.getJenkinsUrl() != null && !summary.getJenkinsUrl().isBlank()) {
                data.put("jenkinsUrl", summary.getJenkinsUrl());
            }
            if (summary.getGithubUrl() != null && !summary.getGithubUrl().isBlank()) {
                data.put("githubUrl", summary.getGithubUrl());
            }
            if (testResults != null && !testResults.isEmpty()) {
                data.put("testResults", testResults);
            }
            data.put("source", source);
            data.put("lastUpdated", Instant.now().toEpochMilli());

            firestore.collection("builds").document(docId).set(data, SetOptions.merge()).get();
        } catch (Exception e) {
            handleException("upsertBuildSummary", e);
        }
    }

    public void upsertBackfillBuild(String jobName, int buildNumber, String status, long startTime, long durationMs,
                                     @Nullable String jenkinsUrl, @Nullable String githubUrl) {
        if (!isAvailable()) return;
        try {
            long normalizedStart = normalizedTimestamp(startTime);
            String overallStatus = status == null || status.isBlank() ? "IN_PROGRESS" : status;
            PipelineStatus summary = PipelineStatus.builder()
                    .buildNumber(buildNumber)
                    .jobName(jobName)
                    .overallStatus(overallStatus)
                    .stages(new ArrayList<>())
                    .startTime(normalizedStart)
                    .endTime(durationMs > 0 ? normalizedStart + durationMs : 0)
                    .totalDuration(Math.max(durationMs, 0))
                    .gitBranch("unknown")
                    .triggerType("jenkins-backfill")
                    .jenkinsUrl(jenkinsUrl)
                    .githubUrl(githubUrl)
                    .build();
            upsertBuildSummary(summary, null, "jenkins-backfill");
        } catch (Exception e) {
            handleException("upsertHistoricalBuild - " + jobName, e);
        }
    }

    public void writeBackfillState(@NonNull Map<String, Object> state) {
        if (!isAvailable()) return;
        try {
            firestore.collection("backfillState").document("jenkins").set(state).get();
        } catch (Exception e) {
            handleException("writeBackfillState", e);
        }
    }

    @Nullable
    public Map<String, Object> getBackfillState() {
        if (!isAvailable()) return null;
        try {
            DocumentSnapshot snapshot = firestore.collection("backfillState").document("jenkins").get().get();
            return snapshot.exists() ? snapshot.getData() : null;
        } catch (Exception e) {
            handleException("readBackfillState", e);
            return null;
        }
    }

    public PagedBuildResponse getPagedBuilds(int limit, @Nullable String cursor) {
        if (!isAvailable()) {
            return PagedBuildResponse.builder().builds(List.of()).nextCursor(null).build();
        }

        int safeLimit = Math.max(1, Math.min(limit, 100));
        try {
            Query query = firestore.collection("builds")
                    .orderBy("startTime", Query.Direction.DESCENDING)
                    .orderBy("__name__", Query.Direction.DESCENDING)
                    .limit(safeLimit + 1);

            CursorParts cursorParts = decodeCursor(cursor);
            if (cursorParts != null) {
                query = query.startAfter(cursorParts.startTime(), cursorParts.docId());
            }

            QuerySnapshot snapshot = query.get().get();
            List<? extends DocumentSnapshot> docs = snapshot.getDocuments();
            boolean hasMore = docs.size() > safeLimit;
            List<? extends DocumentSnapshot> pageDocs = hasMore ? docs.subList(0, safeLimit) : docs;

            List<PipelineStatus> builds = pageDocs.stream()
                    .map(this::toPipelineStatus)
                    .filter(Objects::nonNull)
                    .toList();

            String nextCursor = null;
            if (hasMore && !pageDocs.isEmpty()) {
                DocumentSnapshot last = pageDocs.get(pageDocs.size() - 1);
                Long startTime = last.getLong("startTime");
                if (startTime != null) {
                    nextCursor = encodeCursor(startTime, last.getId());
                }
            }

            return PagedBuildResponse.builder()
                    .builds(builds)
                    .nextCursor(nextCursor)
                    .build();
        } catch (Exception e) {
            handleException("getPagedBuilds", e);
            return null;
        }
    }

    public List<PipelineStatus> getActivePipelines(int limit) {
        if (!isAvailable()) return List.of();
        int safeLimit = Math.max(1, Math.min(limit, 200));

        try {
            QuerySnapshot snapshot = firestore.collection("builds")
                    .whereEqualTo("overallStatus", "IN_PROGRESS")
                    .limit(safeLimit * 2)
                    .get()
                    .get();

            return snapshot.getDocuments().stream()
                    .map(this::toPipelineStatus)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparingLong(PipelineStatus::getStartTime).reversed())
                    .limit(safeLimit)
                    .toList();
        } catch (Exception e) {
            handleException("getActivePipelines", e);
            return null;
        }
    }

    public Map<String, Object> getBuildAnalytics(int sampleSize) {
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalBuilds", 0L);
        analytics.put("successCount", 0L);
        analytics.put("failureCount", 0L);
        analytics.put("successRate", 0.0);
        analytics.put("avgDurationMs", 0.0);
        analytics.put("shortestBuildMs", 0L);
        analytics.put("longestBuildMs", 0L);

        if (!isAvailable()) {
            return analytics;
        }

        try {
            AggregateQuerySnapshot totalAgg = firestore.collection("builds").count().get().get();
            long totalBuilds = totalAgg.getCount();
            AggregateQuerySnapshot successAgg = firestore.collection("builds")
                    .whereEqualTo("overallStatus", "SUCCESS")
                    .count()
                    .get()
                    .get();
            long successCount = successAgg.getCount();

            int safeSample = Math.max(1, Math.min(sampleSize, 2000));
            QuerySnapshot sample = firestore.collection("builds")
                    .orderBy("startTime", Query.Direction.DESCENDING)
                    .limit(safeSample)
                    .get()
                    .get();
            List<Long> durations = sample.getDocuments().stream()
                    .map(d -> d.getLong("totalDuration"))
                    .filter(Objects::nonNull)
                    .map(Long::longValue)
                    .filter(v -> v > 0)
                    .toList();

            double avgDuration = durations.stream().mapToLong(Long::longValue).average().orElse(0);
            long minDuration = durations.stream().mapToLong(Long::longValue).min().orElse(0);
            long maxDuration = durations.stream().mapToLong(Long::longValue).max().orElse(0);

            analytics.put("totalBuilds", totalBuilds);
            analytics.put("successCount", successCount);
            analytics.put("failureCount", Math.max(totalBuilds - successCount, 0));
            analytics.put("successRate", totalBuilds > 0 ? Math.round((successCount * 10000.0 / totalBuilds)) / 100.0 : 0.0);
            analytics.put("avgDurationMs", avgDuration);
            analytics.put("shortestBuildMs", minDuration);
            analytics.put("longestBuildMs", maxDuration);

            return analytics;
        } catch (Exception e) {
            handleException("getBuildAnalytics", e);
            return null;
        }
    }

    public void writeDeployment(String namespace, int buildNumber, String status, Map<String, Object> details) {
        if (!isAvailable()) return;

        try {
            Map<String, Object> data = new HashMap<>();
            data.put("namespace", namespace);
            data.put("buildNumber", buildNumber);
            data.put("status", status);
            data.put("timestamp", Instant.now().toEpochMilli());
            if (details != null) data.putAll(details);

            String docId = namespace + "-build-" + buildNumber;
            firestore.collection("deployments").document(docId).set(data).get();
            log.info("Deployment written to Firestore: {}", docId);
        } catch (Exception e) {
            handleException("writeDeployment", e);
        }
    }

    public void writeSystemEvent(String type, String message, Map<String, Object> data) {
        if (!isAvailable()) return;

        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", type);
            event.put("message", message);
            event.put("timestamp", Instant.now().toEpochMilli());
            if (data != null) event.putAll(data);

            firestore.collection("systemEvents").add(event).get();
            log.info("System event written to Firestore: {} - {}", type, message);
        } catch (Exception e) {
            handleException("writeSystemEvent", e);
        }
    }

    public Map<String, Object> getDashboardOverview() {
        if (!isAvailable()) return null;
        try {
            return firestore.collection("dashboard").document("overview").get().get().getData();
        } catch (Exception e) {
            handleException("getDashboardOverview", e);
            return null;
        }
    }

    /**
     * Query the most recent build that has non-empty testResults and return them.
     * Falls back to zero-values if no test data is found.
     */
    public Map<String, Object> getLatestTestResults() {
        Map<String, Object> empty = new HashMap<>();
        empty.put("totalTests", 0);
        empty.put("passed", 0);
        empty.put("failed", 0);
        empty.put("skipped", 0);
        empty.put("passRate", 0.0);

        if (!isAvailable()) return empty;

        try {
            // Query recent builds that have testResults field
            QuerySnapshot snapshot = firestore.collection("builds")
                    .orderBy("startTime", Query.Direction.DESCENDING)
                    .limit(20)
                    .get()
                    .get();

            for (DocumentSnapshot doc : snapshot.getDocuments()) {
                Object testResultsObj = doc.get("testResults");
                if (testResultsObj instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> tr = (Map<String, Object>) testResultsObj;
                    Number total = (Number) tr.get("totalTests");
                    if (total != null && total.intValue() > 0) {
                        return tr;
                    }
                }
            }
            return empty;
        } catch (Exception e) {
            handleException("getLatestTestResults", e);
            return null;
        }
    }

    public void upsertRealtimeDashboardProjection(List<PipelineStatus> activePipelines,
                                                  PagedBuildResponse pagedBuilds,
                                                  Map<String, Object> buildAnalytics,
                                                  Map<String, Object> latestTestResults,
                                                  PipelineStatus pipelineStatus,
                                                  BuildEvent event,
                                                  long eventSequence,
                                                  long eventTimestamp) {
        if (!isAvailable()) {
            return;
        }

        Map<String, Object> dashboardData = new HashMap<>();
        dashboardData.put("pipelines", activePipelines != null ? activePipelines : List.of());
        dashboardData.put("recentBuilds", pagedBuilds != null ? pagedBuilds.getBuilds() : List.of());
        dashboardData.put("recentBuildsNextCursor", pagedBuilds != null ? pagedBuilds.getNextCursor() : null);
        dashboardData.put("buildAnalytics", buildAnalytics != null ? buildAnalytics : Map.of());
        dashboardData.put("testResults", latestTestResults != null ? latestTestResults : Map.of());
        dashboardData.put("pipelineLastUpdated", eventTimestamp);
        dashboardData.put("lastUpdated", eventTimestamp);
        dashboardData.put("pipelineFreshness", Map.of(
                "eventTimestamp", eventTimestamp,
                "eventSequence", eventSequence,
                "jobName", event.getJobName(),
                "buildNumber", event.getBuildNumber(),
                "stage", event.getStage(),
                "stageStatus", event.getStatus(),
                "stageOrder", numberFrom(event.getMetadata(), "stageOrder", 0),
                "overallStatus", pipelineStatus.getOverallStatus()
        ));

        mergeDashboardOverview(dashboardData);
    }

    public void mergeDashboardOverview(Map<String, Object> dashboardData) {
        if (firestore == null || dashboardData == null || dashboardData.isEmpty()) {
            return;
        }

        try {
            firestore.collection("dashboard").document("overview")
                    .set(dashboardData, SetOptions.merge())
                    .get();
        } catch (Exception e) {
            handleException("mergeDashboardOverview", e);
        }
    }

    @Nullable
    private PipelineStatus toPipelineStatus(DocumentSnapshot doc) {
        try {
            Long bnLong = doc.getLong("buildNumber");
            Integer buildNumber = bnLong != null ? bnLong.intValue() : null;
            String jobName = doc.getString("jobName");
            if (buildNumber == null || jobName == null) return null;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> stageMaps = (List<Map<String, Object>>) doc.get("stages");
            List<PipelineStatus.StageInfo> stages = new ArrayList<>();
            if (stageMaps != null) {
                for (Map<String, Object> stage : stageMaps) {
                    String name = (String) stage.get("name");
                    String status = (String) stage.get("status");
                    long duration = stage.get("duration") instanceof Number ? ((Number) stage.get("duration")).longValue() : 0L;
                    int order = stage.get("order") instanceof Number ? ((Number) stage.get("order")).intValue() : 0;
                    @SuppressWarnings("unchecked")
                    Map<String, Object> details = stage.get("details") instanceof Map ? (Map<String, Object>) stage.get("details") : null;
                    stages.add(PipelineStatus.StageInfo.builder()
                            .name(name)
                            .status(status)
                            .duration(duration)
                            .order(order)
                            .details(details)
                            .build());
                }
            }

            Long stLong = doc.getLong("startTime");
            Long etLong = doc.getLong("endTime");
            Long tdLong = doc.getLong("totalDuration");

            return PipelineStatus.builder()
                    .buildNumber(buildNumber)
                    .jobName(jobName)
                    .overallStatus(doc.getString("overallStatus"))
                    .stages(stages)
                    .startTime(stLong != null ? stLong : 0L)
                    .endTime(etLong != null ? etLong : 0L)
                    .totalDuration(tdLong != null ? tdLong : 0L)
                    .gitBranch(doc.getString("gitBranch"))
                    .gitCommit(doc.getString("gitCommit"))
                    .triggerType(doc.getString("triggerType"))
                    .jenkinsUrl(doc.getString("jenkinsUrl"))
                    .githubUrl(doc.getString("githubUrl"))
                    .build();
        } catch (Exception e) {
            log.warn("Skipping malformed build summary document: {}", doc.getId(), e);
            return null;
        }
    }

    private long normalizedTimestamp(long ts) {
        return ts > 0 ? ts : Instant.now().toEpochMilli();
    }

    private long numberFrom(@Nullable Map<String, Object> data, String key, long fallback) {
        if (data == null) return fallback;
        Object value = data.get(key);
        return value instanceof Number number ? number.longValue() : fallback;
    }

    @NonNull
    private String buildEventDocId(long eventTimestamp, long eventSequence) {
        return String.format("%013d-%08d", eventTimestamp, eventSequence);
    }

    @NonNull
    private String dashboardEventDocId(long eventTimestamp, int buildNumber, long eventSequence) {
        return String.format("%013d-%08d-%08d", eventTimestamp, buildNumber, eventSequence);
    }

    @NonNull
    private String buildDocId(String jobName, int buildNumber) {
        String safeJob = (jobName == null || jobName.isBlank() ? "unknown-job" : jobName)
                .replace("/", "_");
        return safeJob + "-" + buildNumber;
    }

    private String encodeCursor(long startTime, String docId) {
        String raw = startTime + "|" + docId;
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    @Nullable
    private CursorParts decodeCursor(@Nullable String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", 2);
            if (parts.length != 2) return null;
            return new CursorParts(Long.parseLong(parts[0]), parts[1]);
        } catch (Exception e) {
            log.warn("Ignoring invalid builds cursor");
            return null;
        }
    }

    private record CursorParts(long startTime, String docId) {}
}
