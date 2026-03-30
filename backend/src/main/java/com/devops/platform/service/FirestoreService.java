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
public class FirestoreService {

    @Nullable
    private final Firestore firestore;

    public FirestoreService(@Nullable Firestore firestore) {
        this.firestore = firestore;
        if (firestore == null) {
            log.warn("Firestore is not available - all write operations will be no-ops");
        }
    }

    public boolean isAvailable() {
        return firestore != null;
    }

    public void appendBuildEvent(BuildEvent event) {
        if (firestore == null) {
            log.debug("Firestore unavailable - skipping appendBuildEvent for build #{}", event.getBuildNumber());
            return;
        }

        try {
            String docId = buildDocId(event.getJobName(), event.getBuildNumber());
            Map<String, Object> data = new HashMap<>();
            data.put("buildNumber", event.getBuildNumber());
            data.put("jobName", event.getJobName());
            data.put("stage", event.getStage());
            data.put("status", event.getStatus());
            data.put("duration", event.getDuration());
            data.put("gitBranch", event.getGitBranch());
            data.put("gitCommit", event.getGitCommit());
            data.put("triggerType", event.getTriggerType());
            data.put("timestamp", normalizedTimestamp(event.getTimestamp()));
            data.put("metadata", event.getMetadata());
            data.put("testResults", event.getTestResults());

            firestore.collection("builds")
                    .document(docId)
                    .collection("events")
                    .add(data)
                    .get();

            Map<String, Object> lastEvent = new HashMap<>();
            lastEvent.put("lastStage", event.getStage());
            lastEvent.put("lastStatus", event.getStatus());
            lastEvent.put("lastUpdated", Instant.now().toEpochMilli());
            firestore.collection("builds").document(docId).set(lastEvent, SetOptions.merge()).get();

            log.info("Build event appended to Firestore: {}", docId);
        } catch (Exception e) {
            log.error("Failed to append build event to Firestore", e);
        }
    }

    public void upsertBuildSummary(PipelineStatus summary, @Nullable String gitCommit, String source) {
        if (firestore == null) return;

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
            data.put("source", source);
            data.put("lastUpdated", Instant.now().toEpochMilli());

            firestore.collection("builds").document(docId).set(data, SetOptions.merge()).get();
        } catch (Exception e) {
            log.error("Failed to upsert build summary", e);
        }
    }

    public void upsertBackfillBuild(String jobName, int buildNumber, String status, long startTime, long durationMs,
                                     @Nullable String jenkinsUrl, @Nullable String githubUrl) {
        if (firestore == null) return;
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
            log.error("Failed to upsert historical build {}", jobName, e);
        }
    }

    public void writeBackfillState(@NonNull Map<String, Object> state) {
        if (firestore == null) return;
        try {
            firestore.collection("backfillState").document("jenkins").set(state).get();
        } catch (Exception e) {
            log.error("Failed to write backfill state", e);
        }
    }

    @Nullable
    public Map<String, Object> getBackfillState() {
        if (firestore == null) return null;
        try {
            DocumentSnapshot snapshot = firestore.collection("backfillState").document("jenkins").get().get();
            return snapshot.exists() ? snapshot.getData() : null;
        } catch (Exception e) {
            log.error("Failed to read backfill state", e);
            return null;
        }
    }

    public PagedBuildResponse getPagedBuilds(int limit, @Nullable String cursor) {
        if (firestore == null) {
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
            log.error("Failed to query paged builds", e);
            return PagedBuildResponse.builder().builds(List.of()).nextCursor(null).build();
        }
    }

    public List<PipelineStatus> getActivePipelines(int limit) {
        if (firestore == null) return List.of();
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
            log.error("Failed to fetch active pipelines", e);
            return List.of();
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

        if (firestore == null) {
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
            log.error("Failed to build analytics from Firestore", e);
            return analytics;
        }
    }

    public void writeDeployment(String namespace, int buildNumber, String status, Map<String, Object> details) {
        if (firestore == null) return;

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
            log.error("Failed to write deployment to Firestore", e);
        }
    }

    public void writeSystemEvent(String type, String message, Map<String, Object> data) {
        if (firestore == null) return;

        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", type);
            event.put("message", message);
            event.put("timestamp", Instant.now().toEpochMilli());
            if (data != null) event.putAll(data);

            firestore.collection("systemEvents").add(event).get();
            log.info("System event written to Firestore: {} - {}", type, message);
        } catch (Exception e) {
            log.error("Failed to write system event to Firestore", e);
        }
    }

    public Map<String, Object> getDashboardOverview() {
        if (firestore == null) return null;
        try {
            return firestore.collection("dashboard").document("overview").get().get().getData();
        } catch (Exception e) {
            log.error("Failed to fetch dashboard overview", e);
            return null;
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
