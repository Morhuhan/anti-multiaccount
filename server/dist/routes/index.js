"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const analyticsController_1 = require("../controllers/analyticsController");
const authController_1 = require("../controllers/authController");
const promoController_1 = require("../controllers/promoController");
const userController_1 = require("../controllers/userController");
exports.apiRouter = (0, express_1.Router)();
exports.apiRouter.post('/auth/register', authController_1.register);
exports.apiRouter.post('/auth/login', authController_1.login);
exports.apiRouter.post('/promos/activate', promoController_1.activatePromo);
exports.apiRouter.get('/users/:userId/related-accounts', userController_1.getUserRelatedAccounts);
exports.apiRouter.get('/users/:userId/fingerprints', userController_1.getUserFingerprints);
exports.apiRouter.get('/analytics/relationships', analyticsController_1.getRelationships);
//# sourceMappingURL=index.js.map