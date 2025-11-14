import {Router} from 'express'
import { authenticateProvider } from '../../middlewares/authMiddleware'
import { assignOdpPort, createLcp, createOdc, createOdp, createOdpPort, createOlt, createPonPort, deleteLcp, deleteOdc, deleteOdp, deleteOdpPort, deleteOlt, deletePonPort, getNetworkHierarchy, unAssignOdpPort } from './network-hierarchy-controller'

const router = Router()

router.get("/", authenticateProvider, getNetworkHierarchy)
router.post("/olt", authenticateProvider, createOlt)
router.post("/pon-port", authenticateProvider, createPonPort)
router.post("/lcp", authenticateProvider, createLcp)
router.post("/odc", authenticateProvider, createOdc)
router.post("/odp", authenticateProvider, createOdp)
router.post("/odp-port", authenticateProvider, createOdpPort)
router.patch("/odp-port/assign", authenticateProvider, assignOdpPort)
router.patch("/odp-port/unassign", authenticateProvider, unAssignOdpPort)
router.delete("/olt/:id", authenticateProvider, deleteOlt)
router.delete("/pon-port/:id", authenticateProvider, deletePonPort)
router.delete("/lcp/:id", authenticateProvider, deleteLcp)
router.delete("/odc/:id", authenticateProvider, deleteOdc)
router.delete("/odp/:id", authenticateProvider, deleteOdp)
router.delete("/odp-port/:id", authenticateProvider, deleteOdpPort)

export default router