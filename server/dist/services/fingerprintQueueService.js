"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueTask = enqueueTask;
// The queue is intentionally in-memory and fire-and-forget:
// we do not block the HTTP response, but still keep writes serialized enough
// to avoid stampeding the database during bursts of activity logging.
let queue = Promise.resolve();
function enqueueTask(task) {
    queue = queue
        .then(task)
        .catch((error) => {
        console.error('Fingerprint background task failed', error);
    });
}
//# sourceMappingURL=fingerprintQueueService.js.map