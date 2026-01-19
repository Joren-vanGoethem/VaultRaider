const maxConcurrentRequests = 25;

// Request queue for fetchSecret to limit concurrent requests
export class RequestQueue {
  private queue: Array<() => void> = [];
  private activeRequests = 0;
  private readonly maxConcurrent: number;

  constructor(maxConcurrent: number = maxConcurrentRequests) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    // If we're at max capacity, wait in queue
    if (this.activeRequests >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.activeRequests++;

    try {
      return await task();
    } finally {
      this.activeRequests--;
      // Process next item in queue
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  getActiveCount(): number {
    return this.activeRequests;
  }

  getQueuedCount(): number {
    return this.queue.length;
  }
}

