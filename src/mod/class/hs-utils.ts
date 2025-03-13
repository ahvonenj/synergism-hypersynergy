export class HSUtils {
	static wait(delay: number) {
		return new Promise(function(resolve) {
			setTimeout(resolve, delay);
		});
	}
}