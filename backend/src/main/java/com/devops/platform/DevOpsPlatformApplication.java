package com.devops.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DevOpsPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(DevOpsPlatformApplication.class, args);
    }
}
