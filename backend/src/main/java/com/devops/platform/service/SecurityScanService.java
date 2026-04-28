package com.devops.platform.service;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ExecutionException;

@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityScanService {

    private final Firestore firestore;
    private static final String COLLECTION = "securityScans";

    /**
     * Store a Trivy scan result sent from Jenkins pipeline.
     */
    public void storeScanResult(Map<String, Object> scanResult) {
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
     * Get the latest scan result for each image (one per image tag).
     */
    public List<Map<String, Object>> getLatestScans() {
        try {
            List<QueryDocumentSnapshot> docs = firestore.collection(COLLECTION)
                    .orderBy("storedAt", com.google.cloud.firestore.Query.Direction.DESCENDING)
                    .limit(50)
                    .get()
                    .get()
                    .getDocuments();

            // Deduplicate: keep only the latest scan per base image name
            Map<String, Map<String, Object>> latestByImage = new LinkedHashMap<>();
            for (QueryDocumentSnapshot doc : docs) {
                Map<String, Object> data = doc.getData();
                String image = (String) data.getOrDefault("image", "unknown");
                // Strip tag for grouping by base image
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
     * Get summary stats across all latest scans.
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

        return Map.of(
                "scans", scans,
                "totalCritical", totalCritical,
                "totalHigh", totalHigh,
                "totalMedium", totalMedium,
                "totalLow", totalLow,
                "isClean", clean,
                "scanCount", scans.size(),
                "generatedAt", System.currentTimeMillis()
        );
    }

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).intValue();
        try { return Integer.parseInt(val.toString()); } catch (NumberFormatException e) { return 0; }
    }
}
