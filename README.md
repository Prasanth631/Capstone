# DevOps Intelligence Platform

> Automated CI/CD Pipeline with Real-Time Monitoring Dashboard

A production-grade deployment system that takes code commits to live deployment with near-zero downtime, featuring a Spring Boot backend, React dashboard, Jenkins pipeline, Docker/Kubernetes multi-environment deployment, and Prometheus/Grafana monitoring.

---

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Developer   │───>│  GitHub/Git  │───>│     Jenkins      │
│  Code Commit │    │   Webhook    │    │  11-Stage Pipeline│
└─────────────┘    └──────────────┘    └────────┬────────┘
                                                │
                   ┌────────────────────────────┤
                   │         Pipeline Stages     │
                   ├─ Checkout                   │
                   ├─ Build (Maven)              │
                   ├─ Unit & Integration Tests   │
                   ├─ Static Analysis (SonarQube)│
                   ├─ API Tests (Newman)         │
                   ├─ Docker Build & Push        │
                   ├─ Deploy to Dev              │
                   ├─ Smoke Test                 │
                   ├─ Deploy to Staging          │
                   ├─ Manual Approval            │
                   └─ Deploy to Production       │
                                                │
       ┌────────────────────────────────────────┘
       │
       v
┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│ Spring Boot  │───>│   Firebase    │<───│    React     │
│   Backend    │    │   Firestore   │    │  Dashboard   │
│  (JWT Auth)  │    │  (Real-time)  │    │ (Real-time)  │
└──────┬───────┘    └───────────────┘    └──────────────┘
       │
       v
┌──────────────┐    ┌───────────────┐
│  Kubernetes  │    │  Prometheus + │
│  3 Namespaces│    │    Grafana    │
│ dev/stg/prod │    │  Monitoring   │
└──────────────┘    └───────────────┘
```

## Tech Stack

| Layer        | Technology                                     |
|-------------|------------------------------------------------|
| Backend      | Spring Boot 3.4, Java 17, Spring Security |
| Auth         | JWT (JJWT), BCrypt                             |
| Frontend     | React 18, Vite 6, Tailwind CSS, Recharts       |
| Real-time DB | Firebase Firestore (onSnapshot listeners)      |
| CI/CD        | Jenkins (Declarative Pipeline, 11 stages)      |
| Containers   | Docker (multi-stage builds)                    |
| Orchestration| Kubernetes (3 namespaces, HPA, Ingress)        |
| Monitoring   | Prometheus + Grafana + Micrometer              |
| Testing      | JUnit 5, MockMvc, Postman/Newman, Selenium     |
| Code Quality | SonarQube, JaCoCo (≥80% coverage)              |

---

## Quick Start

### Prerequisites

- Java 17 + Maven 3.9+
- Node.js 20+
- Docker & Docker Compose
- (Optional) Minikube/Kind for K8s testing

### 1. Clone & Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The backend starts at `http://localhost:8082`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard opens at `http://localhost:5173`.

### 3. Docker Compose (Full Stack)

```bash
docker-compose up -d
```

Services:
- **Backend**: http://localhost:8082
- **Frontend**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

---

## Project Structure

```
Capstone/
├── backend/          → Spring Boot API (JWT, Firebase, Actuator)
├── frontend/         → React Dashboard (Vite, Tailwind, Recharts)
├── jenkins/          → Jenkinsfile (11-stage pipeline)
├── k8s/              → Kubernetes manifests (dev/staging/production)
├── monitoring/       → Prometheus config + Grafana dashboards
├── postman/          → API test collection + environments
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

| Method | Endpoint                        | Auth   | Description                     |
|--------|---------------------------------|--------|---------------------------------|
| POST   | `/api/auth/register`            | Public | Register new user, returns JWT  |
| POST   | `/api/auth/login`               | Public | Login, returns JWT              |
| GET    | `/api/dashboard/builds`         | JWT    | Paged build history (`limit`, `cursor`) |
| GET    | `/api/dashboard/pipeline-status`| JWT    | Active pipeline status          |
| GET    | `/api/dashboard/metrics`        | JWT    | System metrics (CPU/RAM/JVM)    |
| GET    | `/api/dashboard/test-results`   | JWT    | Test results summary            |
| GET    | `/api/dashboard/docker-status`  | JWT    | Docker container info           |
| GET    | `/api/dashboard/k8s-status`     | JWT    | Kubernetes cluster state        |
| GET    | `/api/dashboard/build-analytics`| JWT    | Build analytics summary         |
| POST   | `/api/webhook/jenkins`          | Public | Jenkins stage webhook receiver  |
| POST   | `/api/admin/backfill/jenkins`   | JWT    | Trigger Jenkins historical backfill |
| GET    | `/actuator/health`              | Public | Health check                    |
| GET    | `/actuator/prometheus`          | Public | Prometheus metrics              |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable             | Description                       |
|---------------------|-----------------------------------|
| `JWT_SECRET`         | 256-bit secret for JWT signing    |
| `FIREBASE_CONFIG_PATH` | Path to Firebase service account JSON |
| `JENKINS_BASE_URL`   | Jenkins base URL used for backfill |
| `JENKINS_USERNAME`   | Jenkins API username               |
| `JENKINS_API_TOKEN`  | Jenkins API token/password         |
| `JENKINS_BACKFILL_DEFAULT_PER_JOB_LIMIT` | Max builds imported per job (default `500`) |
| `DOCKER_USERNAME`    | Docker Hub username               |
| `DOCKER_PASSWORD`    | Docker Hub password/token         |

---

## Testing

```bash
# Unit + Integration tests
cd backend && mvn test

# Coverage report
mvn verify
open target/site/jacoco/index.html

# API tests (Newman)
npx newman run postman/DevOps-Platform.postman_collection.json \
  -e postman/environments/dev.postman_environment.json
```

---

## Kubernetes Deployment

```bash
# Dev
kubectl apply -f k8s/dev/

# Staging
kubectl apply -f k8s/staging/

# Production (includes HPA: 2-10 pods at 60% CPU)
kubectl apply -f k8s/production/
```

---

## Credentials Needed

| Item                        | How to Get It                                    |
|-----------------------------|--------------------------------------------------|
| Firebase Service Account    | Firebase Console → Project Settings → Service Accounts → Generate Key |
| Docker Hub Credentials      | hub.docker.com → Account Settings                |
| GitHub Personal Access Token| GitHub → Settings → Developer Settings → Tokens  |
| SonarQube Token             | SonarQube → My Account → Security → Generate     |
| Jenkins Admin Password      | Set during Jenkins setup                         |
