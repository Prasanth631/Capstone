package com.devops.platform.controller;

import com.devops.platform.dto.JenkinsBackfillRequest;
import com.devops.platform.dto.JenkinsBackfillResponse;
import com.devops.platform.service.JenkinsBackfillService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Admin Controller Integration Tests")
class AdminControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private JenkinsBackfillService jenkinsBackfillService;

    @Test
    @DisplayName("POST /api/admin/backfill/jenkins - requires admin role")
    void testTriggerBackfillRequiresAdminRole() throws Exception {
        mockMvc.perform(post("/api/admin/backfill/jenkins")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/admin/backfill/jenkins - returns success payload for admin user")
    void testTriggerBackfillSuccess() throws Exception {
        when(jenkinsBackfillService.runBackfill(any())).thenReturn(
                JenkinsBackfillResponse.builder()
                        .success(true)
                        .message("Backfill completed successfully")
                        .jobsProcessed(3)
                        .buildsProcessed(1200)
                        .perJobLimit(500)
                        .build()
        );

        String payload = """
                {
                  "allJobs": true,
                  "perJobLimit": 500
                }
                """;

        mockMvc.perform(post("/api/admin/backfill/jenkins")
                        .with(user("admin-user").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.success").value(true))
                .andExpect(jsonPath("$.data.jobsProcessed").value(3))
                .andExpect(jsonPath("$.data.buildsProcessed").value(1200))
                .andExpect(jsonPath("$.data.perJobLimit").value(500));

        ArgumentCaptor<JenkinsBackfillRequest> requestCaptor = ArgumentCaptor.forClass(JenkinsBackfillRequest.class);
        verify(jenkinsBackfillService).runBackfill(requestCaptor.capture());
    }

    @Test
    @DisplayName("POST /api/admin/backfill/jenkins - returns failure payload when service reports failure")
    void testTriggerBackfillFailurePayload() throws Exception {
        when(jenkinsBackfillService.runBackfill(any())).thenReturn(
                JenkinsBackfillResponse.builder()
                        .success(false)
                        .message("Jenkins base URL is not configured")
                        .jobsProcessed(0)
                        .buildsProcessed(0)
                        .perJobLimit(500)
                        .build()
        );

        mockMvc.perform(post("/api/admin/backfill/jenkins")
                        .with(user("admin-user").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.success").value(false))
                .andExpect(jsonPath("$.data.message").value("Jenkins base URL is not configured"));
    }
}
