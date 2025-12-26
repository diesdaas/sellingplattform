# API Documentation

## 🏗️ Architecture Overview

GoCart uses a **microservices architecture** with the following services:

| Service | Port | Base URL | Purpose |
|---------|------|----------|---------|
| **API Gateway** | 8080 | `http://localhost:8080` | Main entry point, routing, auth |
| **Auth Service** | 3002 | `http://localhost:8080/auth` | User authentication & profiles |
| **Payment Service** | 3003 | `http://localhost:8080/payments` | Stripe payments & payouts |
| **Backend** | 5000 | `http://localhost:8080/api` | Catalog, Orders, Media, Notifications |
| **Frontend** | 3000 | `http://localhost:3000` | React/Next.js application |

## 🔑 Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## 📡 Base URLs

### API Gateway (Recommended)
```
http://localhost:8080
```
Routes all requests to appropriate microservices automatically.

### Direct Service Access (Development)
```
Auth:     http://localhost:3002/auth
Payment:  http://localhost:3003/payments
Backend:  http://localhost:5000/api
```

---

## 🔄 Migration from Monolithic API

### Old URLs → New URLs
```
OLD: /api/auth/login          → NEW: /auth/login (via Gateway)
OLD: /api/products            → NEW: /api/catalog/products (via Gateway)
OLD: /api/payments/create     → NEW: /payments/create (via Gateway)
```

### Backward Compatibility
The API Gateway maintains backward compatibility where possible, but new features use the microservices architecture.

---

## 📦 Catalog API

### List Products
```http
GET /api/catalog/products?page=1&limit=20&category=paintings&minPrice=10&maxPrice=100&search=abstract&sortBy=price&order=asc
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 50)
- `category` (string): Filter by category
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `search` (string): Search in name and description
- `artistId` (string): Filter by artist UUID
- `inStock` (boolean): Filter by stock status
- `sortBy` (string): Sort field (createdAt, price, name)
- `order` (string): Sort order (asc, desc)

**Response (200):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Abstract Painting",
        "price": 99.99,
        "category": "paintings",
        "store": {
          "id": "uuid",
          "name": "Artist Store",
          "username": "artist-store"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

### Get Product by ID
```http
GET /api/catalog/products/{id}
```

### Create Product (Artists Only)
```http
POST /api/catalog/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Beautiful Painting",
  "description": "A stunning landscape painting",
  "price": 149.99,
  "category": "landscapes",
  "artworkId": "uuid", // optional
  "images": ["https://example.com/image.jpg"]
}
```

### List Artworks
```http
GET /api/catalog/artworks?page=1&limit=20&artistId=uuid&search=landscape&medium=oil&style=impressionist
```

### Create Artwork (Artists Only)
```http
POST /api/catalog/artworks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Sunset Landscape",
  "description": "Beautiful sunset over mountains",
  "imageUrl": "https://example.com/artwork.jpg",
  "medium": "oil",
  "style": "impressionist",
  "year": 2024,
  "tags": ["landscape", "sunset", "mountains"],
  "isPublic": true
}
```

---

## 🔐 Auth Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "name": "John Doe",
  "image": "https://example.com/avatar.jpg" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "image": null,
      "role": "customer",
      "isArtist": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGc..."
  }
}
```

**Validation:**
- Email muss gültiges Format haben
- Password muss mindestens 8 Zeichen haben
- Password muss mindestens einen Großbuchstaben enthalten
- Password muss mindestens eine Zahl enthalten

---

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "customer",
      "isArtist": false
    },
    "token": "eyJhbGc..."
  }
}
```

---

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "customer",
      "isArtist": false
    }
  }
}
```

---

### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGc..."
  }
}
```

---

## User Endpoints

### Get User Profile
```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "image": null,
      "role": "customer",
      "isArtist": false,
      "portfolio": null,
      "store": null
    }
  }
}
```

---

### Update Profile
```http
PUT /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "image": "https://example.com/new-avatar.jpg",
  "email": "newemail@example.com" // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "clx...",
      "email": "newemail@example.com",
      "name": "Jane Doe",
      "image": "https://example.com/new-avatar.jpg",
      "role": "customer",
      "isArtist": false
    }
  }
}
```

---

### Change Password
```http
PUT /api/users/me/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Become Artist
```http
POST /api/users/become-artist
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully registered as artist",
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "artist",
      "isArtist": true
    }
  }
}
```

