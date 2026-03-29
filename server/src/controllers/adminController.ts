import type { Request, Response } from 'express'

import { clearAllDemoData } from '../services/adminService'

export async function resetDemoData(_req: Request, res: Response): Promise<void> {
  await clearAllDemoData()

  res.json({
    success: true,
    message: 'Все demo-данные удалены',
  })
}
