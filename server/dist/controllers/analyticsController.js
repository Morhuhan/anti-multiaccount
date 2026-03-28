"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRelationships = getRelationships;
const relatedAccountsService_1 = require("../services/relatedAccountsService");
async function getRelationships(_req, res) {
    const analytics = await (0, relatedAccountsService_1.getAnalyticsRelationships)();
    res.json(analytics);
}
//# sourceMappingURL=analyticsController.js.map