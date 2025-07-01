import { test, expect, describe } from 'bun:test'
import retry from '../utils/retry.js'

// Test error classes
class NetworkError extends Error {
	constructor(message) {
		super(message)
		this.name = 'NetworkError'
	}
}

class TimeoutError extends Error {
	constructor(message) {
		super(message)
		this.name = 'TimeoutError'
	}
}

test('should succeed after retries with exponential backoff', async () => {
	let attempt = 0

	const failingFunction = async () => {
		attempt++
		if (attempt < 3) {
			throw new NetworkError('Network failed')
		}
		return 'Success!'
	}

	const result = await retry(failingFunction, [NetworkError], {
		maxRetries: 3,
		retryInterval: 10,
		backoff: true,
	})

	expect(result).toBe('Success!')
	expect(attempt).toBe(3)
})

test('should succeed after retries with linear backoff', async () => {
	let attempt = 0

	const failingFunction = async () => {
		attempt++
		if (attempt < 3) {
			throw new NetworkError('Network failed')
		}
		return 'Success!'
	}

	const result = await retry(failingFunction, [NetworkError], {
		maxRetries: 3,
		retryInterval: 10,
		backoff: false,
	})

	expect(result).toBe('Success!')
	expect(attempt).toBe(3)
})

test('should not retry on wrong error type', async () => {
	const timeoutFunction = async () => {
		throw new TimeoutError('Request timed out')
	}

	expect(
		retry(timeoutFunction, [NetworkError], {
			maxRetries: 3,
			retryInterval: 10,
		}),
	).rejects.toThrow('Request timed out')
})

test('should succeed immediately if no error', async () => {
	const successFunction = async () => 'Always succeeds'

	const result = await retry(successFunction, [NetworkError], {
		maxRetries: 3,
		retryInterval: 10,
	})

	expect(result).toBe('Always succeeds')
})

test('should throw error after max retries exceeded', async () => {
	let attempt = 0

	const alwaysFailingFunction = async () => {
		attempt++
		throw new NetworkError('Always fails')
	}

	expect(
		retry(alwaysFailingFunction, [NetworkError], {
			maxRetries: 2,
			retryInterval: 10,
		}),
	).rejects.toThrow('Always fails')

	expect(attempt).toBe(3) // Initial attempt + 2 retries
})

test('should retry on any error when ErrorTypes is empty', async () => {
	let attempt = 0

	const failingFunction = async () => {
		attempt++
		if (attempt < 2) {
			throw new Error('Generic error')
		}
		return 'Success!'
	}

	const result = await retry(failingFunction, [], {
		maxRetries: 3,
		retryInterval: 10,
	})

	expect(result).toBe('Success!')
	expect(attempt).toBe(2)
})

test('should validate input parameters', async () => {
	expect(retry('not a function', [])).rejects.toThrow('asyncFn must be a function')
	expect(retry(() => {}, 'not an array')).rejects.toThrow('ErrorTypes must be an array')
	expect(retry(() => {}, [], { jitter: 2 })).rejects.toThrow('jitter must be between 0 and 1.0')
	expect(retry(() => {}, [], { maxRetries: -1 })).rejects.toThrow('maxRetries must be non-negative')
	expect(retry(() => {}, [], { retryInterval: -1 })).rejects.toThrow('retryInterval must be non-negative')
})

test('should respect maxDelay option', async () => {
	let attempt = 0
	const start = Date.now()

	const failingFunction = async () => {
		attempt++
		if (attempt < 3) {
			throw new NetworkError('Network failed')
		}
		return 'Success!'
	}

	const result = await retry(failingFunction, [NetworkError], {
		maxRetries: 3,
		retryInterval: 1000,
		backoff: true,
		backoffMultiplier: 10,
		maxDelay: 50, // Cap delay at 50ms
	})

	const elapsed = Date.now() - start
	expect(result).toBe('Success!')
	expect(elapsed).toBeLessThan(200) // Should be much faster due to maxDelay
})

test('should apply jitter when specified', async () => {
	let attempt = 0
	const delays = []
	const originalSetTimeout = setTimeout

	// Monkey-patch setTimeout to capture delay values (used by retry func)
	setTimeout = (fn, delay) => {
		if (delay > 0) delays.push(delay)
		return originalSetTimeout(fn, Math.min(delay, 1)) // Speed up test
	}

	const failingFunction = async () => {
		attempt++
		if (attempt < 3) {
			throw new NetworkError('Network failed')
		}
		return 'Success!'
	}

	try {
		await retry(failingFunction, [NetworkError], {
			maxRetries: 3,
			retryInterval: 100,
			backoff: false,
			jitter: 0.5,
		})

		// With jitter, delays should vary around the base interval
		expect(delays.length).toBe(2)
		expect(delays.every((delay) => delay !== 100)).toBe(true) // Should not be exact base interval
	} finally {
		setTimeout = originalSetTimeout
	}
})
