import { Router, Response, NextFunction } from 'express';
import { authGuard, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createNoteSchema,
  updateNoteSchema,
  shareNoteSchema,
} from '../validators/note.validator';
import { NotesService } from '../services/notes.service';

const router = Router();
const notesService = new NotesService();

// All notes routes require auth
router.use(authGuard);

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  const e = err as Error & { statusCode?: number };
  if (e.statusCode) {
    res.status(e.statusCode).json({ message: e.message });
    return;
  }
  next(err);
};

// GET /notes — paginated, optional ?tag= filter
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const tag = req.query.tag as string | undefined;
    const result = await notesService.getAll(req.userId!, page, limit, tag);
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
});

// GET /notes/search?q=keyword
router.get('/search', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q) {
      res.status(400).json({ message: 'Query parameter q is required' });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await notesService.search(req.userId!, q, page, limit);
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
});

// GET /notes/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const note = await notesService.getById(req.userId!, req.params.id);
    res.status(200).json(note);
  } catch (err) {
    handleError(err, res, next);
  }
});

// GET /notes/:id/versions  ← custom feature
router.get('/:id/versions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versions = await notesService.getVersions(req.userId!, req.params.id);
    res.status(200).json(versions);
  } catch (err) {
    handleError(err, res, next);
  }
});

// POST /notes
router.post(
  '/',
  validate(createNoteSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const note = await notesService.create(
        req.userId!,
        req.body.title,
        req.body.content,
        req.body.tags
      );
      res.status(201).json(note);
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

// PUT /notes/:id
router.put(
  '/:id',
  validate(updateNoteSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const note = await notesService.update(req.userId!, req.params.id, req.body);
      res.status(200).json(note);
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

// DELETE /notes/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notesService.delete(req.userId!, req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(err, res, next);
  }
});

// POST /notes/:id/share
router.post(
  '/:id/share',
  validate(shareNoteSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await notesService.share(req.userId!, req.params.id, req.body.share_with_email);
      res.status(200).json({ message: 'Note shared successfully' });
    } catch (err) {
      handleError(err, res, next);
    }
  }
);

export default router;