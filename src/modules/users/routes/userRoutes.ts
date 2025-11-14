import { Router } from 'express';
import { authenticateProvider } from '../../../middlewares/authMiddleware';
import { changePass, createUser, deleteUser, getUsers } from '../controller/userController';

const router = Router();

router.get('/', authenticateProvider, getUsers);
router.post('/', authenticateProvider, createUser);
router.patch('/change-pass/:id', authenticateProvider, changePass);
// router.patch('/:id', updateUser);
router.delete('/:id', authenticateProvider, deleteUser);

export default router;