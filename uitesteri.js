window.onmessage = function(original) { return function(e) {
    if (e.data.name == 'init') {
        var script = document.createElement('script');
        
        var type = document.createAttribute('type');
        type.value = 'text/javascript';
        script.setAttributeNode(type);

        var src = document.createAttribute('src');
        src.value = e.data.url;
        script.setAttributeNode(src);

        document.body.appendChild(script);
    }
    if (original) {
        original(e);
    }
};}(window.onmessage);

window.onload = function(original) { return function(e) {
    parent.postMessage({ name: 'load' }, '*');
    if (original) {
        original(e);
    }
};}(window.onload);