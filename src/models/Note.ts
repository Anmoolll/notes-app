import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  title: string;
  content: string;
  ownerId: mongoose.Types.ObjectId;
  sharedWith: mongoose.Types.ObjectId[];
  tags: string[];
  versions: { title: string; content: string; savedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    tags: [{ type: String, trim: true, lowercase: true }],
    versions: [
      {
        title: String,
        content: String,
        savedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Full-text search index on title + content
NoteSchema.index({ title: 'text', content: 'text' });

export const Note = mongoose.model<INote>('Note', NoteSchema);