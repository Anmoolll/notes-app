import mongoose from 'mongoose';
import { Note, INote } from '../models/Note';
import { User } from '../models/User';

const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const noteNotFound = () => {
  const e = new Error('Note not found') as Error & { statusCode: number };
  e.statusCode = 404;
  return e;
};

export class NotesService {
  private accessFilter(userId: string) {
    const uid = new mongoose.Types.ObjectId(userId);
    return { $or: [{ ownerId: uid }, { sharedWith: uid }] };
  }

  async getAll(
    userId: string,
    page = 1,
    limit = 20,
    tag?: string
  ): Promise<{ notes: INote[]; total: number; page: number; pages: number }> {
    const filter: Record<string, unknown> = this.accessFilter(userId);
    if (tag) filter.tags = tag.toLowerCase();

    const skip = (page - 1) * limit;
    const [notes, total] = await Promise.all([
      Note.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select('-versions'),
      Note.countDocuments(filter),
    ]);

    return { notes, total, page, pages: Math.ceil(total / limit) };
  }

  async getById(userId: string, noteId: string): Promise<INote> {
    if (!isValidId(noteId)) throw noteNotFound();
    const uid = new mongoose.Types.ObjectId(userId);
    const note = await Note.findOne({
      _id: noteId,
      $or: [{ ownerId: uid }, { sharedWith: uid }],
    });
    if (!note) throw noteNotFound();
    return note;
  }

  async create(
    userId: string,
    title: string,
    content: string,
    tags: string[] = []
  ): Promise<INote> {
    return Note.create({
      title,
      content,
      tags,
      ownerId: new mongoose.Types.ObjectId(userId),
    });
  }

  async update(
    userId: string,
    noteId: string,
    data: Partial<{ title: string; content: string; tags: string[] }>
  ): Promise<INote> {
    if (!isValidId(noteId)) throw noteNotFound();

    const note = await Note.findOne({
      _id: noteId,
      ownerId: new mongoose.Types.ObjectId(userId), // only owner can edit
    });
    if (!note) throw noteNotFound();

    // Save current version before overwriting
    note.versions.push({ title: note.title, content: note.content, savedAt: new Date() });

    if (data.title !== undefined) note.title = data.title;
    if (data.content !== undefined) note.content = data.content;
    if (data.tags !== undefined) note.tags = data.tags;

    await note.save();
    return note;
  }

  async delete(userId: string, noteId: string): Promise<void> {
    if (!isValidId(noteId)) throw noteNotFound();
    const result = await Note.deleteOne({
      _id: noteId,
      ownerId: new mongoose.Types.ObjectId(userId),
    });
    if (result.deletedCount === 0) throw noteNotFound();
  }

  async share(userId: string, noteId: string, shareWithEmail: string): Promise<void> {
    if (!isValidId(noteId)) throw noteNotFound();

    const note = await Note.findOne({
      _id: noteId,
      ownerId: new mongoose.Types.ObjectId(userId),
    });
    if (!note) throw noteNotFound();

    const targetUser = await User.findOne({ email: shareWithEmail });
    if (!targetUser) {
      const e = new Error('User not found') as Error & { statusCode: number };
      e.statusCode = 404;
      throw e;
    }

    if (note.ownerId.equals(targetUser._id as mongoose.Types.ObjectId)) {
      const e = new Error('Cannot share a note with yourself') as Error & { statusCode: number };
      e.statusCode = 400;
      throw e;
    }

    const alreadyShared = note.sharedWith.some((id) =>
      id.equals(targetUser._id as mongoose.Types.ObjectId)
    );
    if (!alreadyShared) {
      note.sharedWith.push(targetUser._id as mongoose.Types.ObjectId);
      await note.save();
    }
  }

  async search(
    userId: string,
    query: string,
    page = 1,
    limit = 20
  ): Promise<{ notes: INote[]; total: number }> {
    const uid = new mongoose.Types.ObjectId(userId);
    const filter = {
      $text: { $search: query },
      $or: [{ ownerId: uid }, { sharedWith: uid }],
    };
    const skip = (page - 1) * limit;
    const [notes, total] = await Promise.all([
      Note.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .select('-versions'),
      Note.countDocuments(filter),
    ]);
    return { notes, total };
  }

  async getVersions(userId: string, noteId: string) {
    const note = await this.getById(userId, noteId);
    return note.versions;
  }
}