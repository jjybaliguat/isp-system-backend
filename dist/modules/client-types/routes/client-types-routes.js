"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_types_controller_1 = require("../controller/client-types-controller");
const authMiddleware_1 = require("../../../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', authMiddleware_1.authenticateProvider, client_types_controller_1.getClientTypes);
router.post('/', authMiddleware_1.authenticateProvider, client_types_controller_1.createClientType);
router.delete('/:id', authMiddleware_1.authenticateProvider, client_types_controller_1.deleteClientType);
router.patch('/:id', authMiddleware_1.authenticateProvider, client_types_controller_1.updatedClientType);
exports.default = router;
//# sourceMappingURL=client-types-routes.js.map