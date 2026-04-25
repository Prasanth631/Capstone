package com.devops.platform.controller;

import com.devops.platform.dto.RegisterRequest;
import com.devops.platform.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Dashboard Controller Integration Tests")
class DashboardControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;

    private String authToken;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll();

        RegisterRequest regRequest = new RegisterRequest("dashtest", "dashtest@test.com", "password123");
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(regRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        authToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("data").get("token").asText();
    }

    @Test
    @DisplayName("GET /api/dashboard/builds returns build list")
    void testGetBuilds() throws Exception {
        mockMvc.perform(get("/api/dashboard/builds")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.builds").isArray());
    }

    @Test
    @DisplayName("GET /api/dashboard/pipeline-status returns pipeline list")
    void testGetPipelineStatus() throws Exception {
        mockMvc.perform(get("/api/dashboard/pipeline-status")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("GET /api/dashboard/metrics returns system metrics")
    void testGetMetrics() throws Exception {
        mockMvc.perform(get("/api/dashboard/metrics")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cpuUsage").exists())
                .andExpect(jsonPath("$.data.jvmHeapUsed").exists())
                .andExpect(jsonPath("$.data.threadCount").exists());
    }

    @Test
    @DisplayName("GET /api/dashboard/docker-status returns Docker info")
    void testGetDockerStatus() throws Exception {
        mockMvc.perform(get("/api/dashboard/docker-status")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.containers").exists());
    }

    @Test
    @DisplayName("GET /api/dashboard/k8s-status returns Kubernetes info")
    void testGetKubernetesStatus() throws Exception {
        mockMvc.perform(get("/api/dashboard/k8s-status")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.namespaces").exists());
    }

    @Test
    @DisplayName("GET /api/dashboard/build-analytics returns analytics")
    void testGetBuildAnalytics() throws Exception {
        mockMvc.perform(get("/api/dashboard/build-analytics")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalBuilds").exists())
                .andExpect(jsonPath("$.data.successRate").exists());
    }

    @Test
    @DisplayName("GET /api/dashboard/test-results returns test summary")
    void testGetTestResults() throws Exception {
        mockMvc.perform(get("/api/dashboard/test-results")
                        .header("Authorization", "Bearer " + authToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalTests").exists());
    }

    @Test
    @DisplayName("GET /api/dashboard/firebase-token works without auth and returns 503 when Firebase is unavailable")
    void testGetFirebaseTokenWhenFirebaseUnavailable() throws Exception {
        mockMvc.perform(get("/api/dashboard/firebase-token"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/webhook/jenkins accepts build event")
    void testJenkinsWebhook() throws Exception {
        String webhookPayload = """
                {
                    "buildNumber": 42,
                    "jobName": "devops-platform",
                    "stage": "Build",
                    "status": "SUCCESS",
                    "duration": 15000,
                    "gitBranch": "main",
                    "gitCommit": "abc123",
                    "triggerType": "push",
                    "timestamp": 1711234567890
                }
                """;

        mockMvc.perform(post("/api/webhook/jenkins")
                        .header("X-Jenkins-Webhook-Token", "test-webhook-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
