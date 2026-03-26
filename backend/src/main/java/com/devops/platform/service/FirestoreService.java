package com.devops.platform.service;

import com.devops.platform.dto.BuildEvent;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class FirestoreService {

    private final Firestore firestore;

    public FirestoreService(@Nullable Firestore firestore) {
        this.firestore = firestore;
        if (firestore == null) {
            log.warn("Firestore is not available — all write operations will be no-ops");
        }
    }

    public void writeBuildEvent(BuildEvent event) {
        if (firestore == null) {
            log.debug("Firestore unavailable — skipping writeBuildEvent for build #{}", event.getBuildNumber());
            return;
        }

        try {
            Map<String, Object> data = new HashMap<>();
            data.put("buildNumber", event.getBuildNumber());
            data.put("jobName", event.getJobName());
            data.put("stage", event.getStage());
            data.put("status", event.getStatus());
            data.put("duration", event.getDuration());
            data.put("gitBranch", event.getGitBranch());
            data.put("gitCommit", event.getGitCommit());
            data.put("triggerType", event.getTriggerType());
            data.put("timestamp", event.getTimestamp() > 0 ? event.getTimestamp() : Instant.now().toEpochMilli());

            String docId = event.getJobName() + "-" + event.getBuildNumber();
            DocumentReference docRef = firestore.collection("builds").document(docId);
            docRef.set(data).get();

            // Write test results as sub-document if present
            Map<String, Object> testResults = event.getTestResults();
            if (testResults != null && !testResults.isEmpty()) {
                firestore.collection("builds").document(docId)
                        .collection("testResults")
                        .document("results")
                        .set(new HashMap<>(testResults)).get();
            }

            log.info("Build event written to Firestore: {}", docId);
        } catch (Exception e) {
            log.error("Failed to write build event to Firestore", e);
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
}
