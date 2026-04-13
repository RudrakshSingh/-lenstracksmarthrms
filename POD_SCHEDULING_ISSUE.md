# ⚠️ Pod Scheduling Issue

## 🔍 Problem

New pod `hr-service-5886bdbd67-6hwcm` is stuck in **Pending** status with `PodScheduled: False`.

This means Kubernetes scheduler cannot assign the pod to any node.

---

## 🔍 Possible Causes

1. **Resource Constraints:** Nodes don't have enough CPU/memory
2. **Node Capacity:** All nodes are at capacity
3. **Taints/Tolerations:** Nodes have taints that pod can't tolerate
4. **Node Selectors:** Pod has node selectors that don't match any nodes

---

## ✅ Solution Applied

**Scaled down to 1 replica** to avoid resource contention.

The deployment will:
- Keep 1 old pod running (with old code)
- Wait for resources to free up
- Then schedule new pod

---

## 🚀 Alternative: Force New Pod

If you want to force the new pod immediately:

```bash
# Delete one old pod to free resources
kubectl delete pod hr-service-548d77b8c4-xms9n -n etelios-prod

# Or scale down old replicaset
kubectl scale replicaset hr-service-548d77b8c4 -n etelios-prod --replicas=0
```

---

## 📊 Check Status

```bash
# Check pods
kubectl get pods -n etelios-prod -l app=hr-service

# Check why pod is pending
kubectl describe pod hr-service-5886bdbd67-6hwcm -n etelios-prod | grep -A 10 Events

# Check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"
```

---

**Scaled down to 1 replica. New pod will schedule when resources are available.**
