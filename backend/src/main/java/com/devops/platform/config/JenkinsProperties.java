package com.devops.platform.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "jenkins")
@Data
public class JenkinsProperties {
    private String baseUrl;
    private String username;
    private String apiToken;
    private Backfill backfill = new Backfill();

    @Data
    public static class Backfill {
        private boolean startupEnabled = true;
        private int defaultPerJobLimit = 500;
        private int skipIfRecentMinutes = 360;
    }
}
