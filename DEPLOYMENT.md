# GoCart Deployment Guide

## Production Deployment

### Prerequisites
- Docker & Docker Compose
- Domain name with SSL certificate
- SMTP email service
- Stripe account
- Redis instance (optional, can use Docker)

### Environment Setup

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables:**
   ```bash
   # Database
   DB_PASSWORD=your-secure-database-password

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

   # Stripe
   STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
   STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@gocart.com
   FROM_NAME=GoCart

   # URLs
   FRONTEND_URL=https://yourdomain.com
   ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
   CORS_ORIGIN=https://yourdomain.com
   ```

### Deployment Steps

1. **Build and deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **Run database migrations:**
   ```bash
   # Auth service
   docker-compose -f docker-compose.prod.yml exec auth npx prisma db push

   # Payment service
   docker-compose -f docker-compose.prod.yml exec payment npx prisma db push

   # Main backend
   docker-compose -f docker-compose.prod.yml exec backend npx prisma db push
   ```

3. **Verify deployment:**
   ```bash
   # Check service health
   curl https://api.yourdomain.com/health
   curl https://yourdomain.com
   ```

### SSL Configuration

Configure SSL certificates for production:

```nginx
# Example nginx configuration
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Monitoring

Set up monitoring for your services:

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Monitor resource usage
docker stats
```

### Backup Strategy

Set up automated backups for databases:

```bash
# PostgreSQL backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec gocart_postgres-main_1 pg_dump -U user gocart > backup_$DATE.sql
docker exec gocart_postgres-auth_1 pg_dump -U user auth > backup_auth_$DATE.sql
docker exec gocart_postgres-payment_1 pg_dump -U user payment > backup_payment_$DATE.sql

# Upload to cloud storage
aws s3 cp backup_*.sql s3://your-backup-bucket/
```

### Scaling

For high traffic, scale individual services:

```bash
# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
docker-compose -f docker-compose.prod.yml up -d --scale auth=2

# Use load balancer (nginx example)
upstream backend {
    server localhost:5000;
    server localhost:5001;
    server localhost:5002;
}
```

### Troubleshooting

Common issues and solutions:

1. **Service not starting:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs <service-name>
   ```

2. **Database connection issues:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec postgres-main psql -U user -d gocart
   ```

3. **Memory issues:**
   ```bash
   docker system prune -a
   docker volume prune
   ```

### Security Checklist

- [ ] Change default database passwords
- [ ] Use strong JWT secrets
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable CORS properly
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities
