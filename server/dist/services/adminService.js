"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllDemoData = clearAllDemoData;
const models_1 = require("../models");
async function clearAllDemoData() {
    // Child tables are cleared first so the reset works both with and without cascading FKs.
    await models_1.UserFingerprint.truncate();
    await models_1.UserAuthAccount.truncate();
    await models_1.User.truncate();
}
//# sourceMappingURL=adminService.js.map