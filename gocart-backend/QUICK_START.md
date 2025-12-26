# Quick Start Guide

## ✅ Admin User wurde bereits erstellt!

**Credentials:**
- Email: `admin@example.com`
- Password: `Admin123!`

Der Admin User existiert bereits in der Datenbank!

## 🚀 Server starten

### Option 1: Docker (empfohlen, nach Dockerfile Fix)

```bash
cd gocart-backend
docker-compose up --build
```

**Hinweis:** Es gibt aktuell ein OpenSSL-Kompatibilitätsproblem mit Prisma im Docker Container. 

**Workaround:** Verwende Option 2 (Lokal) oder fixe das Dockerfile.

### Option 2: Lokal (ohne Docker)

```bash
cd gocart-backend

# 1. Dependencies installieren
npm install

# 2. Prisma Client generieren
npx prisma generate

# 3. Schema pushen (falls noch nicht geschehen)
DATABASE_URL="postgresql://user:password@localhost:5432/gocart" \
DIRECT_URL="postgresql://user:password@localhost:5432/gocart" \
npx prisma db push

# 4. Server starten
DATABASE_URL="postgresql://user:password@localhost:5432/gocart" \
DIRECT_URL="postgresql://user:password@localhost:5432/gocart" \
JWT_SECRET="your-secret-key" \
PORT=5000 \
node server.js
```

## 🧪 Testen

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
```

### 3. Admin Endpoint testen (mit Token aus Login)
```bash
curl -X GET http://localhost:5000/api/admin/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Docker OpenSSL Fix

Falls du Docker verwenden möchtest, aktualisiere das Dockerfile:

```dockerfile
FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app
# ... rest of Dockerfile
```

Oder verwende ein anderes Base Image:
```dockerfile
FROM node:20-slim
# ... rest
```

## 📝 Nächste Schritte

1. ✅ Admin User existiert bereits
2. ⏳ Server starten (siehe oben)
3. ⏳ API testen
4. ⏳ Frontend integrieren

## 🐛 Troubleshooting

### "User was denied access"
```bash
# Berechtigungen setzen
docker-compose exec postgres psql -U user -d gocart -c "
ALTER DATABASE gocart OWNER TO \"user\";
GRANT ALL PRIVILEGES ON DATABASE gocart TO \"user\";
GRANT ALL ON SCHEMA public TO \"user\";
"
```

### Prisma Schema Sync
```bash
# Lokal
DATABASE_URL="postgresql://user:password@localhost:5432/gocart" \
npx prisma db push
```

### Port bereits belegt
```bash
# Anderen Port verwenden
PORT=5001 node server.js
```






