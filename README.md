<div align="center">
  <h1><img src="gocart/assets/gs_logo.jpg" width="60" height="60" alt="GoCart Logo">
   GoCart - Multi-Vendor E-Commerce Platform</h1>
  <p>
    Eine vollständige E-Commerce-Plattform für Künstler, die ihre Artworks als Print-on-Demand-Produkte verkaufen können.
  </p>
  <p>
    <a href="https://github.com/diesdaas/sellingplattform/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/diesdaas/sellingplattform?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/diesdaas/sellingplattform/issues"><img src="https://img.shields.io/github/issues/diesdaas/sellingplattform?style=for-the-badge" alt="GitHub issues"></a>
    <a href="https://github.com/diesdaas/sellingplattform/stargazers"><img src="https://img.shields.io/github/stars/diesdaas/sellingplattform?style=for-the-badge" alt="GitHub stars"></a>
  </p>
</div>

---

## 📖 Überblick

GoCart ist eine moderne, **vollständig containerisierte Microservices E-Commerce-Plattform**, die speziell für Künstler entwickelt wurde. Künstler können ihre Artworks hochladen, persönliche Portfolios erstellen und ihre Werke über Print-on-Demand (PoD) als physische Produkte verkaufen.

### 🎯 Hauptmerkmale

- **🏗️ Microservices Architektur**: Vollständig modulare, skalierbare Services
- **👨‍🎨 Künstler-Portfolios**: Individuelle Portfolio-Seiten für jeden Künstler
- **🖨️ Print-on-Demand**: Integration mit Prodigi für hochwertige Kunstdrucke
- **💳 Stripe-Zahlungen**: Sichere Zahlungsabwicklung mit automatischem Fulfillment
- **📱 Responsive Design**: Optimierte Benutzeroberfläche für Desktop und Mobile
- **🎛️ Admin-Panel**: Vollständige Plattform-Verwaltung für Administratoren
- **📊 Analytics**: Ausführliche Verkaufs- und Performance-Analytics
- **⭐ Reviews & Ratings**: Bewertungssystem für Produkte und Künstler
- **🐳 Docker Ready**: Vollständige Containerisierung für Entwicklung und Produktion
- **🧪 Integration Tests**: Automatisierte Tests für alle Services
- **📚 Production Ready**: Deployment-Guides und Monitoring-Setup

---

## 🏗️ Architektur

GoCart verwendet eine **moderne Microservices-Architektur** mit 8 unabhängigen Services:

### 🎨 Frontend (`gocart/`)
- **Framework**: Next.js 15 mit App Router & Turbopack
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **API Clients**: Service-spezifische API-Module
- **Deployment**: Vercel-ready

### 🚀 Microservices Backend

#### **API Gateway** (`services/gateway/`)
- **Port**: 8080
- **Funktion**: Zentraler Proxy, Routing, Authentifizierung, Rate Limiting
- **Technologie**: Express.js mit http-proxy-middleware

#### **Auth Service** (`services/auth/`)
- **Port**: 3002
- **Funktion**: User-Management, JWT-Authentifizierung, Sessions
- **Database**: PostgreSQL (separate DB)
- **Features**: Registrierung, Login, Email-Verifizierung

#### **Payment Service** (`services/payment/`)
- **Port**: 3003
- **Funktion**: Stripe-Integration, Payouts, Webhooks
- **Database**: PostgreSQL (separate DB)
- **Features**: Zahlungsabwicklung, Auszahlungen, Transaktionen

#### **Backend Service** (`gocart-backend/`)
- **Port**: 5000
- **Funktion**: Katalog, Bestellungen, Medien, Benachrichtigungen
- **Architektur**: Modular mit 4 unabhängigen Modulen
- **Database**: PostgreSQL (Haupt-DB)

### 🗄️ Infrastruktur & Datenbanken
- **PostgreSQL**: 3 separate Datenbanken (Auth, Payment, Main)
- **Redis**: Session-Management & Caching
- **RabbitMQ**: Event-Driven Communication
- **Docker**: Vollständige Containerisierung

### 📦 Shared Libraries (`packages/shared/`)
- **Error Handling**: Zentralisierte Fehlerbehandlung mit Prisma-Support
- **Validation**: Joi-Schemas für alle Services
- **Logging**: Winston-Logger mit strukturiertem Logging
- **Event Publishing**: RabbitMQ Event-System

---

## 🚀 Schnellstart

### Voraussetzungen

- Docker & Docker Compose
- Node.js 20+ (für lokale Entwicklung)
- Git

### 1. Repository klonen

```bash
git clone https://github.com/diesdaas/sellingplattform.git
cd sellingplattform
```

### 2. Schnellstart (Empfohlen)

**Für einfaches Testen:** Verwende das bereitgestellte Start-Script!

#### Linux/Mac:
```bash
# Alle Microservices starten (empfohlen)
./start-all-services.sh

# Oder nur Frontend + Backend
./start.sh
```

