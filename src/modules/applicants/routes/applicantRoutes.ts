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
import { verifyRecaptcha } from '../../../middlewares/recaptcha';

const router = Router();

router.get('/', authenticateProvider, getApplicants);
router.get('/count', authenticateProvider, getApplicantsCount);
router.get('/status', getApplicationStatus);
// Public endpoint — require reCAPTCHA token to mitigate bots
router.post('/', verifyRecaptcha, createApplicant);
router.get('/:id', authenticateProvider, getApplicant);
router.patch('/:id', authenticateProvider, updateApplicant);
router.delete('/:id', authenticateProvider, deleteApplicant);

export default router;
