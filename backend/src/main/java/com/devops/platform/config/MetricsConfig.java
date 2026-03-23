package com.devops.platform.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MetricsConfig {

    @Bean
    public Counter buildTotalCounter(MeterRegistry registry) {
        return Counter.builder("build.total")
                .description("Total number of builds processed")
                .tag("application", "devops-platform")
                .register(registry);
    }

    @Bean
    public Timer buildDurationTimer(MeterRegistry registry) {
        return Timer.builder("build.duration")
                .description("Duration of builds")
                .tag("application", "devops-platform")
                .register(registry);
    }

    @Bean
    public Counter loginAttemptsCounter(MeterRegistry registry) {
        return Counter.builder("login.attempts")
                .description("Total login attempts")
                .tag("application", "devops-platform")
                .register(registry);
    }

    @Bean
    public Counter loginFailuresCounter(MeterRegistry registry) {
        return Counter.builder("login.failures")
                .description("Total failed login attempts")
                .tag("application", "devops-platform")
                .register(registry);
    }
}
