import { invoke } from '@tauri-apps/api/core'

interface ErrorInfo {
  message: string
  file?: string
  line?: number
  stack?: string
}

interface LogOptions {
  file?: string
  line?: number
}

class Logger {
  private static formatError(error: Error | string): ErrorInfo {
    if (error instanceof Error) {
      const stack = error.stack
      if (stack) {
        // 从堆栈信息中提取文件和行号
        const matches = stack.match(/at\s+.*\s+\((.*):(\d+):(\d+)\)/)
        if (matches) {
          return {
            message: error.message,
            file: matches[1],
            line: parseInt(matches[2]),
            stack: stack,
          }
        }
      }
      return {
        message: error.message,
        stack: stack,
      }
    }
    return {
      message: error.toString(),
    }
  }

  static async error(error: Error | string, options?: LogOptions) {
    const errorInfo = this.formatError(error)
    try {
      await invoke('log_error', {
        message: errorInfo.message,
        file: options?.file || errorInfo.file,
        line: options?.line || errorInfo.line,
      })

      // 如果有堆栈信息，额外记录
      if (errorInfo.stack) {
        await invoke('log_error', {
          message: `Stack trace: ${errorInfo.stack}`,
        })
      }
    } catch (e) {
      console.error('Failed to log error:', e)
    }
  }

  static async warn(message: string, options?: LogOptions) {
    try {
      await invoke('log_warn', {
        message,
        file: options?.file,
        line: options?.line,
      })
    } catch (e) {
      console.error('Failed to log warning:', e)
    }
  }

  static async info(message: string) {
    try {
      await invoke('log_info', {
        message,
      })
    } catch (e) {
      console.error('Failed to log info:', e)
    }
  }

  // 全局错误处理器
  static setupErrorHandler() {
    window.onerror = async (message, source, lineno, colno, error) => {
      if (error) {
        await this.error(error)
      } else {
        await this.error(`${message} at ${source}:${lineno}:${colno}`)
      }
    }

    window.addEventListener('unhandledrejection', async (event) => {
      await this.error(`Unhandled Promise rejection: ${event.reason}`)
    })
  }
}

export default Logger
