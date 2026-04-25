package com.devops.platform.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("FirebaseTokenService Unit Tests")
class FirebaseTokenServiceTest {

    private final FirebaseTokenService firebaseTokenService = new FirebaseTokenService();

    @Test
    @DisplayName("returns empty token when Firebase app is not initialized")
    void returnsEmptyWhenFirebaseUnavailable() {
        var token = firebaseTokenService.createDashboardToken(
                "test-user",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        assertThat(token).isEmpty();
    }
}
