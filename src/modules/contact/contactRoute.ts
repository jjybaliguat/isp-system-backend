import Router from 'express'
import { contactFormEmail } from './contactController'

const router = Router()

router.post("/", contactFormEmail)

export default router