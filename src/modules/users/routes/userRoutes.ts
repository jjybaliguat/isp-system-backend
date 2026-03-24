import { Router } from 'express';
import { authenticateProvider } from '../../../middlewares/authMiddleware';
import { changePass, checkPassword, createUser, deleteUser, getUsers } from '../controller/userController';
import { rateLimiter } from '../../../middlewares/rateLimiter';

const router = Router();

router.get('/', authenticateProvider, getUsers);
router.post('/', authenticateProvider, createUser);
router.post('/check-pass', rateLimiter, authenticateProvider, checkPassword);
router.patch('/change-pass/:id', authenticateProvider, changePass);
// router.patch('/:id', updateUser);
router.delete('/:id', authenticateProvider, deleteUser);

export default router;