#### Windows:
```cmd
REM Alle Microservices starten (empfohlen)
start-all-services.bat

REM Oder nur Frontend + Backend
start.bat
```

#### Oder mit npm:
```bash
npm start
```

**Das Script startet automatisch:**
- ✅ Backend mit Docker Compose
- ✅ Frontend mit npm run dev
- ✅ Überprüft alle Voraussetzungen
- ✅ Zeigt Status und URLs an
- ✅ Behandelt sauberes Shutdown (Ctrl+C)

### 3. Manuelle Installation (Alternativ)

### 2. Backend starten

```bash
cd gocart-backend

# Environment-Variablen kopieren
cp env.example .env

# Docker Container starten
docker-compose up --build
```

### 3. Frontend starten

```bash
cd ../gocart

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

### 4. Anwendung öffnen

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8080 (Haupteinstiegspunkt)
- **Auth Service**: http://localhost:3002
- **Payment Service**: http://localhost:3003
- **Backend API**: http://localhost:5000
- **Database GUI**: http://localhost:5555 (Prisma Studio)

---

## 📁 Projektstruktur

```
sellingplattform/
├── gocart/                    # Next.js Frontend
│   ├── app/                   # App Router Pages
│   ├── components/            # Reusable Components
│   ├── lib/                   # Redux Store & Utils
│   ├── assets/                # Images & Static Files
│   └── prisma/                # Database Schema
├── gocart-backend/            # Express.js Backend
│   ├── controllers/           # Business Logic
│   ├── routes/                # API Routes
│   ├── services/              # External Services
│   ├── middleware/            # Express Middleware
│   ├── utils/                 # Helper Functions
│   └── prisma/                # Database Schema
├── ENTWICKLUNGSPLAN.md        # Development Roadmap
├── BACKEND_ENTSCHEIDUNG.md    # Architecture Decisions
└── README.md                  # This file
```

---

## 🔧 API Dokumentation

Die vollständige API-Dokumentation findest du in [`gocart-backend/API_DOCUMENTATION.md`](gocart-backend/API_DOCUMENTATION.md).

### Wichtige Endpunkte

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/auth/register` | POST | Benutzerregistrierung |
| `/api/auth/login` | POST | Benutzerlogin |
| `/api/portfolios/:username` | GET | Öffentliches Portfolio |
| `/api/products` | GET | Produktliste mit Filtern |
| `/api/cart` | POST | Zum Warenkorb hinzufügen |
| `/api/orders` | POST | Bestellung aufgeben |
| `/api/payments/create-intent` | POST | Stripe Payment Intent |

---

## 🗄️ Datenbank-Schema

Das Projekt verwendet Prisma mit PostgreSQL. Das Schema umfasst:

- **User**: Benutzer mit Rollen (customer/artist/admin)
- **Portfolio**: Künstler-Portfolios mit Artworks
- **Artwork**: Einzelne Kunstwerke
- **Product**: PoD-Produkte mit Varianten
- **Order**: Bestellungen mit Payment & Fulfillment
- **Cart**: Warenkörbe mit Items
- **Rating**: Bewertungen & Reviews
- **Store**: Vendor-Shops

Detailliertes Schema: [`gocart-backend/prisma/schema.prisma`](gocart-backend/prisma/schema.prisma)

---

## 🔐 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gocart"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Prodigi (Print-on-Demand)
PRODIGI_API_KEY="your-prodigi-api-key"
PRODIGI_ENVIRONMENT="sandbox" # oder "live"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

---

## 🚀 Deployment

### Docker Production Setup

```bash
# Backend
cd gocart-backend
docker-compose -f docker-compose.prod.yml up --build

# Frontend (Vercel empfohlen)
cd ../gocart
npm run build
npm start
```

### Umgebungsvariablen für Production

Stelle sicher, dass alle Environment-Variablen für Production konfiguriert sind:

- `NODE_ENV=production`
- `PRODIGI_ENVIRONMENT=live`
- Sichere JWT-Secrets
- Production-Database-URL

---

## 🛠️ Development Management

### Einfache Start/Stop Scripts

Für einfaches Testen und Entwicklung sind mehrere Startmöglichkeiten verfügbar:

#### 1. Automatisches Start-Script (Empfohlen)
```bash
# Linux/Mac
./start.sh

# Windows
start.bat

# Oder mit npm
npm start
```

#### 2. Individuelle Services starten
```bash
# Nur Backend starten
npm run backend

# Nur Frontend starten
npm run frontend

# Services stoppen
npm run stop
```

#### 3. Node.js Development Manager
```bash
# Start alles
node dev-manager.js start

# Stop alles
node dev-manager.js stop

# Hilfe anzeigen
node dev-manager.js help
```

### Was die Scripts machen:

- ✅ **Voraussetzungen prüfen** (Docker, Node.js, npm)
- ✅ **Backend starten** (Docker Compose mit PostgreSQL)
- ✅ **Frontend starten** (Next.js Development Server)
- ✅ **Status überwachen** und URLs anzeigen
- ✅ **Sauberes Shutdown** bei Ctrl+C
- ✅ **Fehlerbehandlung** und aussagekräftige Meldungen

