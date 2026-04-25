package com.devops.platform.service;

import com.devops.platform.config.JenkinsProperties;
import com.devops.platform.dto.JenkinsBackfillRequest;
import com.devops.platform.dto.JenkinsBackfillResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.lang.Nullable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.context.event.EventListener;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class JenkinsBackfillService {

    private final FirestoreService firestoreService;
    private final JenkinsProperties jenkinsProperties;
    private final DashboardSyncService dashboardSyncService;
    private final RestTemplateBuilder restTemplateBuilder;
    private final ObjectMapper objectMapper;

    @Value("${github.repo-url:https://github.com/Prasanth631/Capstone}")
    private String githubRepoUrl;

    private RestTemplate restTemplate;

    @PostConstruct
    public void initializeClient() {
        this.restTemplate = restTemplateBuilder
                .connectTimeout(Duration.ofSeconds(15))
                .readTimeout(Duration.ofSeconds(45))
                .build();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runStartupBackfill() {
        if (!jenkinsProperties.getBackfill().isStartupEnabled()) {
            log.info("Jenkins startup backfill disabled via config");
            return;
        }
        JenkinsBackfillResponse response = runBackfillInternal(defaultRequest(), false);
        log.info("Jenkins startup backfill finished: success={}, jobs={}, builds={}, msg={}",
                response.isSuccess(), response.getJobsProcessed(),
                response.getBuildsProcessed(), response.getMessage());
    }

    public JenkinsBackfillResponse runBackfill(@Nullable JenkinsBackfillRequest request) {
        return runBackfillInternal(normalizeRequest(request), true);
    }

    private JenkinsBackfillResponse runBackfillInternal(JenkinsBackfillRequest request, boolean manualTrigger) {
        if (!firestoreService.isAvailable()) {
            return JenkinsBackfillResponse.builder()
                    .success(false)
                    .message("Firestore is not available; cannot run Jenkins backfill")
                    .jobsProcessed(0)
                    .buildsProcessed(0)
                    .perJobLimit(resolvePerJobLimit(request))
                    .build();
        }

        if (!hasText(jenkinsProperties.getBaseUrl())) {
            return JenkinsBackfillResponse.builder()
                    .success(false)
                    .message("Jenkins base URL is not configured")
                    .jobsProcessed(0)
                    .buildsProcessed(0)
                    .perJobLimit(resolvePerJobLimit(request))
                    .build();
        }

        int perJobLimit = resolvePerJobLimit(request);
        if (!manualTrigger && shouldSkipStartupBackfill(perJobLimit)) {
            return JenkinsBackfillResponse.builder()
                    .success(true)
                    .message("Startup backfill skipped; recent completed run already exists")
                    .jobsProcessed(0)
                    .buildsProcessed(0)
                    .perJobLimit(perJobLimit)
                    .build();
        }

        try {
            Map<String, String> discoveredJobs = discoverAllLeafJobs();
            List<String> targetJobs = resolveTargetJobs(request, discoveredJobs.keySet());
            if (targetJobs.isEmpty()) {
                return JenkinsBackfillResponse.builder()
                        .success(false)
                        .message("No Jenkins jobs matched the requested scope")
                        .jobsProcessed(0)
                        .buildsProcessed(0)
                        .perJobLimit(perJobLimit)
                        .build();
            }

            int jobsProcessed = 0;
            int buildsProcessed = 0;
            int jobErrors = 0;

            for (String jobName : targetJobs) {
                String jobUrl = discoveredJobs.get(jobName);
                if (!hasText(jobUrl)) {
                    continue;
                }
                jobsProcessed++;
                try {
                    List<JenkinsBuildSummary> builds = fetchBuildSummaries(jobUrl, perJobLimit);
                    for (JenkinsBuildSummary build : builds) {
                        String buildJenkinsUrl = jobUrl.replaceAll("/+$", "") + "/" + build.buildNumber() + "/";
                        firestoreService.upsertBackfillBuild(
                                jobName,
                                build.buildNumber(),
                                normalizeResult(build.result()),
                                build.startTimeMs(),
                                build.durationMs(),
                                buildJenkinsUrl,
                                githubRepoUrl
                        );
                        buildsProcessed++;
                    }
                } catch (Exception ex) {
                    jobErrors++;
                    log.warn("Failed to import Jenkins history for job '{}': {}", jobName, ex.getMessage());
                }
            }

            long now = Instant.now().toEpochMilli();
            Map<String, Object> state = new HashMap<>();
            state.put("lastAttemptAt", now);
            state.put("lastCompletedAt", now);
            state.put("manualTrigger", manualTrigger);
            state.put("perJobLimit", perJobLimit);
            state.put("jobsRequested", targetJobs.size());
            state.put("jobsProcessed", jobsProcessed);
            state.put("buildsProcessed", buildsProcessed);
            state.put("jobErrors", jobErrors);
            state.put("status", jobErrors == 0 ? "SUCCESS" : "PARTIAL_SUCCESS");
            state.put("sampleJobs", targetJobs.stream().limit(20).toList());
            firestoreService.writeBackfillState(state);

            // Immediately refresh the dashboard overview so the frontend
            // sees backfilled data without waiting for the next sync cycle.
            if (buildsProcessed > 0) {
                try {
                    dashboardSyncService.syncDashboardData();
                    log.info("Dashboard projection refreshed after backfill ({} builds)", buildsProcessed);
                } catch (Exception ex) {
                    log.warn("Post-backfill dashboard refresh failed: {}", ex.getMessage());
                }
            }

            boolean success = jobsProcessed > 0 && jobErrors == 0;
            String message = jobErrors == 0
                    ? "Backfill completed successfully"
                    : "Backfill completed with partial failures";

            return JenkinsBackfillResponse.builder()
                    .success(success)
                    .message(message)
                    .jobsProcessed(jobsProcessed)
                    .buildsProcessed(buildsProcessed)
                    .perJobLimit(perJobLimit)
                    .build();
        } catch (Exception e) {
            log.error("Jenkins backfill failed", e);
            return JenkinsBackfillResponse.builder()
                    .success(false)
                    .message("Jenkins backfill failed: " + e.getMessage())
                    .jobsProcessed(0)
                    .buildsProcessed(0)
                    .perJobLimit(perJobLimit)
                    .build();
        }
    }

    private JenkinsBackfillRequest defaultRequest() {
        return JenkinsBackfillRequest.builder()
                .allJobs(true)
                .perJobLimit(jenkinsProperties.getBackfill().getDefaultPerJobLimit())
                .build();
    }

    private JenkinsBackfillRequest normalizeRequest(@Nullable JenkinsBackfillRequest request) {
        if (request == null) {
            return defaultRequest();
        }
        if (request.getPerJobLimit() == null) {
            request.setPerJobLimit(jenkinsProperties.getBackfill().getDefaultPerJobLimit());
        }
        if (request.getAllJobs() == null) {
            request.setAllJobs(request.getJobNames() == null || request.getJobNames().isEmpty());
        }
        return request;
    }

    private int resolvePerJobLimit(JenkinsBackfillRequest request) {
        int configuredDefault = Math.max(1, jenkinsProperties.getBackfill().getDefaultPerJobLimit());
        int raw = request.getPerJobLimit() != null ? request.getPerJobLimit() : configuredDefault;
        return Math.max(1, Math.min(raw, 500));
    }

    private boolean shouldSkipStartupBackfill(int perJobLimit) {
        Map<String, Object> previous = firestoreService.getBackfillState();
        if (previous == null) {
            return false;
        }
        long now = Instant.now().toEpochMilli();
        long maxAgeMs = Math.max(1, jenkinsProperties.getBackfill().getSkipIfRecentMinutes()) * 60_000L;
        long lastCompletedAt = asLong(previous.get("lastCompletedAt"), 0L);
        long previousLimit = asLong(previous.get("perJobLimit"), 0L);

        return lastCompletedAt > 0
                && now - lastCompletedAt <= maxAgeMs
                && previousLimit >= perJobLimit;
    }

    private Map<String, String> discoverAllLeafJobs() throws Exception {
        Map<String, String> jobs = new LinkedHashMap<>();
        Set<String> visited = new HashSet<>();
        String rootApi = toApiJsonUrl(jenkinsProperties.getBaseUrl()) + "?tree=jobs[name,url,_class]";
        discoverJobsRecursive(rootApi, "", jobs, visited);
        return jobs;
    }

    private void discoverJobsRecursive(String apiUrl, String prefix,
                                       Map<String, String> jobs,
                                       Set<String> visited) throws Exception {
        if (!visited.add(apiUrl)) {
            return;
        }

        JsonNode root = fetchJson(apiUrl);
        JsonNode jobsNode = root.path("jobs");
        if (!jobsNode.isArray()) {
            return;
        }

        for (JsonNode jobNode : jobsNode) {
            String name = jobNode.path("name").asText("");
            String jobUrl = jobNode.path("url").asText("");
            if (!hasText(name) || !hasText(jobUrl)) {
                continue;
            }

            String fullName = prefix.isBlank() ? name : prefix + "/" + name;
            String className = jobNode.path("_class").asText("");

            if (isFolder(className)) {
                String folderApi = toApiJsonUrl(jobUrl) + "?tree=jobs[name,url,_class]";
                discoverJobsRecursive(folderApi, fullName, jobs, visited);
            } else {
                jobs.put(fullName, ensureTrailingSlash(jobUrl));
            }
        }
    }

    private List<String> resolveTargetJobs(JenkinsBackfillRequest request, Set<String> discoveredJobs) {
        boolean allJobs = request.getAllJobs() == null || request.getAllJobs();
        if (allJobs) {
            return new ArrayList<>(discoveredJobs);
        }

        List<String> requested = request.getJobNames() == null ? List.of() : request.getJobNames();
        if (requested.isEmpty()) {
            return List.of();
        }

        Map<String, String> discoveredByLower = discoveredJobs.stream()
                .collect(Collectors.toMap(name -> name.toLowerCase(), name -> name, (a, b) -> a));

        List<String> matched = new ArrayList<>();
        for (String requestedName : requested) {
            if (!hasText(requestedName)) continue;
            String key = requestedName.toLowerCase();
            String exact = discoveredByLower.get(key);
            if (exact != null) {
                matched.add(exact);
            }
        }
        return matched;
    }

    private List<JenkinsBuildSummary> fetchBuildSummaries(String jobUrl, int perJobLimit) throws Exception {
        String apiUrl = toApiJsonUrl(jobUrl)
                + "?tree=builds[number,result,timestamp,duration]{0," + perJobLimit + "}";
        JsonNode root = fetchJson(apiUrl);
        JsonNode builds = root.path("builds");
        if (!builds.isArray()) {
            return List.of();
        }

        List<JenkinsBuildSummary> results = new ArrayList<>();
        for (JsonNode build : builds) {
            int buildNumber = build.path("number").asInt(-1);
            long startTime = build.path("timestamp").asLong(0L);
            long duration = build.path("duration").asLong(0L);
            String status = build.path("result").isNull() ? null : build.path("result").asText(null);
            if (buildNumber > 0 && startTime > 0) {
                results.add(new JenkinsBuildSummary(buildNumber, status, startTime, duration));
            }
        }
        return results;
    }

    private JsonNode fetchJson(String url) throws Exception {
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.GET, authEntity(), String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("Jenkins API returned status " + response.getStatusCode());
            }
            if (response.getBody() == null || response.getBody().isBlank()) {
                throw new IllegalStateException("Jenkins API returned empty body");
            }
            return objectMapper.readTree(response.getBody());
        } catch (RestClientException e) {
            throw new IllegalStateException("Jenkins API call failed for " + url, e);
        }
    }

    private HttpEntity<Void> authEntity() {
        HttpHeaders headers = new HttpHeaders();
        if (hasText(jenkinsProperties.getUsername()) && hasText(jenkinsProperties.getApiToken())) {
            headers.setBasicAuth(jenkinsProperties.getUsername(), jenkinsProperties.getApiToken());
        }
        return new HttpEntity<>(headers);
    }

    private String normalizeResult(@Nullable String raw) {
        if (!hasText(raw)) return "IN_PROGRESS";
        return switch (raw.trim().toUpperCase()) {
            case "SUCCESS" -> "SUCCESS";
            case "FAILURE", "ABORTED", "UNSTABLE", "NOT_BUILT" -> "FAILURE";
            default -> "IN_PROGRESS";
        };
    }

    private boolean hasText(@Nullable String value) {
        return value != null && !value.isBlank();
    }

    private boolean isFolder(@Nullable String className) {
        return className != null && className.toLowerCase().contains("folder");
    }

    private String toApiJsonUrl(String url) {
        return ensureTrailingSlash(url) + "api/json";
    }

    private String ensureTrailingSlash(String url) {
        return url.endsWith("/") ? url : url + "/";
    }

    private long asLong(@Nullable Object value, long defaultValue) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private record JenkinsBuildSummary(int buildNumber, @Nullable String result, long startTimeMs, long durationMs) {}
}
