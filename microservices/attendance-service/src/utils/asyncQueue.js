const logger = require('../config/logger');

class AsyncQueue {
  constructor(name, options = {}) {
    this.name = name;
    this.concurrency = options.concurrency || 3;
    this.timeout = options.timeout || 10000;
    this.queue = [];
    this.running = 0;
    this.stats = {
      processed: 0,
      failed: 0,
      timeouts: 0
    };
  }
  
  async add(task, priority = 0) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        task,
        priority,
        resolve,
        reject,
        addedAt: Date.now()
      };
      
      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(item => item.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(insertIndex, 0, queueItem);
      }
      
      this.process();
    });
  }
  
  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const item = this.queue.shift();
    
    try {
      const startTime = Date.now();
      
      // Execute with timeout
      const result = await Promise.race([
        item.task(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Queue task timeout')), this.timeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      this.stats.processed++;
      
      logger.debug('Queue task completed', {
        queue: this.name,
        duration: `${duration}ms`,
        queueLength: this.queue.length
      });
      
      item.resolve(result);
    } catch (error) {
      const duration = Date.now() - item.addedAt;
      
      if (error.message === 'Queue task timeout') {
        this.stats.timeouts++;
        logger.warn('Queue task timed out', {
          queue: this.name,
          duration: `${duration}ms`,
          timeout: this.timeout
        });
      } else {
        this.stats.failed++;
        logger.error('Queue task failed', {
          queue: this.name,
          error: error.message,
          duration: `${duration}ms`
        });
      }
      
      item.reject(error);
    } finally {
      this.running--;
      // Process next item
      setImmediate(() => this.process());
    }
  }
  
  getStats() {
    return {
      name: this.name,
      queueLength: this.queue.length,
      running: this.running,
      stats: this.stats
    };
  }
}

// Create specialized queues
const employeeLookupQueue = new AsyncQueue('EMPLOYEE_LOOKUP', {
  concurrency: 2,
  timeout: 6000
});

const storeLookupQueue = new AsyncQueue('STORE_LOOKUP', {
  concurrency: 3,
  timeout: 4000
});

module.exports = {
  AsyncQueue,
  employeeLookupQueue,
  storeLookupQueue
};