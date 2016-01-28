var app = new App();

// Au lancement de l'application
chrome.app.runtime.onLaunched.addListener(function () {
    // Affichage d'une fenêtre
    chrome.app.window.create('debug/index.html', {
        // Dimensions de la fenêtre
        innerBounds: {
            width: 600,
            height: 300,
            minWidth: 600,
            minHeight: 300
        }
    });
});

chrome.runtime.onSuspend.addListener(function() {
    app.api.disconnectPrinter();
});