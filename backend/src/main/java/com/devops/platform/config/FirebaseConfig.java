package com.devops.platform.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
@Slf4j
public class FirebaseConfig {

    @Value("${firebase.config-path}")
    private String firebaseConfigPath;

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                InputStream serviceAccount;

                // Try classpath first, then filesystem
                try {
                    serviceAccount = new ClassPathResource(firebaseConfigPath).getInputStream();
                } catch (IOException e) {
                    serviceAccount = new FileInputStream(firebaseConfigPath);
                }

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                FirebaseApp.initializeApp(options);
                log.info("Firebase has been initialized successfully");
            }
        } catch (IOException e) {
            log.warn("Firebase initialization skipped - config file not found at: {}. " +
                     "Firestore features will be disabled.", firebaseConfigPath);
        }
    }

    @Bean
    public Firestore firestore() {
        try {
            if (!FirebaseApp.getApps().isEmpty()) {
                return FirestoreClient.getFirestore();
            }
        } catch (Exception e) {
            log.warn("Firestore bean creation failed: {}", e.getMessage());
        }
        return null;
    }
}
