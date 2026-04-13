# JTS seedha Docker pe (GitHub / pipeline nahi)

## Sabse short flow

```bash
cd microservices/jts-service
cp .env.docker.example .env
# .env mein JWT_SECRET edit karo
docker compose -f docker-compose.standalone.yml up -d --build
```

Check:

```bash
curl -s http://127.0.0.1:3018/health
```

If you were getting `Bind for 0.0.0.0:27017 failed`, this standalone compose fixes it by not exposing Mongo/Redis host ports.

API (local): `http://127.0.0.1:3018/api/jts/...` ya jo bhi routes `createApp.js` mein hain.

---

## Sirf Docker image (compose nahi)

```bash
cd microservices/jts-service
docker build -t jts-service:prod .

docker run -d --name jts --restart unless-stopped -p 3018:3018 \
  -e NODE_ENV=production \
  -e PORT=3018 \
  -e MONGO_URI='mongodb://HOST:27017/etelios_jts' \
  -e REDIS_URL='redis://HOST:6379' \
  -e JWT_SECRET='tumhara-secret' \
  jts-service:prod
```

Mongo / Redis alag machine pe hon to unka URL `MONGO_URI` / `REDIS_URL` mein do.

---

## Nginx reverse proxy example (`/jts` → container)

Server pe JTS `3018` pe chal raha ho, client ko `https://api.tumhari.com/jts` chahiye:

```nginx
location /jts/ {
    proxy_pass http://127.0.0.1:3018/jts/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Container env mein:

```bash
JTS_PUBLIC_PATH_PREFIX=/jts
```

---

## Purana `docker-compose.yml`

Usme `networks: external: etelios-network` hai — pehle `docker network create etelios-network` warna error aayega.  
Naya **`docker-compose.standalone.yml`** external network **nahi** maangta.

---

## ECR / AWS sirf tab

Jab image AWS pe push karni ho tab `scripts/deploy-jts-aws.sh` — GitHub ki zaroorat nahi, sirf `docker` + `aws` CLI.
