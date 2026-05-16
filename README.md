# Notes App — Backend API

A multi-user notes REST API built with Node.js, Express, TypeScript, and MongoDB. Supports user authentication, full note management, note sharing between users, full-text search, pagination, and note version history.

---

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js (TypeScript)
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JSON Web Tokens (jsonwebtoken) + bcryptjs
- **Validation**: Zod
- **Rate Limiting**: express-rate-limit
- **Containerization**: Docker + Docker Compose

---

## Project Structure

```
notes-app/
├── src/
│   ├── config/
│   │   └── db.ts               # MongoDB connection
│   ├── middleware/
│   │   ├── auth.ts             # JWT auth guard
│   │   ├── errorHandler.ts     # Global error handler
│   │   ├── rateLimiter.ts      # Rate limiting rules
│   │   └── validate.ts         # Zod request validation
│   ├── models/
│   │   ├── Note.ts             # Note schema
│   │   └── User.ts             # User schema
│   ├── routes/
│   │   ├── auth.routes.ts      # /register, /login
│   │   └── notes.routes.ts     # /notes/*
│   ├── services/
│   │   ├── auth.service.ts     # Registration, login logic
│   │   └── notes.service.ts    # CRUD, share, search logic
│   ├── validators/
│   │   ├── auth.validator.ts   # Register/login schemas
│   │   └── note.validator.ts   # Note create/update schemas
│   ├── openapi.ts              # OpenAPI 3.0 spec
│   └── index.ts                # App entry point
├── .env
├── .dockerignore
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## Environment Variables

Create a `.env` file in the root of the project:

```
PORT=3000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/notesapp
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
```

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (default: 3000) |
| `MONGO_URI` | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | Secret key used to sign JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry duration (e.g. 7d, 24h) |

---

## Running Locally

### Without Docker

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production build
npm start
```

### With Docker

```bash
# Build and start the app + MongoDB
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f app

# Stop everything
docker compose down

# Stop and wipe the database volume
docker compose down -v
```

When running with Docker Compose, MongoDB runs as a local container. The `MONGO_URI` is set automatically inside Compose — you only need `JWT_SECRET` in your `.env` file.

---

## API Endpoints

All endpoints that require authentication expect the following header:

```
Authorization: Bearer <your_jwt_token>
```

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new user |
| POST | `/login` | No | Login and receive a JWT |

### Notes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/notes` | Yes | Get all notes (paginated, filterable by tag) |
| POST | `/notes` | Yes | Create a new note |
| GET | `/notes/search?q=` | Yes | Full-text search across notes |
| GET | `/notes/:id` | Yes | Get a specific note |
| PUT | `/notes/:id` | Yes | Update a note |
| DELETE | `/notes/:id` | Yes | Delete a note |
| POST | `/notes/:id/share` | Yes | Share a note with another user |
| GET | `/notes/:id/versions` | Yes | Get version history of a note |

### Utility

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Server health check |
| GET | `/about` | No | Author info and feature descriptions |
| GET | `/openapi.json` | No | OpenAPI 3.0 spec for all endpoints |

---

## Query Parameters

**GET /notes**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Results per page (max 100) |
| `tag` | string | — | Filter notes by tag |

**GET /notes/search**

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search keyword |
| `page` | integer | No | Page number |
| `limit` | integer | No | Results per page |

---

## Features

### Core Features

- User registration with hashed passwords (bcrypt, 12 rounds)
- JWT-based authentication with configurable expiry
- Full CRUD for notes, scoped to the authenticated user
- Note sharing — share any note with another registered user by email; shared users can read but not modify or delete
- Input validation on all endpoints with descriptive error messages

### Additional Features

**Note version history** — every PUT request on a note saves the previous title and content into a `versions` array before overwriting. The full history is accessible via `GET /notes/:id/versions`. This allows users to recover content from any previous edit.

**Note tags** — notes can be created or updated with an array of string tags. The `GET /notes` endpoint accepts a `?tag=` query parameter to filter notes by tag. Tags are stored lowercase and trimmed.

**Full-text search** — `GET /notes/search?q=keyword` runs a MongoDB `$text` query against an index on both `title` and `content`. Results are ranked by relevance score. Only notes the authenticated user owns or has access to via sharing are returned.

**Pagination** — `GET /notes` supports `page` and `limit` query params. The response includes `total`, `page`, and `pages` fields alongside the results array.

---

## Rate Limiting

| Scope | Limit | Window |
|---|---|---|
| `/login`, `/register` | 10 requests | 15 minutes |
| All other endpoints | 60 requests | 1 minute |

Exceeding the limit returns `429 Too Many Requests`.

---

## Error Responses

All errors follow a consistent shape:

```json
{ "message": "Description of the error" }
```

Validation errors include a detailed breakdown:

```json
{
  "message": "Validation error",
  "errors": [
    { "field": "body.email", "message": "Invalid email format" }
  ]
}
```

| Status Code | Meaning |
|---|---|
| 400 | Bad request or validation error |
| 401 | Missing, invalid, or expired token |
| 404 | Resource not found or not accessible |
| 409 | Conflict (e.g. email already registered) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Deploying to Render

1. Push the repository to GitHub
2. Go to Render → New Web Service → connect the repo
3. Set the following:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`
5. Deploy — Render will provide a live URL

Use a MongoDB Atlas cluster as the database when deploying to Render.