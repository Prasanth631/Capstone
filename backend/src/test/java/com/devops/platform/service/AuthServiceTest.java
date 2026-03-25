package com.devops.platform.service;

import com.devops.platform.dto.AuthResponse;
import com.devops.platform.dto.LoginRequest;
import com.devops.platform.dto.RegisterRequest;
import com.devops.platform.entity.User;
import com.devops.platform.repository.UserRepository;
import com.devops.platform.security.JwtTokenProvider;
import io.micrometer.core.instrument.Counter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider tokenProvider;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private Counter loginAttemptsCounter;
    @Mock private Counter loginFailuresCounter;

    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User testUser;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, tokenProvider, authenticationManager, loginAttemptsCounter, loginFailuresCounter);
        
        registerRequest = new RegisterRequest("testuser", "test@email.com", "password123");
        loginRequest = new LoginRequest("testuser", "password123");
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@email.com")
                .password("$2a$10$encodedPassword")
                .build();
    }

    @Test
    @DisplayName("Register - Success: creates user and returns JWT")
    void testRegisterSuccess() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@email.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("$2a$10$encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(tokenProvider.generateToken("testuser")).thenReturn("jwt-token-123");

        AuthResponse response = authService.register(registerRequest);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt-token-123");
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getEmail()).isEqualTo("test@email.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Register - Failure: duplicate username")
    void testRegisterDuplicateUsername() {
        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Username is already taken");
    }

    @Test
    @DisplayName("Register - Failure: duplicate email")
    void testRegisterDuplicateEmail() {
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@email.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email is already in use");
    }

    @Test
    @DisplayName("Login - Success: authenticates and returns JWT")
    void testLoginSuccess() {
        Authentication mockAuth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(mockAuth);
        when(tokenProvider.generateToken(mockAuth)).thenReturn("jwt-login-token");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        AuthResponse response = authService.login(loginRequest);

        assertThat(response).isNotNull();
        assertThat(response.getToken()).isEqualTo("jwt-login-token");
        assertThat(response.getUsername()).isEqualTo("testuser");
        verify(loginAttemptsCounter).increment();
        verify(loginFailuresCounter, never()).increment();
    }

    @Test
    @DisplayName("Login - Failure: wrong password throws BadCredentialsException")
    void testLoginWrongPassword() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(BadCredentialsException.class);

        verify(loginAttemptsCounter).increment();
        verify(loginFailuresCounter).increment();
    }

    @Test
    @DisplayName("Login - Failure: user not found")
    void testLoginUserNotFound() {
        Authentication mockAuth = mock(Authentication.class);
        when(authenticationManager.authenticate(any())).thenReturn(mockAuth);
        when(tokenProvider.generateToken(mockAuth)).thenReturn("token");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(Exception.class);
    }
}
