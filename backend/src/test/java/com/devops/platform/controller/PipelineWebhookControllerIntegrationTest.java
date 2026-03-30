package com.devops.platform.controller;

import com.devops.platform.dto.BuildEvent;
import com.devops.platform.service.PipelineService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("PipelineWebhookController Integration Tests")
class PipelineWebhookControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private PipelineService pipelineService;

    @Test
    @DisplayName("POST /api/webhook/jenkins - should accept valid build event")
    void shouldAcceptValidBuildEvent() throws Exception {
        BuildEvent event = BuildEvent.builder()
                .buildNumber(42)
                .jobName("devops-platform")
                .stage("Build")
                .status("SUCCESS")
                .duration(5000L)
                .gitBranch("main")
                .gitCommit("abc123def")
                .triggerType("push")
                .timestamp(System.currentTimeMillis())
                .build();

        mockMvc.perform(post("/api/webhook/jenkins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(event)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("Build #42"));

        verify(pipelineService).processWebhook(any(BuildEvent.class));
    }

    @Test
    @DisplayName("POST /api/webhook/jenkins - should accept minimal event")
    void shouldAcceptMinimalEvent() throws Exception {
        String json = """
                {
                    "buildNumber": 1,
                    "jobName": "test-job",
                    "stage": "Checkout",
                    "status": "IN_PROGRESS"
                }
                """;

        mockMvc.perform(post("/api/webhook/jenkins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/webhook/jenkins - should process failure events")
    void shouldProcessFailureEvents() throws Exception {
        BuildEvent event = BuildEvent.builder()
                .buildNumber(99)
                .jobName("failing-job")
                .stage("Unit & Integration Tests")
                .status("FAILURE")
                .duration(30000L)
                .timestamp(System.currentTimeMillis())
                .build();

        mockMvc.perform(post("/api/webhook/jenkins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(event)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("Build #99"));
    }
}
