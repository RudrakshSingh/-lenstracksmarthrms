# GitHub Actions: JTS deploy workflow secrets

Workflow: **`.github/workflows/jts-prod-ecr-kubectl.yml`** (“JTS prod — ECR + optional kubectl”).

## Required (ECR push)

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | IAM user/role with `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload` on the JTS repo |
| `AWS_SECRET_ACCESS_KEY` | Pair to above |

The workflow uses **`AWS_REGION` `ap-south-1`** and account **`383234048604`** / repo **`etelios-jts-service`** (edit the workflow file if yours differ).

## Optional (kubectl apply from Actions)

| Secret | Purpose |
|--------|---------|
| `KUBE_CONFIG_B64` | Base64-encoded kubeconfig for the **prod** cluster (`cat ~/.kube/config \| base64`); **rotate if leaked** |

In the workflow run, set **apply_kubernetes** = `true` only when this secret is set.

## Safer alternative

- Use **OIDC** + `aws-actions/configure-aws-credentials` with an IAM role (no long-lived keys).
- Keep **kubectl** on your laptop or a private runner; use the workflow **only** to build and push ECR (`apply_kubernetes` = false).
