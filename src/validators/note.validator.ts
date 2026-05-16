import { z } from 'zod';

export const createNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    content: z.string().min(1, 'Content is required'),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
  }).refine(
    (data) => data.title !== undefined || data.content !== undefined || data.tags !== undefined,
    { message: 'At least one field (title, content, tags) must be provided' }
  ),
});

export const shareNoteSchema = z.object({
  body: z.object({
    share_with_email: z.string().email('Invalid email format'),
  }),
});