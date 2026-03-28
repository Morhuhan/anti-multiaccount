import { db } from '../lib/db'

export async function clearAllDemoData(): Promise<void> {
  await db.execute('DELETE FROM `UserFingerprint`')
  await db.execute('DELETE FROM `UserAuthAccount`')
  await db.execute('DELETE FROM `User`')

  await db.execute('ALTER TABLE `UserFingerprint` AUTO_INCREMENT = 1')
  await db.execute('ALTER TABLE `UserAuthAccount` AUTO_INCREMENT = 1')
  await db.execute('ALTER TABLE `User` AUTO_INCREMENT = 1')
}
