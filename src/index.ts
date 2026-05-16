import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import notesRoutes from './routes/notes.routes';
import { errorHandler } from './middleware/errorHandler';
import { openapiSpec } from './openapi';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
      'Note version history': 'Every PUT on a note saves the previous title and content to a versions array. Accessible via GET /notes/:id/versions. Chose this because it adds real product value — users can recover accidentally overwritten notes.',
      'Note tags': 'Notes can have string tags. Filter all notes by tag via GET /notes?tag=work. Allows lightweight organisation without folders.',
      'Full-text search': 'GET /search?q=keyword uses MongoDB $text index on title and content. Results ranked by relevance score.',
      'Pagination': 'GET /notes accepts page and limit query params. Prevents large payloads for users with many notes.',
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