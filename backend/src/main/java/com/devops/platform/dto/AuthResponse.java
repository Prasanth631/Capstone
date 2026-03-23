package com.devops.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;
    private String type;
    private String username;
    private String email;
    private String message;

    public static AuthResponse success(String token, String username, String email) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .username(username)
                .email(email)
                .message("Authentication successful")
                .build();
    }
}
