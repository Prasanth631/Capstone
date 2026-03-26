package com.devops.platform.entity;

import lombok.*;
import com.google.cloud.firestore.annotation.DocumentId;

import java.util.Set;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class User {

    @DocumentId
    private String id;

    private String username;
    private String email;
    private String password;

    @Builder.Default
    private Set<String> roles = Set.of("ROLE_USER");

    @Builder.Default
    private long createdAt = System.currentTimeMillis();

    @Builder.Default
    private long updatedAt = System.currentTimeMillis();

    public void updateTimestamp() {
        this.updatedAt = System.currentTimeMillis();
    }
}
