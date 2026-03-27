package com.devops.platform.repository;

import com.devops.platform.entity.User;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
@Profile("test")
public class InMemoryUserRepository implements UserRepository {

    private final Map<String, User> store = new ConcurrentHashMap<>();

    @Override
    public Optional<User> findByUsername(String username) {
        return store.values().stream()
                .filter(u -> username.equals(u.getUsername()))
                .findFirst();
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return store.values().stream()
                .filter(u -> email.equals(u.getEmail()))
                .findFirst();
    }

    @Override
    public boolean existsByUsername(String username) {
        return findByUsername(username).isPresent();
    }

    @Override
    public boolean existsByEmail(String email) {
        return findByEmail(email).isPresent();
    }

    @Override
    public User save(User user) {
        if (user.getId() == null) {
            user.setId(UUID.randomUUID().toString());
        }
        user.updateTimestamp();
        store.put(user.getId(), user);
        return user;
    }

    @Override
    public void deleteAll() {
        store.clear();
    }
}
