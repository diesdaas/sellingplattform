# GoCart Backend API

Backend API für die Artwork-Selling-Plattform mit Print-on-Demand (PoD) Integration.

## 🚀 Quick Start

### Voraussetzungen

- Docker & Docker Compose
- Node.js 20+ (optional, für lokale Entwicklung ohne Docker)

### Installation & Start

```bash
# 1. Repository klonen/navigieren
cd gocart-backend

# 2. Environment-Variablen kopieren
cp env.example .env

# 3. Docker Container starten
docker-compose up --build

# 4. Prisma Client generieren (im Container)
docker-compose exec api npm run prisma:generate

# 5. Datenbank-Migrationen ausführen
docker-compose exec api npm run prisma:migrate
```

Die API läuft dann auf: **http://localhost:5000**

### Logs ansehen

```bash
docker-compose logs -f api
```

### Container stoppen

```bash
docker-compose down
```

## 📁 Projektstruktur

```
gocart-backend/
├── config/
│   ├── database.js      # Prisma Client Setup
│   └── env.js           # Environment Configuration
├── prisma/
│   └── schema.prisma    # Database Schema
├── routes/               # API Routes (wird in Phase 2+ erstellt)
├── controllers/         # Controller Logic (wird in Phase 2+ erstellt)
├── middleware/          # Express Middleware (wird in Phase 2+ erstellt)
├── services/            # Business Logic Services (wird in Phase 4+ erstellt)
├── utils/               # Utility Functions (wird in Phase 2+ erstellt)
├── server.js            # Express App Entry Point
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🗄️ Database Schema

Das Prisma Schema enthält:

- **User** - Benutzer mit Authentication & Artist-Support
- **Portfolio** - Künstler-Portfolios (NEU)
- **Artwork** - Einzelne Kunstwerke (NEU)
- **Product** - Produkte mit PoD-Integration (Prodigi)
- **Cart** - Warenkörbe
- **CartItem** - Warenkorb-Items mit Varianten
- **Order** - Bestellungen mit PoD-Tracking
- **OrderItem** - Bestell-Items
- **Rating** - Bewertungen & Reviews
- **Address** - Lieferadressen
- **Store** - Vendor Stores
- **Coupon** - Gutscheine

## 🔧 Entwicklung

### Lokale Entwicklung (ohne Docker)

```bash
# Dependencies installieren
npm install

# Prisma Client generieren
npm run prisma:generate

# Datenbank-Migrationen
npm run prisma:migrate

# Server starten
npm run dev
```

### Prisma Studio (Database GUI)

```bash
npm run prisma:studio
```

Öffnet Prisma Studio auf http://localhost:5555

## 📡 API Endpoints

### Health Check

```
GET /health
```

### Geplante Endpoints (Phase 2+):

- `/api/auth/*` - Authentication
- `/api/users/*` - User Management
- `/api/portfolios/*` - Portfolio Management
- `/api/products/*` - Product CRUD
- `/api/cart/*` - Shopping Cart
- `/api/orders/*` - Order Management
- `/api/payments/*` - Stripe Payments
- `/api/vendors/*` - Vendor Dashboard
- `/api/reviews/*` - Reviews & Ratings
- `/api/admin/*` - Admin Panel

## 🔐 Environment Variables

Siehe `env.example` für alle verfügbaren Variablen.

**Wichtig:**
- `JWT_SECRET` muss in Production geändert werden!
- `PRODIGI_API_KEY` von [Prodigi Dashboard](https://www.prodigi.com/) holen
- `STRIPE_SECRET_KEY` von [Stripe Dashboard](https://stripe.com/) holen

## 🖨️ PoD Integration

Die Plattform nutzt **Prodigi** als Print-on-Demand-Anbieter:

- Sandbox für Testing: `PRODIGI_ENVIRONMENT=sandbox`
- Live für Production: `PRODIGI_ENVIRONMENT=live`
- API-Dokumentation: https://www.prodigi.com/print-api/docs/reference/

## ✅ Implementierte Features

Alle 9 Phasen sind abgeschlossen:

1. ✅ **Phase 1**: Setup & Grundstruktur
2. ✅ **Phase 2**: Authentication & User Management
3. ✅ **Phase 3**: Portfolio-System
4. ✅ **Phase 4**: Products & PoD-Integration (Prodigi)
5. ✅ **Phase 5**: Shopping Cart & Orders
6. ✅ **Phase 6**: Stripe Payments & PoD Order Fulfillment
7. ✅ **Phase 7**: Vendor Dashboard & Analytics
8. ✅ **Phase 8**: Reviews & Ratings
9. ✅ **Phase 9**: Admin Panel & Final Polish

Siehe `API_DOCUMENTATION.md` für vollständige API-Dokumentation.

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Prüfe ob PostgreSQL Container läuft
docker-compose ps

# Prüfe Logs
docker-compose logs postgres
```

### Port bereits belegt

Ändere `PORT` in `.env` oder `docker-compose.yml`

### Prisma Schema Sync Fehler

```bash
# Prisma Client neu generieren
docker-compose exec api npm run prisma:generate

# Migrationen zurücksetzen (Vorsicht: löscht Daten!)
docker-compose exec api npx prisma migrate reset
```

## 📄 License

ISC

