type LogFn = (...args: unknown[]) => void

const noop: LogFn = () => undefined

const canLog = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV)

export const logger = {
  log: canLog ? ((...args: unknown[]) => console.log(...args)) : noop,
  warn: canLog ? ((...args: unknown[]) => console.warn(...args)) : noop,
  error: (...args: unknown[]) => console.error(...args),
}
