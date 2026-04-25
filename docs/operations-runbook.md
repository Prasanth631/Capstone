# Operations Runbook

## 1. Secret Rotation Checklist
1. Rotate Firebase service-account key in Google Cloud Console.
2. Update Jenkins credentials:
   - `jenkins-webhook-secret`
   - `dockerhub-credentials`
   - `kubeconfig-credential` (if required)
3. Update Kubernetes secrets in each namespace:
   - `app-secrets` (`jwt-secret`, `jenkins-webhook-secret`)
   - `firebase-service-account`
4. Restart workloads:
   ```bash
   kubectl rollout restart deployment/devops-platform -n <namespace>
   kubectl rollout restart deployment/devops-frontend -n <namespace>
   ```

## 2. Webhook Signature Validation
- Endpoint: `POST /api/webhook/jenkins`
- Required header: `X-Jenkins-Webhook-Token`
- Expected behavior:
  - valid token: `200`
  - missing/invalid token: `401`

Quick check:
```bash
curl -i -X POST http://localhost:8082/api/webhook/jenkins \
  -H "Content-Type: application/json" \
  -H "X-Jenkins-Webhook-Token: <secret>" \
  -d '{"buildNumber":1,"jobName":"test","stage":"Checkout","status":"IN_PROGRESS","timestamp":0}'
```

## 3. Realtime Dashboard Troubleshooting
### Symptom: Dashboard shows stale data
1. Verify backend receives webhook events (application logs).
2. Confirm Firestore writes are enabled (service account mounted, `FIREBASE_CONFIG_PATH` valid).
3. Validate frontend Firebase auth bootstrap:
   - `/api/dashboard/firebase-token` returns token
   - browser can subscribe to Firestore collections
4. Check `dashboard/overview.pipelineLastUpdated` and `metricsLastUpdated`.

### Symptom: `/api/dashboard/firebase-token` returns 503
- Firebase admin app is not initialized in backend.
- Verify:
  - mounted service account exists in container
  - env `FIREBASE_CONFIG_PATH` points to mounted path

## 4. Deployment Health Validation
```bash
kubectl get deploy,svc,ingress -n dev
kubectl get deploy,svc,ingress -n staging
kubectl get deploy,svc,ingress,hpa -n production
kubectl rollout status deployment/devops-platform -n <namespace>
kubectl rollout status deployment/devops-frontend -n <namespace>
```

## 5. Rollback
```bash
kubectl rollout undo deployment/devops-platform -n <namespace>
kubectl rollout undo deployment/devops-frontend -n <namespace>
```

## 6. CI/CD Verification After Changes
1. Trigger Jenkins pipeline with signed webhook enabled.
2. Confirm all 11 stages run in order:
   - Checkout
   - Build
   - Unit & Integration Tests
   - Static Analysis
   - API Tests
   - Docker Build & Push
   - Deploy to Dev
   - Smoke Test
   - Deploy to Staging
   - Manual Approval
   - Deploy to Production
3. Confirm dashboard updates each stage instantly in event stream.
