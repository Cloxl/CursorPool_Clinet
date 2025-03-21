import type { OperationRecord, HistoryRecords } from '../types/history'
import { saveHistoryRecord, saveHistoryRecords, getHistoryRecords } from '../api'
import type { HistoryRecord } from '../api/types'

const HISTORY_KEY = 'operation_history'

/**
 * 添加历史记录
 * @param type 操作类型
 * @param detail 操作详情
 */
export async function addHistoryRecord(type: string, detail: string) {
  // 创建新记录
  const newRecord: OperationRecord = {
    id: Date.now(),

    type,
    detail,
    timestamp: new Date().toLocaleString(),
    operator: 'System',
  }

  try {
    // 保存到后端数据库
    await saveHistoryRecord({
      id: newRecord.id,
      type_name: newRecord.type,
      detail: newRecord.detail,
      timestamp: newRecord.timestamp,
      operator: newRecord.operator,
    })

    // 触发更新事件
    window.dispatchEvent(new Event('history_updated'))
  } catch (error) {
    console.error('保存历史记录到后端失败，回退到本地存储:', error)

    // 如果后端保存失败，回退到本地存储
    const history: HistoryRecords = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    history.unshift(newRecord)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))

    // 触发更新事件
    window.dispatchEvent(new Event('history_updated'))
  }
}

/**
 * 获取历史记录
 * @returns 历史记录列表
 */
export async function getHistoryList(): Promise<HistoryRecords> {
  try {
    // 尝试从后端获取历史记录
    const records = await getHistoryRecords()

    // 转换格式
    return records.map((record) => ({
      id: record.id,
      type: record.type_name,
      detail: record.detail,
      timestamp: record.timestamp,
      operator: record.operator,
    }))
  } catch (error) {
    console.error('从后端获取历史记录失败，回退到本地存储:', error)

    // 如果后端获取失败，回退到本地存储
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  }
}

/**
 * 同步本地历史记录到后端
 * 在应用启动时调用
 */
export async function syncLocalHistoryToBackend() {
  const localHistory = localStorage.getItem(HISTORY_KEY)

  if (!localHistory) {
    return // 没有本地历史记录，不需要同步
  }

  try {
    const records: HistoryRecords = JSON.parse(localHistory)

    if (records.length === 0) {
      // 空记录，直接清除本地存储
      localStorage.removeItem(HISTORY_KEY)
      return
    }

    // 转换格式
    const backendRecords: HistoryRecord[] = records.map((record) => ({
      id: record.id,
      type_name: record.type,
      detail: record.detail,
      timestamp: record.timestamp,
      operator: record.operator,
    }))

    // 批量保存到后端
    await saveHistoryRecords(backendRecords)
    console.log(`成功同步 ${records.length} 条本地历史记录到后端`)
  } catch (error) {
    console.error('同步本地历史记录到后端失败:', error)
    // 即使同步失败，也清除本地存储，避免重复同步
  } finally {
    // 无论成功失败，都清除本地存储
    localStorage.removeItem(HISTORY_KEY)
  }
}
