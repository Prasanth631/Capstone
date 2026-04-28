# ===== Runtime =====
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Create non-root user
RUN useradd --uid 10001 --create-home --shell /usr/sbin/nologin appuser

# Copy JAR from Jenkins workspace target folder
COPY target/*.jar app.jar

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

# JVM tuning for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Dio.netty.handler.ssl.noOpenSsl=true"

EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget -qO- http://localhost:8082/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