---

### Get User by ID (Public)
```http
GET /api/users/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "name": "John Doe",
      "image": null,
      "isArtist": true,
      "portfolio": {
        "id": "clx...",
        "title": "My Portfolio",
        "bio": "Artist bio",
        "coverImage": "https://..."
      },
      "store": {
        "id": "clx...",
        "name": "My Store",
        "username": "mystore",
        "logo": "https://...",
        "isActive": true
      }
    }
  }
}
```

---

## Portfolio Endpoints

### Get Portfolio by Artist ID (Public)
```http
GET /api/portfolios/:artistId
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "artist": {
      "id": "clx...",
      "name": "John Doe",
      "image": null,
      "isArtist": true
    },
    "portfolio": {
      "id": "clx...",
      "title": "My Art Portfolio",
      "bio": "I'm an artist...",
      "coverImage": "https://...",
      "socialLinks": {
        "instagram": "@artist",
        "twitter": "@artist"
      },
      "artworks": [
        {
          "id": "clx...",
          "title": "Sunset",
          "description": "Beautiful sunset",
          "imageUrl": "https://...",
          "medium": "Digital",
          "style": "Abstract",
          "year": 2024,
          "tags": ["sunset", "nature"],
          "isPublic": true
        }
      ]
    }
  }
}
```

---

### Get Portfolio by Username (Public)
```http
GET /api/portfolios/username/:username
```

**Response:** Same as above

---

### Get My Portfolio (Protected)
```http
GET /api/portfolios/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "id": "clx...",
      "title": "My Portfolio",
      "bio": "...",
      "artworks": [...]
    }
  }
}
```

---

### Create Portfolio (Protected, Artist Only)
```http
POST /api/portfolios
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Art Portfolio",
  "bio": "I'm an artist specializing in digital art",
  "coverImage": "https://example.com/cover.jpg",
  "socialLinks": {
    "instagram": "@myart",
    "twitter": "@myart"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Portfolio created successfully",
  "data": {
    "portfolio": {
      "id": "clx...",
      "title": "My Art Portfolio",
      "bio": "...",
      "artworks": []
    }
  }
}
```

---

### Update Portfolio (Protected, Owner Only)
```http
PUT /api/portfolios/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Portfolio Title",
  "bio": "Updated bio"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Portfolio updated successfully",
  "data": {
    "portfolio": {...}
  }
}
```

---

### Delete Portfolio (Protected, Owner Only)
```http
DELETE /api/portfolios/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Portfolio deleted successfully"
}
```

---

## Artwork Endpoints

### Get Artwork by ID (Public)
```http
GET /api/artworks/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "artwork": {
      "id": "clx...",
      "title": "Sunset",
      "description": "Beautiful sunset painting",
      "imageUrl": "https://...",
      "medium": "Digital",
      "style": "Abstract",
      "year": 2024,
      "tags": ["sunset", "nature"],
      "isPublic": true,
      "portfolio": {
        "id": "clx...",
        "artist": {
          "id": "clx...",
          "name": "John Doe"
        }
      },
      "products": [
        {
          "id": "clx...",
          "name": "Sunset Poster",
          "price": 29.99,
          "variants": [...]
        }
      ]
    }
  }
}
```

---

