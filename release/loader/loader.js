javascript:(function(){
	const scriptSrc = `https://cdn.jsdelivr.net/gh/ahvonenj/synergism-hypersynergy@main/release/mod/hypersynergism_release.js?r=${Math.floor(Math.random() * 1000000)}`;
	const script = document.createElement('script');
	script.src = scriptSrc;

	script.onload = function() {
		console.log('[HSMain] Script loaded successfully!');
		window.hypersynergism.init();
	};

	script.onerror = function() {
		console.error('[HSMain] Failed to load the mod!');
	};

	document.head.appendChild(script);
})();