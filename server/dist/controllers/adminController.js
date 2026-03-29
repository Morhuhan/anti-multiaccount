"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetDemoData = resetDemoData;
const adminService_1 = require("../services/adminService");
async function resetDemoData(_req, res) {
    await (0, adminService_1.clearAllDemoData)();
    res.json({
        success: true,
        message: 'Все demo-данные удалены',
    });
}
//# sourceMappingURL=adminController.js.map