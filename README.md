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

GoCart ist eine moderne, Multi-Vendor E-Commerce-Plattform, die speziell für Künstler entwickelt wurde. Künstler können ihre Artworks hochladen, persönliche Portfolios erstellen und ihre Werke über Print-on-Demand (PoD) als physische Produkte verkaufen.

### 🎯 Hauptmerkmale

- **👨‍🎨 Künstler-Portfolios**: Individuelle Portfolio-Seiten für jeden Künstler
- **🖨️ Print-on-Demand**: Integration mit Prodigi für hochwertige Kunstdrucke
- **💳 Stripe-Zahlungen**: Sichere Zahlungsabwicklung mit automatischem Fulfillment
- **📱 Responsive Design**: Optimierte Benutzeroberfläche für Desktop und Mobile
- **🎛️ Admin-Panel**: Vollständige Plattform-Verwaltung für Administratoren
- **📊 Analytics**: Ausführliche Verkaufs- und Performance-Analytics
- **⭐ Reviews & Ratings**: Bewertungssystem für Produkte und Künstler

---

## 🏗️ Architektur

Das Projekt besteht aus zwei Hauptkomponenten:

### Frontend (`gocart/`)
- **Framework**: Next.js 14 mit App Router
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Icons**: Lucide React
- **Deployment**: Vercel-ready

### Backend (`gocart-backend/`)
- **Runtime**: Node.js mit Express.js
- **Database**: PostgreSQL mit Prisma ORM
- **Authentication**: JWT mit bcryptjs
- **Payments**: Stripe Integration
- **PoD Service**: Prodigi API
- **Containerisierung**: Docker & Docker Compose

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

### Für Kunden
- ✅ Produkt-Browsing mit Kategorien
- ✅ Warenkorb & Checkout
- ✅ Künstler-Portfolio-Browsing
- ✅ Produkt-Reviews & Ratings
- ✅ Sichere Stripe-Zahlungen

### Für Künstler
- ✅ Persönliches Portfolio
- ✅ Artwork-Upload & Management
- ✅ Automatische Produkt-Erstellung aus Artworks
- ✅ Verkaufs-Analytics & Reports
- ✅ Order-Management

### Für Administratoren
- ✅ Vollständiges Admin-Panel
- ✅ Vendor-Genehmigung
- ✅ Plattform-Analytics
- ✅ System-Monitoring

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
