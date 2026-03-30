package com.devops.platform.security;

import com.devops.platform.entity.User;
import com.devops.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CustomUserDetailsService Unit Tests")
class CustomUserDetailsServiceTest {

    @Mock private UserRepository userRepository;
    private CustomUserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {
        userDetailsService = new CustomUserDetailsService(userRepository);
    }

    @Test
    @DisplayName("should load user by username successfully")
    void shouldLoadUserByUsername() {
        User user = User.builder()
                .username("testuser")
                .password("encoded-password")
                .roles(List.of("ROLE_USER"))
                .build();
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        UserDetails result = userDetailsService.loadUserByUsername("testuser");

        assertThat(result.getUsername()).isEqualTo("testuser");
        assertThat(result.getPassword()).isEqualTo("encoded-password");
        assertThat(result.getAuthorities()).hasSize(1);
        assertThat(result.getAuthorities().iterator().next().getAuthority()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("should load user with multiple roles")
    void shouldLoadUserWithMultipleRoles() {
        User user = User.builder()
                .username("admin")
                .password("encoded-password")
                .roles(List.of("ROLE_USER", "ROLE_ADMIN"))
                .build();
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        UserDetails result = userDetailsService.loadUserByUsername("admin");

        assertThat(result.getAuthorities()).hasSize(2);
    }

    @Test
    @DisplayName("should throw UsernameNotFoundException when user not found")
    void shouldThrowWhenUserNotFound() {
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userDetailsService.loadUserByUsername("nonexistent"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("nonexistent");
    }
}
