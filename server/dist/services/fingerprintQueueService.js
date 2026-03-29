"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueTask = enqueueTask;
// Фоновая очередь без блокировки HTTP-ответа
let queue = Promise.resolve();
function enqueueTask(task) {
    queue = queue
        .then(task)
        .catch((error) => {
        console.error('Fingerprint background task failed', error);
    });
}
//# sourceMappingURL=fingerprintQueueService.js.map