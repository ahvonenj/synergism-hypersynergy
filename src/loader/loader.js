javascript:(function() {
    if('hypersynergism' in window) {
        alert('Hypersynergism is already loaded on the page, please refresh if you want to reload the mod');
        return;
    };

    const scriptSrc = `http://127.0.0.1:8080/hypersynergism.js?r=${Math.floor(Math.random() * 1000000)}`;
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