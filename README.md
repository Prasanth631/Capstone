# DevOps Intelligence Platform

Production-focused CI/CD platform with secure Jenkins-to-backend webhooks, Firebase-backed realtime dashboard projections, and full-stack Kubernetes deployments.

## Core Stack
- Backend: Spring Boot 3.4, Java 17, Spring Security, JWT
- Frontend: React 18, Vite 6, Tailwind CSS
- Realtime Data: Firestore listeners + backend webhook projection updates
- CI/CD: Jenkins Declarative Pipeline (11 stages)
- Containers: Docker multi-stage builds (backend + frontend)
- Orchestration: Kubernetes (dev, staging, production) + Ingress + HPA
- Monitoring: Prometheus + Grafana + Micrometer

## Realtime Architecture
1. Jenkins stage events call `POST /api/webhook/jenkins` with `X-Jenkins-Webhook-Token`.
2. Backend validates signature and updates:
   - canonical `builds/{doc}`
   - ordered `builds/{doc}/events/{timestamp-sequence}`
   - live `dashboardEvents/{timestamp-build-sequence}`
   - merged `dashboard/overview` projection
3. Frontend authenticates to backend (JWT), requests `/api/dashboard/firebase-token`, signs into Firebase with custom token, and subscribes to:
   - `dashboard/overview`
   - `builds` (history deltas)
   - `dashboardEvents` (live stage stream)
   - `deployments` (environment health)

## Security Changes
- `/api/dashboard/**` requires JWT authentication.
- `/api/admin/**` requires `ROLE_ADMIN`.
- `/api/webhook/jenkins` rejects unsigned/invalid requests (401).
- JWT secret has no insecure default fallback.
- Kubernetes manifest secrets are externalized to `app-secrets` / `firebase-service-account`.
- Firestore rules are auth-gated for dashboard/build/deployment collections.

## API Summary
- `POST /api/auth/register` public
- `POST /api/auth/login` public
- `GET /api/dashboard/firebase-token` JWT auth required
- `GET /api/dashboard/builds` JWT auth required
- `GET /api/dashboard/pipeline-status` JWT auth required
- `GET /api/dashboard/build-analytics` JWT auth required
- `GET /api/dashboard/metrics` JWT auth required
- `GET /api/dashboard/test-results` JWT auth required
- `GET /api/dashboard/docker-status` JWT auth required
- `GET /api/dashboard/k8s-status` JWT auth required
- `POST /api/webhook/jenkins` signed webhook required (`X-Jenkins-Webhook-Token`)

## Local Development
### 1) Environment
```bash
cp .env.example .env
```

### 2) Backend
```bash
cd backend
mvn -B test
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### 3) Frontend
```bash
cd frontend
npm install
npm run dev
```

## Docker Compose
```bash
docker compose up -d --build
docker compose ps
```

Services:
- Backend: `http://localhost:8082`
- Frontend: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## Jenkins Requirements
Configure these Jenkins credentials:
- `dockerhub-credentials` (username/password)
- `kubeconfig-credential` (secret file)
- `jenkins-webhook-secret` (secret text)

Jenkins parameters support environment-specific overrides for image names, namespaces, webhook URL, and manifest filename.

## Kubernetes Deployment
Apply one manifest per environment:
```bash
kubectl apply -f k8s/dev/manifests.yaml
kubectl apply -f k8s/staging/manifests.yaml
kubectl apply -f k8s/production/manifests.yaml
```

### Required Kubernetes Secrets
Create these before deployment:
```bash
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret='<jwt-secret>' \
  --from-literal=jenkins-webhook-secret='<webhook-secret>' \
  -n <namespace>

kubectl create secret generic firebase-service-account \
  --from-file=service-account.json='<path-to-firebase-service-account.json>' \
  -n <namespace>
```

Production ingress expects TLS secret:
```bash
kubectl create secret tls devops-platform-tls \
  --cert=<tls-cert-file> \
  --key=<tls-key-file> \
  -n production
```

## Verification Commands
```bash
# Backend
cd backend && mvn -B test

# Frontend
cd frontend && npm run build

# Compose render check
docker compose config

# Kubernetes validation
kubectl apply --dry-run=client -f k8s/dev/manifests.yaml
kubectl apply --dry-run=client -f k8s/staging/manifests.yaml
kubectl apply --dry-run=client -f k8s/production/manifests.yaml
```

## Notes
- Realtime pipeline progression is event-driven from Jenkins webhooks; scheduler refresh is reserved for infra metrics.
- If Firebase service account is missing, backend Firestore writes are no-op and `/api/dashboard/firebase-token` returns 503.
- Ops procedures are documented in `docs/operations-runbook.md`.
