javascript:(function(){
	const scriptSrc = 'http://127.0.0.1:8080/hypersynergism.js';
	const script = document.createElement('script');
	script.src = scriptSrc;

	script.onload = function() {
		console.log('[HS] Script loaded successfully!');
		window.hypersynergism.init();
	};

	script.onerror = function() {
		console.error('[HS] Failed to load the mod!');
	};

	document.head.appendChild(script);
})();