const isDev = import.meta.env.DEV;

const emit = (level: 'log' | 'warn' | 'error', scope: string, event: string, data?: unknown) => {
  if (!isDev) return;

  const prefix = `[${scope}]`;
  if (level === 'warn') {
    console.warn('[Warning]', prefix, event, data);
    return;
  }

  if (level === 'error') {
    console.error('[Error]', prefix, event, data);
    return;
  }

  console.log(prefix, event, data);
};

export const logEvent = (scope: string, event: string, data?: unknown) => emit('log', scope, event, data);
export const logWarn = (scope: string, message: string, data?: unknown) => emit('warn', scope, message, data);
export const logError = (scope: string, error: unknown, data?: unknown) => emit('error', scope, String(error), data);
