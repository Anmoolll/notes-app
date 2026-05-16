import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import notesRoutes from './routes/notes.routes';
import { errorHandler } from './middleware/errorHandler';
import { authLimiter, apiLimiter } from './middleware/rateLimiter'; // new
import { openapiSpec } from './openapi';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(apiLimiter);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', authRoutes);
app.use('/notes', notesRoutes);

// Required endpoints
app.get('/openapi.json', (_req, res) => res.status(200).json(openapiSpec));

app.get('/about', (_req, res) => {
  res.status(200).json({
    name: 'Anmol Agarwal',
    email: 'anmolagarwa231@gmail.com',
    'my features': {
      'Note version history': 'Every PUT request on a note automatically saves the previous title and content into a versions array before overwriting. The full edit history is accessible via GET /notes/:id/versions. This means no content is ever permanently lost — users can review and recover any previous version of a note.',
      'Note tags': 'Notes support an array of string tags that can be set on creation or updated later. The GET /notes endpoint accepts a ?tag= query parameter to filter notes by a specific tag. Tags are stored lowercase and trimmed for consistency. This allows lightweight organisation without the complexity of folders or categories.',
      'Full-text search': 'GET /notes/search?q=keyword runs a MongoDB $text query against a compound index on both title and content fields. Results are ranked by relevance score so the most relevant notes surface first. Search is scoped to the authenticated user — only notes they own or have been shared with them are returned.',
      'Pagination': 'GET /notes accepts page and limit query parameters. The response includes the results array alongside total, page, and pages metadata fields so clients can build paginated UIs without additional requests. Limit is capped at 100 to prevent oversized payloads.',
      'Note sharing': 'Any note owner can share their note with another registered user by email via POST /notes/:id/share. Shared users can read the note via GET /notes and GET /notes/:id but cannot edit or delete it — write access is restricted to the owner only. Sharing the same note twice with the same user is handled gracefully without duplicating access.',
      'Rate limiting': 'Two tiers of rate limiting are applied. Auth endpoints (login and register) are limited to 10 requests per 15 minutes per IP to prevent brute force attacks. All other API endpoints are limited to 60 requests per minute. Limits are communicated via standard RateLimit headers so clients can handle them gracefully.',
      'Input validation': 'All request bodies are validated using Zod schemas before reaching business logic. Validation errors return a structured response with a per-field breakdown of what failed and why, rather than a generic 400. This makes the API easier to integrate against and debug.',
    },
  });
});


// Global error handler (must be last)
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to DB:', err);
    process.exit(1);
  });