# Admin User Setup Guide

Es gibt mehrere Möglichkeiten, einen Admin User zu erstellen:

## 🎯 Methode 1: Script verwenden (Empfohlen)

Das einfachste und schnellste Verfahren:

```bash
# 1. Optional: Admin-Daten in .env setzen (sonst werden Defaults verwendet)
# ADMIN_EMAIL=admin@example.com
# ADMIN_PASSWORD=Admin123!
# ADMIN_NAME=Admin User

# 2. Script ausführen
docker-compose exec api npm run create-admin

# Oder lokal (ohne Docker):
npm run create-admin
```

Das Script:
- ✅ Erstellt einen neuen Admin User ODER
- ✅ Aktualisiert einen bestehenden User zu Admin
- ✅ Hasht das Passwort automatisch
- ✅ Setzt `role='admin'` und `isArtist=false`

**Nach dem Script kannst du dich mit den Credentials einloggen!**

---

## 🎯 Methode 2: Prisma Studio (GUI)

### Schritt 1: Prisma Studio starten

```bash
# Im Docker Container:
docker-compose exec api npm run prisma:studio

# Oder lokal:
npm run prisma:studio
```

Prisma Studio öffnet sich im Browser auf: **http://localhost:5555**

### Schritt 2: User erstellen/bearbeiten

**Option A: Neuen User erstellen**
1. Klicke auf **"User"** in der linken Sidebar
2. Klicke auf **"Add record"**
3. Fülle die Felder aus:
   - `id`: Wird automatisch generiert (kann leer bleiben)
   - `email`: z.B. `admin@example.com`
   - `password`: **WICHTIG** - muss gehasht sein! (siehe unten)
   - `name`: z.B. `Admin User`
   - `role`: `admin`
   - `isArtist`: `false`
   - `cart`: `{}`
   - `createdAt`: Wird automatisch gesetzt
   - `updatedAt`: Wird automatisch gesetzt

**Option B: Bestehenden User zu Admin machen**
1. Klicke auf **"User"** in der linken Sidebar
2. Suche den User (z.B. nach Email)
3. Klicke auf den User
4. Ändere `role` zu `admin`
5. Klicke auf **"Save 1 change"**

### ⚠️ WICHTIG: Password Hashing

Wenn du einen neuen User in Prisma Studio erstellst, **MUSS** das Password gehasht sein!

**Option 1: Script verwenden** (empfohlen - macht das automatisch)

**Option 2: Manuell hashen**:
```bash
# Node.js REPL starten
node

# Dann:
const bcrypt = require('bcryptjs');
bcrypt.hash('DeinPasswort123!', 12).then(hash => console.log(hash));
# Kopiere den Hash und verwende ihn als password Wert
```

**Option 3: Via API registrieren und dann zu Admin ändern** (siehe Methode 3)

---

## 🎯 Methode 3: Via API registrieren + zu Admin ändern

### Schritt 1: User registrieren

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!",
    "name": "Admin User"
  }'
```

### Schritt 2: User ID notieren

Aus der Response: `"id": "clx..."`

### Schritt 3: User zu Admin ändern (via Prisma Studio oder direkt in DB)

**Via Prisma Studio:**
1. Öffne Prisma Studio: `npm run prisma:studio`
2. Gehe zu User Model
3. Finde den User (nach Email oder ID)
4. Ändere `role` zu `admin`
5. Speichere

**Via Prisma CLI (im Container):**
```bash
docker-compose exec api npx prisma studio
# Dann wie oben beschrieben
```

---

## 🎯 Methode 4: Direkt in PostgreSQL (Advanced)

```bash
# 1. In PostgreSQL Container einloggen
docker-compose exec postgres psql -U user -d gocart

# 2. Password hash generieren (in Node.js):
# const bcrypt = require('bcryptjs');
# bcrypt.hash('Admin123!', 12).then(console.log);

# 3. SQL ausführen (ersetze USER_ID und PASSWORD_HASH):
UPDATE "User" SET role = 'admin' WHERE id = 'USER_ID';
# ODER
INSERT INTO "User" (id, email, password, name, role, "isArtist", cart, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@example.com',
  'PASSWORD_HASH_HIER',
  'Admin User',
  'admin',
  false,
  '{}',
  NOW(),
  NOW()
);
```

---

## ✅ Verifizierung

Nach dem Erstellen kannst du testen:

```bash
# 1. Login als Admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'

# 2. Admin Endpoint testen (mit Token aus Login)
curl -X GET http://localhost:5000/api/admin/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Wenn du die Analytics-Daten erhältst, funktioniert alles! ✅

---

## 🔐 Empfohlene Admin Credentials

Für Development:
- Email: `admin@example.com`
- Password: `Admin123!` (bitte in Production ändern!)

Für Production:
- Verwende starke, eindeutige Credentials
- Ändere das Passwort regelmäßig
- Nutze 2FA wenn möglich

---

## 🐛 Troubleshooting

### "Admin access required" Fehler
- Prüfe ob `role='admin'` gesetzt ist (nicht `'artist'` oder `'customer'`)
- Prüfe ob der Token korrekt ist
- Prüfe ob der User existiert

### Password funktioniert nicht
- Stelle sicher, dass das Password gehasht ist (nicht plain text)
- Verwende das Script (Methode 1) - das macht es automatisch richtig

### Prisma Studio startet nicht
```bash
# Prisma Client generieren
docker-compose exec api npm run prisma:generate

# Dann nochmal versuchen
docker-compose exec api npm run prisma:studio
```

---

## 📝 Zusammenfassung

**Schnellste Methode:**
```bash
docker-compose exec api npm run create-admin
```

**Dann einloggen:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Admin123!"}'
```

Fertig! 🎉






