import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export class AuthService {
  async register(email: string, password: string): Promise<void> {
    const existing = await User.findOne({ email });
    if (existing) {
      const err = new Error('Email already registered') as Error & { statusCode: number };
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ email, passwordHash });
  }

  async login(email: string, password: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) throw new InvalidCredentialsError();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new InvalidCredentialsError();

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET as Secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return token;
  }
}

export class InvalidCredentialsError extends Error {
  statusCode = 401;
  constructor() {
    super('Invalid email or password');
  }
}