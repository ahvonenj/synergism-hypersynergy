export class HSLogger {
	static log(msg: string, context: string = "HS") {
		console.log(`[${context}]: ${msg}`);
	}

	static warn(msg: string, context: string = "HS") {
		console.warn(`[${context}]: ${msg}`);
	}

	static error(msg: string, context: string = "HS") {
		console.error(`[${context}]: ${msg}`);
	}
}