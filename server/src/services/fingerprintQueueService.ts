// Фоновая очередь без блокировки HTTP-ответа
let queue = Promise.resolve()

export function enqueueTask(task: () => Promise<void>): void {
  queue = queue
    .then(task)
    .catch((error: unknown) => {
      console.error('Fingerprint background task failed', error)
    })
}
