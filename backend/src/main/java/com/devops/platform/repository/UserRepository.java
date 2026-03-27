package com.devops.platform.repository;

import com.devops.platform.entity.User;

import java.util.Optional;

public interface UserRepository {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    User save(User user);
    void deleteAll();
}
