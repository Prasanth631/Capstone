package com.devops.platform.repository;

import com.devops.platform.entity.User;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

@Repository
@Slf4j
public class UserRepository {

    @Nullable
    private final Firestore firestore;

    public UserRepository(@Nullable Firestore firestore) {
        this.firestore = firestore;
    }

    private CollectionReference getUsersCollection() {
        if (firestore == null) {
            throw new IllegalStateException("Firestore is not configured. Cannot perform DB operations.");
        }
        return firestore.collection("users");
    }

    public Optional<User> findByUsername(String username) {
        try {
            ApiFuture<QuerySnapshot> future = getUsersCollection()
                    .whereEqualTo("username", username)
                    .limit(1).get();
            QuerySnapshot documents = future.get();
            if (!documents.isEmpty()) {
                DocumentSnapshot doc = documents.getDocuments().get(0);
                User user = doc.toObject(User.class);
                if (user != null) user.setId(doc.getId());
                return Optional.ofNullable(user);
            }
        } catch (InterruptedException | ExecutionException e) {
            log.error("Failed to find user by username", e);
        }
        return Optional.empty();
    }

    public Optional<User> findByEmail(String email) {
        try {
            ApiFuture<QuerySnapshot> future = getUsersCollection()
                    .whereEqualTo("email", email)
                    .limit(1).get();
            QuerySnapshot documents = future.get();
            if (!documents.isEmpty()) {
                DocumentSnapshot doc = documents.getDocuments().get(0);
                User user = doc.toObject(User.class);
                if (user != null) user.setId(doc.getId());
                return Optional.ofNullable(user);
            }
        } catch (InterruptedException | ExecutionException e) {
            log.error("Failed to find user by email", e);
        }
        return Optional.empty();
    }

    public boolean existsByUsername(String username) {
        return findByUsername(username).isPresent();
    }

    public boolean existsByEmail(String email) {
        return findByEmail(email).isPresent();
    }

    public User save(User user) {
        try {
            String userId = user.getId();
            if (userId == null) {
                userId = UUID.randomUUID().toString();
                user.setId(userId);
            }
            user.updateTimestamp();
            getUsersCollection().document(userId).set(user).get();
            return user;
        } catch (InterruptedException | ExecutionException e) {
            log.error("Failed to save user", e);
            throw new RuntimeException("Could not save user to Firestore", e);
        }
    }

    /**
     * For tests only
     */
    public void deleteAll() {
        if (firestore == null) return;
        try {
            QuerySnapshot snapshot = getUsersCollection().get().get();
            for (DocumentSnapshot doc : snapshot.getDocuments()) {
                doc.getReference().delete().get();
            }
        } catch (Exception e) {
            log.error("Failed to delete all users", e);
        }
    }
}