### Troubleshooting

Falls etwas nicht funktioniert:

```bash
# Services stoppen
npm run stop

# Docker Container bereinigen
cd gocart-backend && docker-compose down -v

# Dependencies neu installieren
cd ../gocart && rm -rf node_modules && npm install

# Neu starten
cd .. && npm start
```

---

## 🤝 Mitwirken

Wir freuen uns über Beiträge! Siehe [`gocart/CONTRIBUTING.md`](gocart/CONTRIBUTING.md) für Details.

### Entwicklung

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

---

## 📜 Lizenz

Dieses Projekt ist unter der MIT License lizenziert - siehe [`LICENSE.md`](LICENSE.md) für Details.

---

## 🙋‍♂️ Support

Bei Fragen oder Problemen:

1. **Issues**: [GitHub Issues](https://github.com/diesdaas/sellingplattform/issues)
2. **Dokumentation**: Siehe die READMEs in `gocart/` und `gocart-backend/`
3. **Entwicklungsplan**: [`ENTWICKLUNGSPLAN.md`](ENTWICKLUNGSPLAN.md)

---

## 🏆 Features im Überblick

### 🚀 System-Architektur
- ✅ **Microservices**: 8 unabhängige, skalierbare Services
- ✅ **API Gateway**: Zentrales Routing mit Authentifizierung
- ✅ **Event-Driven**: RabbitMQ für Service-Kommunikation
- ✅ **Docker Ready**: Vollständige Containerisierung
- ✅ **Production Ready**: Deployment-Guides & Monitoring

### Für Kunden
- ✅ Produkt-Browsing mit erweiterten Filtern
- ✅ Warenkorb & Stripe-Checkout
- ✅ Künstler-Portfolio-Browsing
- ✅ Produkt-Reviews & Ratings
- ✅ Sichere Stripe-Zahlungen
- ✅ Responsive Mobile-Optimierung

### Für Künstler
- ✅ Persönliches Portfolio-Management
- ✅ Artwork-Upload & Kategorisierung
- ✅ Automatische Produkt-Erstellung aus Artworks
- ✅ Print-on-Demand Integration (Prodigi)
- ✅ Verkaufs-Analytics & Reports
- ✅ Order-Management & Fulfillment

### Für Administratoren
- ✅ Vollständiges Admin-Panel
- ✅ Vendor-Genehmigung & Management
- ✅ Plattform-Analytics & Insights
- ✅ System-Monitoring & Health Checks
- ✅ Email-Benachrichtigungen
- ✅ Datenbank-Management

### 🛠️ Developer Features
- ✅ **Integration Tests**: Automatisierte Service-Tests
- ✅ **Type Safety**: Prisma-generierte Typen
- ✅ **Error Handling**: Comprehensive Fehlerbehandlung
- ✅ **Validation**: Joi-Schema-Validierung
- ✅ **Logging**: Strukturiertes Winston-Logging
- ✅ **Hot Reload**: Entwicklung mit Auto-Restart

---

## 📊 System Status

### ✅ **Completed Major Improvements**
- 🏗️ **Microservices Architecture**: 8 independent services
- 🔧 **Database Schema**: All PostgreSQL DBs initialized
- 🚀 **Full Controllers**: Complete product & artwork management
- 🌐 **API Gateway Integration**: Frontend connected to microservices
- 🔗 **API Clients**: Service-specific frontend clients
- 🛡️ **Error Handling**: Comprehensive validation & logging
- 🧪 **Integration Tests**: Automated testing framework
- 📚 **Documentation**: Updated API docs & deployment guides
- 🐳 **Docker Setup**: Production-ready containerization

### 🚀 **Service Health**
| Service | Port | Status | Database |
|---------|------|--------|----------|
| **API Gateway** | 8080 | ✅ Running | - |
| **Auth Service** | 3002 | ✅ Running | PostgreSQL:5433 |
| **Payment Service** | 3003 | ✅ Running | PostgreSQL:5434 |
| **Backend** | 5000 | ✅ Running | PostgreSQL:5432 |
| **Frontend** | 3000 | ✅ Running | - |
| **Redis** | 6379 | ✅ Running | - |
| **RabbitMQ** | 5672 | ✅ Running | - |

**Start System**: `./start-all-services.sh`  
**Run Tests**: `node test-integration.js`  
**Deploy**: See `DEPLOYMENT.md`

---

<div align="center">
  <p><strong>Entwickelt mit ❤️ für Künstler und Kunstliebhaber</strong></p>
  <p>
    <a href="https://github.com/diesdaas/sellingplattform">⭐ Star this repo</a> |
    <a href="https://github.com/diesdaas/sellingplattform/issues">🐛 Report Issues</a> |
    <a href="https://github.com/diesdaas/sellingplattform/pulls">🚀 Pull Requests</a>
  </p>
</div></contents>
</xai:function_call">README.md
