export class HSLogger {
	static log(msg: string, context: string = "HSMain") {
		console.log(`[${context}]: ${msg}`);
	}

	static warn(msg: string, context: string = "HSMain") {
		console.warn(`[${context}]: ${msg}`);
	}

	static error(msg: string, context: string = "HSMain") {
		console.error(`[${context}]: ${msg}`);
	}
}