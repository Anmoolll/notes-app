import { Router, Request, Response, NextFunction } from 'express';
import { AuthService, InvalidCredentialsError } from '../services/auth.service';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();
const authService = new AuthService();

router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.register(req.body.email, req.body.password);
      res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      if (e.statusCode === 409) {
        res.status(409).json({ message: e.message });
        return;
      }
      next(err);
    }
  }
);

router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = await authService.login(req.body.email, req.body.password);
      res.status(200).json({ access_token: token });
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        res.status(401).json({ message: err.message });
        return;
      }
      next(err);
    }
  }
);

export default router;