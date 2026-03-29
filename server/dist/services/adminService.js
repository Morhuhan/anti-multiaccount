"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllDemoData = clearAllDemoData;
const models_1 = require("../models");
async function clearAllDemoData() {
    // Удаляем записи по порядку, совместимому с внешними ключами
    await models_1.UserFingerprint.destroy({ where: {} });
    await models_1.UserAuthAccount.destroy({ where: {} });
    await models_1.User.destroy({ where: {} });
}
//# sourceMappingURL=adminService.js.map