import { Router } from 'express';
import { authenticateProvider } from '../../../middlewares/authMiddleware';
import {
  getApplicants,
  getApplicant,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  getApplicationStatus,
  getApplicantsCount,
} from '../controller/applicantController';

const router = Router();

router.get('/', authenticateProvider, getApplicants);
router.get('/count', authenticateProvider, getApplicantsCount);
router.get('/status', getApplicationStatus);
router.post('/', createApplicant);
router.get('/:id', authenticateProvider, getApplicant);
router.patch('/:id', authenticateProvider, updateApplicant);
router.delete('/:id', authenticateProvider, deleteApplicant);

export default router;