### Get Portfolio Artworks (Public)
```http
GET /api/portfolios/:artistId/artworks?page=1&limit=20&isPublic=true
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "artworks": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

---

### Add Artwork to Portfolio (Protected, Owner Only)
```http
POST /api/portfolios/me/artworks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Artwork",
  "description": "Description of artwork",
  "imageUrl": "https://example.com/artwork.jpg",
  "medium": "Digital",
  "style": "Abstract",
  "year": 2024,
  "tags": ["art", "digital"],
  "isPublic": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Artwork added successfully",
  "data": {
    "artwork": {
      "id": "clx...",
      "title": "New Artwork",
      ...
    }
  }
}
```

---

### Update Artwork (Protected, Owner Only)
```http
PUT /api/portfolios/artworks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "isPublic": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Artwork updated successfully",
  "data": {
    "artwork": {...}
  }
}
```

---

### Delete Artwork (Protected, Owner Only)
```http
DELETE /api/portfolios/artworks/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Artwork deleted successfully"
}
```

**Note:** Cannot delete artwork if it has associated products.

---

## Product Endpoints

### List Products
```http
GET /api/products?page=1&limit=20&category=art&minPrice=10&maxPrice=100&search=sunset&artistId=xxx&inStock=true&sortBy=price&order=asc
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `category` - Filter by category
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `search` - Search in name and description
- `artistId` - Filter by artist
- `inStock` - Filter by stock status (true/false)
- `sortBy` - Sort field (price, name, createdAt)
- `order` - Sort order (asc, desc)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "clx...",
        "name": "Sunset Poster",
        "description": "Beautiful sunset artwork",
        "price": 29.99,
        "mrp": 35.99,
        "images": ["https://..."],
        "category": "art",
        "inStock": true,
        "variants": [
          {
            "type": "poster",
            "size": "A3",
            "sku": "GLOBAL-PAP-A3",
            "price": 29.99
          }
        ],
        "store": {
          "id": "clx...",
          "name": "Artist Store",
          "username": "artiststore"
        },
        "artwork": {
          "id": "clx...",
          "title": "Sunset",
          "imageUrl": "https://..."
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

---

### Get Product by ID
```http
GET /api/products/:id
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "clx...",
      "name": "Sunset Poster",
      "description": "...",
      "price": 29.99,
      "variants": [...],
      "store": {
        "id": "clx...",
        "name": "Artist Store",
        "user": {
          "id": "clx...",
          "name": "John Doe"
        }
      },
      "artwork": {...},
      "ratings": [...]
    }
  }
}
```

---

### Create Product (Protected, Artist Only)
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "artworkId": "clx...", // optional
  "name": "Sunset Poster",
  "description": "Beautiful sunset artwork as poster",
  "category": "art",
  "price": 29.99,
  "basePrice": 25.00,
  "variants": [
    {
      "type": "poster",
      "size": "A3",
      "sku": "GLOBAL-PAP-A3",
      "price": 29.99
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": {
      "id": "clx...",
      "name": "Sunset Poster",
      "price": 29.99,
      "variants": [...],
      "store": {...},
      "artwork": {...}
    }
  }
}
```

---

### Update Product (Protected, Owner Only)
```http
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "price": 34.99,
  "inStock": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "product": {...}
  }
}
```

---

### Delete Product (Protected, Owner Only)
```http
DELETE /api/products/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Note:** Products with existing orders will be archived (soft delete) instead of deleted.

---

### Sync Product with Prodigi (Protected, Owner Only)
```http
POST /api/products/:id/sync-prodigi
Authorization: Bearer <token>
Content-Type: application/json

{
  "artworkImageUrl": "https://..." // optional, uses product image if not provided
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product synced with Prodigi",
  "data": {
    "product": {
      "id": "clx...",
      "variants": [
        {
          "type": "poster",
          "size": "A3",
          "sku": "GLOBAL-PAP-A3",
          "name": "A3 Poster",
          "price": 12.50,
          "basePrice": 12.50
        },
        {
          "type": "canvas",
          "size": "16x20",
          "sku": "GLOBAL-CFPM-16X20",
          "name": "16x20 Canvas Print",
          "price": 25.00,
          "basePrice": 25.00
        }
      ]
    },
    "variants": [...]
  }
}
```

**Note:** This endpoint calculates prices for all available Prodigi SKUs and updates the product variants.

---

