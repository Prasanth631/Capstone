package com.devops.platform.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

@DisplayName("JwtTokenProvider Unit Tests")
class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        // 256-bit secret key, 1 hour expiration
        String secret = "myTestSecretKeyThatIsAtLeast256BitsLongForHmacSHA256Algorithm!";
        tokenProvider = new JwtTokenProvider(secret, 3600000);
    }

    @Test
    @DisplayName("Generate token - produces non-null JWT string")
    void testGenerateToken() {
        String token = tokenProvider.generateToken("testuser");

        assertThat(token).isNotNull();
        assertThat(token).isNotBlank();
        assertThat(token.split("\\.")).hasSize(3); // JWT format: header.payload.signature
    }

    @Test
    @DisplayName("Validate token - returns true for valid token")
    void testValidateToken() {
        String token = tokenProvider.generateToken("testuser");

        assertThat(tokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("Extract username - returns correct username from token")
    void testGetUsernameFromToken() {
        String token = tokenProvider.generateToken("testuser");

        String username = tokenProvider.getUsernameFromToken(token);

        assertThat(username).isEqualTo("testuser");
    }

    @Test
    @DisplayName("Validate token - returns false for tampered token")
    void testTamperedToken() {
        String token = tokenProvider.generateToken("testuser");
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThat(tokenProvider.validateToken(tampered)).isFalse();
    }

    @Test
    @DisplayName("Validate token - returns false for expired token")
    void testExpiredToken() {
        // Create provider with 0ms expiration
        JwtTokenProvider expiredProvider = new JwtTokenProvider(
                "myTestSecretKeyThatIsAtLeast256BitsLongForHmacSHA256Algorithm!", 0);
        String token = expiredProvider.generateToken("testuser");

        // Token should be expired immediately
        assertThat(expiredProvider.validateToken(token)).isFalse();
    }

    @Test
    @DisplayName("Validate token - returns false for null/blank token")
    void testNullToken() {
        assertThat(tokenProvider.validateToken(null)).isFalse();
        assertThat(tokenProvider.validateToken("")).isFalse();
        assertThat(tokenProvider.validateToken("not-a-jwt")).isFalse();
    }
}
