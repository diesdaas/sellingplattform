# Entwicklungsplan: Artwork-Selling-Plattform mit PoD-Integration

## 🎯 Projektziel
Entwicklung einer Multi-Vendor-Plattform für Künstler, die ihre Artworks als Print-on-Demand-Produkte verkaufen können. Jeder Künstler hat einen eigenen Shop und eine Portfolio-Seite.

---

## 🔍 Wichtige Verbesserungen gegenüber Originalplan

### ✅ **1. Prisma statt Sequelize**
- **Grund**: Frontend verwendet bereits Prisma → Konsistenz
- **Vorteil**: Ein Schema für Frontend & Backend, Type-Safety, bessere DX

### ✅ **2. Artwork-spezifische Features**
- Portfolio-Modell für Künstler-Galerien
- Artwork-Metadaten (Medium, Style, Year, etc.)
- PoD-Integration (Printful/Printify als primäre Anbieter)
- Product Variants für verschiedene Druckprodukte (Poster, T-Shirt, Canvas, etc.)

### ✅ **3. Schlankere Struktur**
- Kombination ähnlicher Phasen (z.B. Auth + User Management)
- PoD-Integration früher einbauen (Phase 4 statt später)
- Portfolio als eigenständige Phase

### ✅ **4. PoD-Anbieter: Prodigi**
**Gewählt**: **Prodigi** ([API-Dokumentation](https://www.prodigi.com/print-api/docs/reference/))
- ✅ Fokus auf **Kunstdrucke** (Poster, Canvas, Fine Art Prints) - perfekt für Artworks
- ✅ RESTful API mit klarer Struktur
- ✅ Sandbox für Testing verfügbar
- ✅ Callback-System für Order-Updates
- ✅ Quote-System für Preisberechnung vor Bestellung
- ✅ Globale Produktion (mehrere Labs)
- ✅ Gute Qualität (arbeitet mit renommierten Institutionen zusammen)

---

## 📋 OPTIMIERTER ENTWICKLUNGSPLAN (9 Phasen statt 12)

### **PHASE 1: Setup & Grundstruktur** ⚙️
**Ziel**: Docker-Setup + Express-Server + Prisma + Basis-Konfiguration

**Erstellen:**
1. **Dockerfile** (node:20-alpine)
2. **docker-compose.yml** (PostgreSQL 15 + API)
3. **server.js** - Express mit:
   - helmet(), cors(), morgan('dev')
   - express.json()
   - Error Handler Middleware
   - Port 5000
4. **prisma/schema.prisma** - Erweitern des bestehenden Schemas:
   - User-Modell erweitern (password, role, etc.)
   - Portfolio-Modell hinzufügen
   - Artwork-spezifische Felder zu Product
   - PoD-Integration-Felder
5. **config/database.js** - Prisma Client Setup
6. **config/env.js** - Environment Validation
7. **package.json** - Scripts (start, dev)

**Nach Phase 1:**
- ✅ `docker-compose up --build` startet ohne Fehler
- ✅ API läuft auf http://localhost:5000
- ✅ Prisma Schema synchronisiert
- ✅ Logs zeigen keine Fehler

---

### **PHASE 2: Authentication & User Management** 🔐
**Ziel**: Komplettes Auth-System + User-Profile-Management

**Erstellen:**
1. **utils/passwordHash.js** - bcryptjs Wrapper
2. **utils/jwt.js** - JWT Token Generation/Verification
3. **middleware/auth.js** - JWT Verification Middleware
4. **middleware/adminCheck.js** - Admin-Role-Check
5. **controllers/authController.js**:
   - `register()` - User Registration
   - `login()` - JWT Token zurückgeben
   - `getMe()` - Aktueller User (protected)
   - `refresh()` - Token Refresh
6. **controllers/userController.js**:
   - `getProfile()` - User Profile abrufen
   - `updateProfile()` - Profile aktualisieren
   - `becomeArtist()` - User als Künstler registrieren
7. **routes/auth.js** - `/api/auth/*`
8. **routes/users.js** - `/api/users/*`

**Nach Phase 2:**
- ✅ POST `/api/auth/register` erstellt User
- ✅ POST `/api/auth/login` gibt JWT zurück
- ✅ GET `/api/auth/me` (mit Token) gibt User zurück
- ✅ POST `/api/users/become-artist` registriert als Künstler

---

### **PHASE 3: Portfolio-System** 🎨
**Ziel**: Portfolio-Management für Künstler (NEU - nicht in GoCart!)

**Erstellen:**
1. **Erweitere Prisma Schema**:
   ```prisma
   model Portfolio {
     id          String   @id @default(cuid())
     artistId    String   @unique
     title       String
     bio         String?
     coverImage  String?
     gallery     Json     @default("[]") // Array von Artwork-IDs
     socialLinks Json     @default("{}")
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     
     artist User @relation(fields: [artistId], references: [id])
   }
   
   model Artwork {
     id          String   @id @default(cuid())
     portfolioId String
     title       String
     description String?
     imageUrl    String
     medium      String?  // "Digital", "Oil", "Watercolor", etc.
     style       String?  // "Abstract", "Realistic", etc.
     year        Int?
     tags        String[]
     isPublic    Boolean  @default(true)
     createdAt   DateTime @default(now())
     
     portfolio Portfolio @relation(fields: [portfolioId], references: [id])
     products   Product[] // Verknüpfung zu PoD-Produkten
   }
   ```

2. **controllers/portfolioController.js**:
   - `getPortfolio(artistId)` - Portfolio öffentlich anzeigen
   - `getMyPortfolio()` - Eigenes Portfolio (auth)
   - `createPortfolio()` - Portfolio erstellen (auth, nur Künstler)
   - `updatePortfolio()` - Portfolio aktualisieren (auth, owner)
   - `addArtwork()` - Artwork hinzufügen (auth, owner)
   - `updateArtwork()` - Artwork aktualisieren (auth, owner)
   - `deleteArtwork()` - Artwork löschen (auth, owner)
   - `getArtwork()` - Einzelnes Artwork anzeigen

3. **routes/portfolios.js**:
   - GET `/api/portfolios/:artistId` - Öffentliches Portfolio
   - GET `/api/portfolios/me` - Eigenes Portfolio (auth)
   - POST `/api/portfolios` - Portfolio erstellen (auth)
   - PUT `/api/portfolios/me` - Portfolio aktualisieren (auth)
   - POST `/api/portfolios/me/artworks` - Artwork hinzufügen (auth)
   - PUT `/api/portfolios/artworks/:id` - Artwork aktualisieren (auth)
   - DELETE `/api/portfolios/artworks/:id` - Artwork löschen (auth)
   - GET `/api/artworks/:id` - Artwork Details

**Nach Phase 3:**
- ✅ Künstler können Portfolio erstellen
- ✅ Artworks zu Portfolio hinzufügen
- ✅ Öffentliche Portfolio-URLs (`/api/portfolios/:username`)
- ✅ Portfolio-Seite für Frontend verfügbar

---

### **PHASE 4: Products & PoD-Integration** 🖨️
**Ziel**: Product CRUD + Print-on-Demand Integration

**Erstellen:**
1. **Erweitere Prisma Schema**:
   ```prisma
   model Product {
     // ... bestehende Felder
     artworkId   String?  // Verknüpfung zu Artwork
     podProvider String?  // "printful", "printify", etc.
     podProductId String? // ID im PoD-System
     variants    Json     @default("[]") // [{type: "poster", size: "A3", price: 29.99}, ...]
     basePrice   Float    // Basispreis für Berechnung
   }
   ```

2. **services/prodigiService.js** - Prodigi API Integration:
   ```javascript
   class ProdigiService {
     constructor(apiKey, environment = 'sandbox') {
       this.baseUrl = environment === 'sandbox' 
         ? 'https://api.sandbox.prodigi.com/v4.0'
         : 'https://api.prodigi.com/v4.0';
       this.apiKey = apiKey;
     }
     
     async createOrder(orderData) {
       // POST /Orders
       // items: [{sku, copies, assets: [{url}]}]
       // recipient: {name, address}
       // shippingMethod: "Budget" | "Standard" | "Express" | "Overnight"
     }
     
     async getOrder(orderId) {
       // GET /Orders/{orderId}
     }
     
     async createQuote(quoteData) {
       // POST /Quotes - Preisberechnung vor Bestellung
     }
     
     async handleCallback(callbackData) {
       // Webhook-Handler für Status-Updates
       // Events: OrderCreated, ShipmentsMade, OrderCompleted
     }
   }
   ```

3. **controllers/productController.js**:
   - `listProducts()` - Mit Filtering (category, price, artist, etc.)
   - `getProduct()` - Product Details mit Variants
   - `createProduct()` - Von Artwork → Product mit PoD-Sync
   - `updateProduct()` - Product aktualisieren
   - `deleteProduct()` - Product löschen
   - `syncWithPoD()` - Manueller PoD-Sync

4. **routes/products.js** - `/api/products/*`

**Nach Phase 4:**
- ✅ Künstler kann Artwork → Product konvertieren
- ✅ PoD-Integration mit Printful
- ✅ Product Variants (Poster, T-Shirt, etc.)
- ✅ Product Listing mit Filtering

---

### **PHASE 5: Shopping Cart & Orders** 🛒
**Ziel**: Cart Management + Order Creation

**Erstellen:**
1. **Erweitere Prisma Schema** (Cart bereits vorhanden, erweitern):
   ```prisma
   model CartItem {
     id        String   @id @default(cuid())
     cartId    String
     productId String
     variant   Json     // {type: "poster", size: "A3"}
     quantity  Int      @default(1)
     price     Float
     
     cart    Cart    @relation(fields: [cartId], references: [id])
     product Product @relation(fields: [productId], references: [id])
   }
   ```

2. **controllers/cartController.js**:
   - `addToCart()` - Mit Variant-Unterstützung
   - `getCart()` - Cart mit Items
   - `updateCartItem()` - Quantity ändern
   - `removeCartItem()` - Item entfernen
   - `clearCart()` - Cart leeren

3. **controllers/orderController.js**:
   - `createOrder()` - Von Cart → Order
   - `getOrders()` - User's Orders
   - `getOrder()` - Order Details
   - `cancelOrder()` - Order stornieren
   - `updateOrderStatus()` - Status aktualisieren (Vendor/Admin)

4. **routes/cart.js** - `/api/cart/*`
5. **routes/orders.js** - `/api/orders/*`

**Nach Phase 5:**
- ✅ Cart mit Variant-Unterstützung
- ✅ Order Creation
- ✅ Order Management

---

### **PHASE 6: Stripe Payments & PoD Order Fulfillment** 💳
**Ziel**: Payment Processing + Automatische PoD-Bestellung

**Erstellen:**
1. **controllers/paymentController.js**:
   - `createPaymentIntent()` - Stripe PaymentIntent
   - `confirmPayment()` - Payment bestätigen
   - `webhookHandler()` - Stripe Webhooks

2. **services/fulfillmentService.js**:
   ```javascript
   async fulfillOrder(orderId) {
     // 1. Payment bestätigt
     // 2. Für jedes OrderItem:
     //    - PoD-Order bei Printful erstellen
     //    - Tracking-Info speichern
     // 3. Order Status → "confirmed"
   }
   ```

3. **routes/payments.js** - `/api/payments/*`

**Nach Phase 6:**
- ✅ Stripe Payment Integration
- ✅ Automatische PoD-Bestellung nach Payment
- ✅ Webhook-Handling für Order-Updates

---

### **PHASE 7: Vendor Dashboard & Analytics** 📊
**Ziel**: Dashboard für Künstler mit Analytics

**Erstellen:**
1. **controllers/vendorController.js**:
   - `getDashboard()` - Analytics (Sales, Orders, Revenue)
   - `getVendorOrders()` - Alle Orders des Künstlers
   - `getVendorProducts()` - Alle Products des Künstlers
   - `getVendorAnalytics()` - Detaillierte Analytics

2. **routes/vendors.js** - `/api/vendors/*`

**Nach Phase 7:**
- ✅ Dashboard mit Sales-Analytics
- ✅ Order-Übersicht für Künstler
- ✅ Revenue-Tracking

---

### **PHASE 8: Reviews & Ratings** ⭐
**Ziel**: Review-System für Products

**Erstellen:**
1. **Erweitere Rating-Modell** (bereits vorhanden, erweitern):
   ```prisma
   model Rating {
     // ... bestehende Felder
     images    String[] // Review-Bilder
     helpful   Int      @default(0)
   }
   ```

2. **controllers/reviewController.js**:
   - `addReview()` - Review hinzufügen
   - `getProductReviews()` - Reviews für Product
   - `updateReview()` - Review aktualisieren
   - `deleteReview()` - Review löschen
   - `markHelpful()` - Review als hilfreich markieren

3. **routes/reviews.js** - `/api/reviews/*`

**Nach Phase 8:**
- ✅ Review-System funktional
- ✅ Product-Ratings automatisch berechnet

---

### **PHASE 9: Admin Panel & Final Polish** 🎛️
**Ziel**: Admin-Features + Error Handling + Deployment

**Erstellen:**
1. **controllers/adminController.js**:
   - `getAllUsers()` - User-Management
   - `getAllVendors()` - Vendor-Approval
   - `approveVendor()` - Vendor genehmigen
   - `getAllOrders()` - Alle Orders
   - `getPlatformAnalytics()` - Platform-Statistiken

2. **middleware/errorHandler.js** - Global Error Handler
3. **middleware/validation.js** - Input Validation
4. **utils/AppError.js** - Custom Error Class

5. **Deployment:**
   - Production Dockerfile (Multi-Stage)
   - docker-compose.prod.yml
   - .env.production.example
   - Seeds für Test-Daten

6. **Dokumentation:**
   - README.md mit API-Dokumentation
   - Postman Collection
   - Deployment-Guide

**Nach Phase 9:**
- ✅ Admin-Panel funktional
- ✅ Error Handling robust
- ✅ Production-ready
- ✅ Vollständig dokumentiert

---

## 🗂️ ERWEITERTES PRISMA SCHEMA (Zusammenfassung)

```prisma
// User (erweitert)
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String   // Hashed
  name        String
  image       String?
  role        String   @default("customer") // "customer" | "artist" | "admin"
  isArtist    Boolean  @default(false)
  cart        Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  portfolio   Portfolio?
  store       Store?
  ratings     Rating[]
  addresses   Address[]
  orders      Order[]
}

// Portfolio (NEU)
model Portfolio {
  id          String   @id @default(cuid())
  artistId    String   @unique
  title       String
  bio         String?
  coverImage  String?
  gallery     Json     @default("[]")
  socialLinks Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  artist  User     @relation(fields: [artistId], references: [id])
  artworks Artwork[]
}

// Artwork (NEU)
model Artwork {
  id          String   @id @default(cuid())
  portfolioId String
  title       String
  description String?
  imageUrl    String
  medium      String?
  style       String?
  year        Int?
  tags        String[]
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  portfolio Portfolio @relation(fields: [portfolioId], references: [id])
  products  Product[]
}

// Product (erweitert)
model Product {
  id          String   @id @default(cuid())
  artworkId   String?  // Verknüpfung zu Artwork
  storeId     String
  name        String
  description String
  price       Float
  mrp         Float
  images      String[]
  category    String
  inStock     Boolean  @default(true)
  
   // PoD-Felder (Prodigi)
   podProvider String?  // "prodigi"
   prodigiSku  String? // Prodigi Product SKU (z.B. "GLOBAL-CFPM-16X20")
   variants    Json     @default("[]") // [{type: "poster", size: "A3", sku: "...", price: 29.99}, ...]
   basePrice   Float?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  store      Store       @relation(fields: [storeId], references: [id])
  artwork    Artwork?    @relation(fields: [artworkId], references: [id])
  orderItems OrderItem[]
  ratings    Rating[]
  cartItems  CartItem[]
}

// CartItem (erweitert)
model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  productId String
  variant   Json     // {type: "poster", size: "A3"}
  quantity  Int      @default(1)
  price     Float
  
  cart    Cart    @relation(fields: [cartId], references: [id])
  product Product @relation(fields: [productId], references: [id])
}

// Order (erweitert)
model Order {
  id            String        @id @default(cuid())
  userId        String
  storeId       String
  total         Float
  status        OrderStatus   @default(ORDER_PLACED)
  addressId     String
  isPaid        Boolean       @default(false)
  paymentMethod PaymentMethod
  paymentIntentId String?     // Stripe PaymentIntent ID
  podOrderIds   Json          @default("[]") // PoD Order IDs
  trackingInfo  Json          @default("{}")
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  user       User        @relation(fields: [userId], references: [id])
  store      Store       @relation(fields: [storeId], references: [id])
  address    Address     @relation(fields: [addressId], references: [id])
  orderItems OrderItem[]
}
```

---

## 📦 DEPENDENCIES

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "stripe": "^13.0.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## 🚀 STARTEN MIT PHASE 1

**Bereit für Implementation?** 

Ich kann jetzt mit **Phase 1: Setup & Grundstruktur** beginnen. Soll ich:

1. ✅ Docker-Setup erstellen
2. ✅ Express-Server mit allen Middlewares
3. ✅ Prisma Schema erweitern (User, Portfolio, Artwork, Product)
4. ✅ Basis-Konfiguration

**Oder möchtest du zuerst:**
- Weitere Anpassungen am Plan?
- Fragen klären?
- Medusa vs. Custom Backend diskutieren? (siehe BACKEND_ENTSCHEIDUNG.md)

**Bereit? Dann starte ich mit Phase 1! 🚀**

