import { User, UserAuthAccount, UserFingerprint } from '../models'

export async function clearAllDemoData(): Promise<void> {
  // Удаляем записи по порядку, совместимому с внешними ключами
  await UserFingerprint.destroy({ where: {} })
  await UserAuthAccount.destroy({ where: {} })
  await User.destroy({ where: {} })
}
