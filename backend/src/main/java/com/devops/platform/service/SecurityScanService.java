package com.devops.platform.service;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.Query;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ExecutionException;

@Slf4j
@Service
public class SecurityScanService {

    @Nullable
    private final Firestore firestore;

    private static final String COLLECTION = "securityScans";

    public SecurityScanService(@Nullable Firestore firestore) {
        this.firestore = firestore;
        if (firestore == null) {
            log.warn("Firestore is not available - SecurityScanService will run in no-op mode");
        }
    }

    public boolean isAvailable() {
        return firestore != null;
    }

    /**
     * Store a Trivy scan result sent from the Jenkins pipeline.
     */
    public void storeScanResult(Map<String, Object> scanResult) {
        if (firestore == null) {
            log.debug("Firestore unavailable - skipping storeScanResult");
            return;
        }
        try {
            String image = (String) scanResult.getOrDefault("image", "unknown");
            String docId = image.replace("/", "_").replace(":", "_") + "_" + System.currentTimeMillis();

            Map<String, Object> doc = new HashMap<>(scanResult);
            doc.put("storedAt", System.currentTimeMillis());

            firestore.collection(COLLECTION).document(docId).set(doc).get();
            log.info("Stored Trivy scan result for image: {}", image);
        } catch (InterruptedException | ExecutionException e) {
            log.error("Failed to store security scan result", e);
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Get the latest scan result for each image (one per base image name).
     */
    public List<Map<String, Object>> getLatestScans() {
        if (firestore == null) {
            return Collections.emptyList();
        }
        try {
            List<QueryDocumentSnapshot> docs = firestore.collection(COLLECTION)
                    .orderBy("storedAt", Query.Direction.DESCENDING)
                    .limit(50)
                    .get()
                    .get()
                    .getDocuments();

            // Deduplicate: keep only the latest scan per base image name
            Map<String, Map<String, Object>> latestByImage = new LinkedHashMap<>();
            for (QueryDocumentSnapshot doc : docs) {
                Map<String, Object> data = doc.getData();
                String image = (String) data.getOrDefault("image", "unknown");
                String baseImage = image.contains(":") ? image.substring(0, image.lastIndexOf(":")) : image;
                latestByImage.putIfAbsent(baseImage, data);
            }

            return new ArrayList<>(latestByImage.values());
        } catch (InterruptedException | ExecutionException e) {
            log.error("Failed to fetch security scan results", e);
            Thread.currentThread().interrupt();
            return Collections.emptyList();
        }
    }

    /**
     * Get aggregated summary stats across all latest scans.
     */
    public Map<String, Object> getScanSummary() {
        List<Map<String, Object>> scans = getLatestScans();
        int totalCritical = 0, totalHigh = 0, totalMedium = 0, totalLow = 0;

        for (Map<String, Object> scan : scans) {
            totalCritical += toInt(scan.get("criticalCount"));
            totalHigh     += toInt(scan.get("highCount"));
            totalMedium   += toInt(scan.get("mediumCount"));
            totalLow      += toInt(scan.get("lowCount"));
        }

        boolean clean = (totalCritical == 0 && totalHigh == 0);

        Map<String, Object> summary = new HashMap<>();
        summary.put("scans", scans);
        summary.put("totalCritical", totalCritical);
        summary.put("totalHigh", totalHigh);
        summary.put("totalMedium", totalMedium);
        summary.put("totalLow", totalLow);
        summary.put("isClean", clean);
        summary.put("scanCount", scans.size());
        summary.put("generatedAt", System.currentTimeMillis());
        return summary;
    }

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number n) return n.intValue();
        try { return Integer.parseInt(val.toString()); } catch (NumberFormatException e) { return 0; }
    }
}