### Get Available Prodigi SKUs
```http
GET /api/products/prodigi/skus
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "skus": {
      "canvas": [
        {
          "sku": "GLOBAL-CFPM-16X20",
          "name": "16x20 Canvas Print",
          "size": "16x20"
        },
        ...
      ],
      "poster": [
        {
          "sku": "GLOBAL-PAP-A3",
          "name": "A3 Poster",
          "size": "A3"
        },
        ...
      ],
      "fineArt": [...]
    }
  }
}
```

---

## Cart Endpoints

### Add Item to Cart (Protected)
```http
POST /api/cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "clx...",
  "variant": {
    "type": "poster",
    "size": "A3",
    "sku": "GLOBAL-PAP-A3"
  },
  "quantity": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cart": {
      "id": "clx...",
      "totalPrice": 29.99,
      "items": [
        {
          "id": "clx...",
          "productId": "clx...",
          "variant": {"type": "poster", "size": "A3"},
          "quantity": 1,
          "price": 29.99,
          "product": {
            "id": "clx...",
            "name": "Sunset Poster",
            "images": ["https://..."],
            "store": {
              "id": "clx...",
              "name": "Artist Store"
            }
          }
        }
      ]
    }
  }
}
```

---

### Get Cart (Protected)
```http
GET /api/cart
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "clx...",
      "totalPrice": 59.98,
      "items": [
        {
          "id": "clx...",
          "productId": "clx...",
          "variant": {...},
          "quantity": 2,
          "price": 29.99,
          "product": {
            "name": "Sunset Poster",
            "store": {...},
            "artwork": {...}
          }
        }
      ]
    }
  }
}
```

---

### Update Cart Item (Protected)
```http
PUT /api/cart/:itemId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cart item updated",
  "data": {
    "cart": {...}
  }
}
```

---

### Remove Cart Item (Protected)
```http
DELETE /api/cart/:itemId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Item removed from cart",
  "data": {
    "cart": {...}
  }
}
```

---

### Clear Cart (Protected)
```http
POST /api/cart/clear
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cart cleared",
  "data": {
    "cart": {
      "items": [],
      "totalPrice": 0
    }
  }
}
```

---

## Order Endpoints

### Create Order from Cart (Protected)
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "addressId": "clx...",
  "paymentMethod": "STRIPE"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orders": [
      {
        "id": "clx...",
        "total": 59.98,
        "status": "ORDER_PLACED",
        "isPaid": false,
        "paymentMethod": "STRIPE",
        "orderItems": [
          {
            "productId": "clx...",
            "quantity": 2,
            "price": 29.99,
            "variant": {...},
            "product": {
              "name": "Sunset Poster",
              "store": {...}
            }
          }
        ],
        "store": {...},
        "address": {...}
      }
    ]
  }
}
```

**Note:** Orders are created per store. If cart contains items from multiple stores, multiple orders will be created.

---

### Get User's Orders (Protected)
```http
GET /api/orders?status=ORDER_PLACED&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - Filter by status (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "clx...",
        "total": 59.98,
        "status": "ORDER_PLACED",
        "orderItems": [...],
        "store": {...},
        "address": {...}
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### Get Order by ID (Protected)
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "clx...",
      "total": 59.98,
      "status": "ORDER_PLACED",
      "isPaid": false,
      "paymentMethod": "STRIPE",
      "orderItems": [...],
      "store": {...},
      "address": {...},
      "user": {...}
    }
  }
}
```

**Note:** Accessible by order owner, vendor, or admin.

---

### Update Order Status (Protected, Vendor/Admin Only)
```http
PUT /api/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "SHIPPED"
}
```

**Valid Statuses:**
- `ORDER_PLACED`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`

**Response (200):**
```json
{
  "success": true,
  "message": "Order status updated",
  "data": {
    "order": {...}
  }
}
```

---

### Cancel Order (Protected, Owner Only)
```http
POST /api/orders/:id/cancel
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "order": {
      "id": "clx...",
      "status": "CANCELLED",
      ...
    }
  }
}
```

**Note:** Cannot cancel orders that are already DELIVERED or CANCELLED. Product stock will be restored.

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email, password, and name are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Testing mit cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### Get Me (mit Token)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

