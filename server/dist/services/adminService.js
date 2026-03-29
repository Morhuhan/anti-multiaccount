"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllDemoData = clearAllDemoData;
const models_1 = require("../models");
async function clearAllDemoData() {
    // Сначала дочерние таблицы
    await models_1.UserFingerprint.truncate();
    await models_1.UserAuthAccount.truncate();
    await models_1.User.truncate();
}
//# sourceMappingURL=adminService.js.map