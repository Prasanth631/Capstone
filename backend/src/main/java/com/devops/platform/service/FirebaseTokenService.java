package com.devops.platform.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class FirebaseTokenService {

    public Optional<String> createDashboardToken(String username,
                                                 Collection<? extends GrantedAuthority> authorities) {
        if (username == null || username.isBlank()) {
            return Optional.empty();
        }

        if (FirebaseApp.getApps().isEmpty()) {
            log.warn("Cannot mint Firebase custom token; FirebaseApp is not initialized");
            return Optional.empty();
        }

        try {
            Map<String, Object> claims = new HashMap<>();
            claims.put("roles", authorities.stream().map(GrantedAuthority::getAuthority).toList());
            claims.put("scope", "dashboard");
            return Optional.of(FirebaseAuth.getInstance().createCustomToken(username, claims));
        } catch (FirebaseAuthException e) {
            log.error("Failed to create Firebase custom token for user={}", username, e);
            return Optional.empty();
        }
    }
}
