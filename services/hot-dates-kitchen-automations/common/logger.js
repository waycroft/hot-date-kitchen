export default class Logger {
	#level

	constructor(options) {
		const { level } = options
		switch (level) {
			case "warn":
				this.#level = 1
				break
			case "info":
				this.#level = 2
				break
			case "debug":
				this.#level = 5
				break
			default:
				break
		}
	}

	error = function(...msgs) {
		if (this.#level >= 1) {
			console.error(...msgs)
		}
	}

	warn = function(...msgs) {
		if (this.#level >= 1) {
			console.warn(...msgs)
		}
	}

	info = function(...msgs) {
		if (this.#level >= 2) {
			console.info(...msgs)
		}
	}

	debug = function(...msgs) {
		if (this.#level >= 5) {
			console.debug(...msgs)
		}
	}
}
