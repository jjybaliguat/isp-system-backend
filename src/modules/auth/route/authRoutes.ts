import { Router } from 'express';
import { loginController, logout, refresh, registerController, forgotPassword, resetPassword } from '../controller/authController';
import { rateLimiter } from '../../../middlewares/rateLimiter';
import { authenticateProvider } from '../../../middlewares/authMiddleware';

const router = Router();

router.post('/login', rateLimiter, loginController);
router.post('/register', registerController);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/refresh', refresh);
router.post('/logout', authenticateProvider, logout);

export default router;