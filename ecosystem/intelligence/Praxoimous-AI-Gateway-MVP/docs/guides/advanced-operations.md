---
id: advanced-operations
title: Advanced Operations Guide
sidebar_label: Advanced Operations
---

## Advanced Operations Guide

Welcome to the Advanced Operations Guide for Praximous. While the standard setup is perfect for development and small-scale use, this guide provides best practices for deploying, scaling, and managing Praximous in a production environment.

## 1. Production Deployment & High Availability (HA)

Praximous is designed to be stateless, which is the key to achieving high availability. By running multiple instances of the application behind a load balancer, you can ensure service continuity even if one instance fails.

### Key Considerations for HA

* **Load Balancing**: Deploy at least two instances of the `praximous` container and use a load balancer (like Nginx, HAProxy, or a cloud provider's load balancer) to distribute traffic between them.

* **Shared Configuration**: All instances in an HA cluster must use the exact same configuration. The `config/` directory should be consistent across all nodes. This can be achieved by:
  * Mounting the `config/` directory from a shared network file system (e.g., NFS).
  * (Recommended) Building the configuration files into your Docker image as part of your CI/CD pipeline. This creates immutable images and ensures every deployed container is identical.

* **Centralized Database for Auditing**: The default SQLite database (`praximous_audit.db`) is not suitable for a multi-instance HA setup, as it can lead to write conflicts and locking issues. For production, you should configure Praximous to use a centralized, client-server database like **PostgreSQL** or **MySQL**.
  > *Note: Support for external databases is an Enterprise-tier feature. Please refer to our Pricing & Tiers Guide for more details.*

* **Log Aggregation**: Instead of writing logs to local files, configure your containers to output logs to `stdout` and `stderr`. Use a log aggregation tool like the ELK Stack (Elasticsearch, Logstash, Kibana), Splunk, or a cloud-native solution to collect and analyze logs from all instances in one place.

---

## 2. Scaling with Kubernetes

For large-scale, resilient deployments, we recommend using a container orchestrator like Kubernetes. Kubernetes automates the deployment, scaling, and management of containerized applications.

### Example Kubernetes Manifests

Here are some example manifests to get you started.

#### `configmap.yaml`

Store your non-sensitive configuration in a `ConfigMap`.

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: praximous-config
data:
  identity.yaml: |
    # Contents of your identity.yaml
  providers.yaml: |
    # Contents of your providers.yaml
```text
#### `secret.yaml`

Store your sensitive data, like API keys, in a `Secret`.
Store your sensitive data, like API keys, in a `Secret`.

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: praximous-secret
type: Opaque
stringData:
  PRAXIMOUS_LICENSE_KEY: "YOUR_LICENSE_KEY_HERE"
  GEMINI_API_KEY: "YOUR_GEMINI_KEY_HERE"
  OLLAMA_API_URL: "http://ollama.default.svc.cluster.local:11434"
#### `deployment.yaml`

Define the Praximous deployment, mounting the `ConfigMap` and `Secret`.
#### `deployment.yaml`
Define the Praximous deployment, mounting the `ConfigMap` and `Secret`.

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: praximous
spec:
  replicas: 3 # Start with 3 replicas for high availability
  selector:
    matchLabels:
      app: praximous
  template:
    metadata:
      labels:
        app: praximous
    spec:
      containers:
      - name: praximous
        image: your-repo/praximous:latest # Your custom image
        ports:
        - containerPort: 8000
        envFrom:
        - secretRef:
            name: praximous-secret
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
      volumes:
      - name: config-volume
        configMap:
#### `service.yaml`

Expose the deployment via a `Service`.

#### `service.yaml`
Expose the deployment via a `Service`.

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: praximous-service
spec:
  type: LoadBalancer # Or ClusterIP/NodePort depending on your environment
  selector:
    app: praximous
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
```

### Autoscaling

You can use a **Horizontal Pod Autoscaler (HPA)** to automatically scale the number of Praximous pods based on CPU or memory utilization, ensuring performance under variable load.

---

## 3. Backup and Recovery

1. **Configuration (`config/` directory)**: Your `identity.yaml` and `providers.yaml` files.
2. **Audit Database**: The `praximous_audit.db` file (if using SQLite) or a snapshot of your external database (e.g., PostgreSQL).
3. **Ollama Models (`ollama_data` volume)**: The downloaded LLM models can be large and time-consuming to redownload.
4. **Stop the application** to ensure data consistency, especially for the SQLite database.

    ```bash
    docker-compose down
    ```

5. **Create an archive** of the persistent volumes.

    ```bash
    tar -czvf praximous-backup-$(date +%F).tar.gz config/ logs/ ollama_data/ praximous_audit.db
    ```

6. **Store the archive** in a secure, remote location (e.g., an S3 bucket, network storage).

7. **Restart the application**.

8. **Stop the running application**.
9. **Wipe the current volumes** to ensure a clean state.
10. **Extract your backup archive** into the project directory, restoring the `config/`, `logs/`, `ollama_data/` directories and the `praximous_audit.db` file.
11. **Restart the application** using `docker-compose up -d`.
12. **Verify** that the system is running and that your data (e.g., analytics history) has been restored.

    ```bash
    docker-compose up -d
    ```

### Recovery Procedure

1. **Stop the running application**.
2. **Wipe the current volumes** to ensure a clean state.
3. **Extract your backup archive** into the project directory, restoring the `config/`, `logs/`, `ollama_data/` directories and the `praximous_audit.db` file.
4. **Restart the application** using `docker-compose up -d`.
5. **Verify** that the system is running and that your data (e.g., analytics history) has been restored.

For Kubernetes, we recommend using a dedicated backup tool like **Velero**, which can back up `PersistentVolumes`, `ConfigMaps`, `Secrets`, and other cluster resources.
