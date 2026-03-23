package com.devops.platform.service;

import com.devops.platform.dto.AuthResponse;
import com.devops.platform.dto.LoginRequest;
import com.devops.platform.dto.RegisterRequest;
import com.devops.platform.entity.User;
import com.devops.platform.repository.UserRepository;
import com.devops.platform.security.JwtTokenProvider;
import io.micrometer.core.instrument.Counter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final Counter loginAttemptsCounter;
    private final Counter loginFailuresCounter;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username is already taken: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use: " + request.getEmail());
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);
        log.info("User registered successfully: {}", user.getUsername());

        String token = tokenProvider.generateToken(user.getUsername());
        return AuthResponse.success(token, user.getUsername(), user.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        loginAttemptsCounter.increment();

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            String token = tokenProvider.generateToken(authentication);

            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));

            log.info("User logged in successfully: {}", user.getUsername());
            return AuthResponse.success(token, user.getUsername(), user.getEmail());

        } catch (BadCredentialsException e) {
            loginFailuresCounter.increment();
            log.warn("Failed login attempt for username: {}", request.getUsername());
            throw e;
        }
    }
}
