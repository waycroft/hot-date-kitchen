/**
 * Retry utility function with exponential backoff and jitter support
 * @param {Function} asyncFn - The async function to retry
 * @param {Array<Function>} ErrorTypes - Array of error constructors to retry on
 * @param {Object} options - Retry options
 * @param {boolean} options.backoff - Whether to use exponential backoff (true) or linear retry (false)
 * @param {number} options.backoffMultiplier - Multiplier for exponential backoff (default: 2)
 * @param {number} options.retryInterval - Base retry interval in milliseconds (default: 1000)
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.jitter - Jitter factor between 0 and 1.0 (default: 0)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 30000)
 * @param {number} options.timeout - Timeout for each attempt in milliseconds (default: 0 - no timeout)
 * @returns {Promise<any>} - Promise that resolves to the result of asyncFn
 */
export default async function retry(asyncFn, ErrorTypes = [], options = {}) {
  const {
    backoff = true,
    backoffMultiplier = 2,
    retryInterval = 1000,
    maxRetries = 3,
    jitter = 1,
    maxDelay = 30000,
    timeout = 0,
  } = options;

  // Validate options
  if (typeof asyncFn !== "function") {
    throw new TypeError("asyncFn must be a function");
  }
  if (!Array.isArray(ErrorTypes)) {
    throw new TypeError("ErrorTypes must be an array");
  }
  if (jitter < 0 || jitter > 1) {
    throw new RangeError("jitter must be between 0 and 1.0");
  }
  if (maxRetries < 0) {
    throw new RangeError("maxRetries must be non-negative");
  }
  if (retryInterval < 0) {
    throw new RangeError("retryInterval must be non-negative");
  }

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      let result;
      if (timeout > 0) {
        // Wrap function call with timeout
        result = await Promise.race([
          asyncFn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Operation timed out")), timeout),
          ),
        ]);
      } else {
        result = await asyncFn();
      }
      return result;
    } catch (error) {
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Check if we should retry on this error type
      const shouldRetry =
        ErrorTypes.length === 0 ||
        ErrorTypes.some(
          (ErrorType) =>
            error instanceof ErrorType || error.constructor === ErrorType,
        );

      if (!shouldRetry) {
        throw error;
      }

      attempt++;

      // Calculate delay
      let delay;
      if (backoff) {
        // Exponential backoff
        delay = retryInterval * Math.pow(backoffMultiplier, attempt - 1);
      } else {
        // Linear retry
        delay = retryInterval;
      }

      // Apply maximum delay limit
      delay = Math.min(delay, maxDelay);

      // Apply jitter
      if (jitter > 0) {
        const jitterAmount = delay * jitter * Math.random();
        delay = delay + jitterAmount - (delay * jitter) / 2;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, delay)));
    }
  }
}
