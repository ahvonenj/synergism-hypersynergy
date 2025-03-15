// Utils cöass
export class HSUtils {

	// Simple promise-based wait/delay utility method
	static wait(delay: number) {
		return new Promise(function(resolve) {
			setTimeout(resolve, delay);
		});
	}
}