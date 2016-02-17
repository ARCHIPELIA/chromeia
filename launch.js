var app = new App();

// Au lancement de l'application
chrome.app.runtime.onLaunched.addListener(function () {
    // Affichage d'une fenêtre
    chrome.app.window.create('debug/index.html', {
        // Dimensions de la fenêtre
        innerBounds: {
            width: 700,
            height: 500,
            minWidth: 600,
            minHeight: 300
        }
    },
    function (createdWindow) {
        createdWindow.contentWindow.app = app;

        app.api.disconnectPrinter();
    });
});
