import { Router } from 'express';
import { loginController, logout, refresh, registerController } from '../controller/authController';
import { rateLimiter } from '../../../middlewares/rateLimiter';
import { authenticateProvider } from '../../../middlewares/authMiddleware';

const router = Router();

router.post('/login', rateLimiter, loginController);
router.post('/register', registerController);
router.get('/refresh', refresh);
router.post('/logout', authenticateProvider, logout);

export default router;