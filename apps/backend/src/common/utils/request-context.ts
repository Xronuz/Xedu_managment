import { AsyncLocalStorage } from 'async_hooks';

interface RequestContextData {
  correlationId: string;
  userId?: string;
  tenantId?: string;
  role?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContextData>();

export class RequestContext {
  static getStore(): RequestContextData | undefined {
    return asyncLocalStorage.getStore();
  }

  static getCorrelationId(): string | undefined {
    return asyncLocalStorage.getStore()?.correlationId;
  }

  static run<T>(data: RequestContextData, fn: () => T): T {
    return asyncLocalStorage.run(data, fn);
  }

  static set(data: Partial<RequestContextData>): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, data);
    }
  }
}
