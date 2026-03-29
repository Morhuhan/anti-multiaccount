import { User, UserAuthAccount, UserFingerprint } from '../models'

export async function clearAllDemoData(): Promise<void> {
  // Сначала дочерние таблицы
  await UserFingerprint.truncate()
  await UserAuthAccount.truncate()
  await User.truncate()
}
