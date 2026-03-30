package com.devops.platform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collections;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JwtAuthenticationFilter Unit Tests")
class JwtAuthenticationFilterTest {

    @Mock private JwtTokenProvider tokenProvider;
    @Mock private CustomUserDetailsService userDetailsService;
    @Mock private HttpServletRequest request;
    @Mock private HttpServletResponse response;
    @Mock private FilterChain filterChain;

    private JwtAuthenticationFilter jwtFilter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtFilter = new JwtAuthenticationFilter(tokenProvider, userDetailsService);
    }

    @Test
    @DisplayName("should authenticate when valid JWT is present")
    void shouldAuthenticateWithValidJwt() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer valid-jwt-token");
        when(tokenProvider.validateToken("valid-jwt-token")).thenReturn(true);
        when(tokenProvider.getUsernameFromToken("valid-jwt-token")).thenReturn("testuser");

        UserDetails userDetails = new User("testuser", "password", Collections.emptyList());
        when(userDetailsService.loadUserByUsername("testuser")).thenReturn(userDetails);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("testuser");
    }

    @Test
    @DisplayName("should continue filter chain without auth when no token present")
    void shouldContinueWithoutAuthWhenNoToken() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("should continue without auth when token is invalid")
    void shouldContinueWithoutAuthWhenInvalidToken() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer invalid-token");
        when(tokenProvider.validateToken("invalid-token")).thenReturn(false);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("should not extract token when Authorization header has wrong prefix")
    void shouldNotExtractTokenWithWrongPrefix() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Basic some-credentials");

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(tokenProvider);
    }

    @Test
    @DisplayName("should not extract token when Authorization header is empty string")
    void shouldNotExtractTokenWhenEmpty() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("");

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
