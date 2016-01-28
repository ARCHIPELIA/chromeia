/* global chrome, Printer, EventEmitter */

/**
 * Message renvoyé au navigateur par l'application
 * @param {String} command
 * @param {Object} params
 * @param {boolean} success
 * @param {Error} error
 * @returns {appMessage}
 */
var AppMessage = function(command, params, success, error)
{
    if (params instanceof Object){
        for (var attr in params)
            this[attr] = params[attr];
    }

    this.command  =  command !== undefined ? command : null;
    this.success  =  success !== undefined ? success : true;

    if (error !== undefined){
        this.error    =  error instanceof Error ? error.message : error;
    } else {
        this.error = null;
    }
}

/**
 * Set ID du message
 * @param {int} id du message
 */
AppMessage.prototype.setId = function (id){
    this.id = id;
}

/**
 * Initialise l'objet représentant le coeur de l'application
 */
var App = function()
{
    // Initialise la classe parente EventEmitter en premier lieu
    EventEmitter.apply(this);

    // Récupère la liste des périphériques USB depuis le manifest de l'app
    this.deviceInfoList = chrome.runtime.getManifest().permissions[1].usbDevices;
    console.log('App::deviceInfoList', this.deviceInfoList);

    // Instancie l'API
    this.api = new Api();

    this.currentMsgId = null;

    // Attache un listener pour la connexion avec la page Web
    chrome.runtime.onConnectExternal.addListener(
        this.createOnChromeConnectionListener()
    );

    // Erreur dans l'API Chrome
    this.api.addListener(this.api.EVENTS.RUNTIME_ERROR,
        this.createOnChromeRuntimeErrorListener()
    );

    // Connexion du périphérique
    this.api.addListener(this.api.EVENTS.DEVICE_CONNECTED,
        this.createOnDeviceConnectedListener()
    );

    // Déconnexion du périphérique
    this.api.addListener(this.api.EVENTS.DEVICE_DISCONNECTED,
        this.createOnDeviceDisconnectedListener()
    );

    // Impression
    this.api.addListener(this.api.EVENTS.PRINT,
        this.createOnPrintListener()
    );

    // Ouverture tiroir
    this.api.addListener(this.api.EVENTS.OPEN_DRAWER,
        this.createOnOpenDrawerListener()
    );

};

App.prototype = Object.create(EventEmitter.prototype);
App.prototype.constructor = EventEmitter;

/**
 * Liste des commandes émises ou reçues par l'application
 * @type Object
 */
App.prototype.COMMANDS = {
    CONNECTED: 'is-connected',
    OPEN_USB_DEVICE: 'open-usb-device',
    CLOSE_USB_DEVICE: 'close-usb-device',
    POPUP_USB_DEVICES: 'popup-usb-devices',
    LIST_USB_DEVICES: 'list-usb-devices',
    PRINT: 'print',
    OPEN_DRAWER: 'open-drawer',
    CHROME_RUNTIME_ERROR: 'chrome-runtime-error'
};

/**
 * Objet représentant la connexion avec la page Web de la caisse
 * @type Object
 */
App.prototype.connection = null;

/**
 * Liste des infos des périphériques USB compatibles
 * @type Array
 */
App.prototype.deviceInfoList = [];

/**
 * Objet représentant l'API permettant d'utiliser l'imprimante
 * @type Api
 */
App.prototype.api = null;

/**
 * Vérifie l'existence d'une erreur de l'API Chrome.
 * @return {Boolean} TRUE en cas d'erreur, FALSE sinon
 */
App.prototype.hasChromeRuntimeError = function ()
{
    if (chrome.runtime.lastError) {
        console.error('App::chromeRuntimeError', chrome.runtime.lastError);

        this.sendChromeMessage(new AppMessage(this.COMMANDS.CHROME_RUNTIME_ERROR, {}, false, chrome.runtime.lastError.message));

        return true;
    }

    return false;
};

/**
 * Envoie un message à la page Web via l'API Chrome
 * @param {AppMessage} appMessage
 */
App.prototype.sendChromeMessage = function(appMessage)
{
    if (!this.connection)
        throw 'Aucune connexion active avec le navigateur !';

    if (this.currentMsgId != null)
        appMessage.setId(this.currentMsgId);

    console.log('App:sendChromeMessage', appMessage);

    this.connection.postMessage(appMessage);
};

/**
 * Retourne un listener pour la connexion avec la page Web
 * @returns {Function}
 */
App.prototype.createOnChromeConnectionListener = function()
{
    var app = this;

    /** @param {Object} connection */
    return function(connection) {
        console.debug('App::onConnection');

        app.connection = connection;

        // Attache un listener pour la réception d'un message
        app.connection.onMessage.addListener(
            app.createOnChromeMessageListener()
        );

        // Attache un listener pour la perte de la connexion
        app.connection.onDisconnect.addListener(
            app.createOnChromeDisconnectListener()
        );
    };
};

/**
 * Listener pour la perte de connexion avec la page Web.
 * Déconnecte le périphérique USB
 * @returns {Function}
 */
App.prototype.createOnChromeDisconnectListener = function()
{
    var app = this;

    return function() {
        console.debug('App::onDisconnect');

        app.connection = null;

        app.api.disconnectPrinter();
    };
};

/**
 * Retourne un listener pour la réception d'un message
 * en provenance de la page Web
 * @returns {Function}
 */
App.prototype.createOnChromeMessageListener = function()
{
    var app = this;

    /** @param {Object} message */
    return function(message) {
        console.debug('App::onChromeMessage', message);

        // Exécution de la command
        try {
            if (typeof message !== 'object')
                message = {};

            // ID du message courant
            app.currentMsgId = message.hasOwnProperty('id') ? message.id : null;

            if (!message.hasOwnProperty('command')){
                message.command = app.COMMANDS.CHROME_RUNTIME_ERROR;

                throw 'Format du message non valide !';
            }

            switch (message.command){

                // Application installée
                case app.COMMANDS.CONNECTED:
                  app.sendChromeMessage(new AppMessage(app.COMMANDS.CONNECTED));
                  break;

                // Lister les périphériques USB connectés
                case app.COMMANDS.LIST_USB_DEVICES:
                    app.sendConnectedUsbDeviceList();
                    break;

                // Ouvrir une popup de sélection du périphérique USB
                case app.COMMANDS.POPUP_USB_DEVICES:
                    app.selectUsbDevice();
                    break;

                // Ouvrir une connexion avec un périphérique USB
                case app.COMMANDS.OPEN_USB_DEVICE:
                    if (!(message.hasOwnProperty('device') && message.hasOwnProperty('printerType')))
                        throw 'Les paramètres "device" et "printerType" sont requis';

                    app.api.openPrinterConnection(message.device, message.printerType);
                    break;

                // Lancer une impression
                case app.COMMANDS.PRINT:
                    if (!(message.hasOwnProperty('template')))
                        throw 'Le paramètre "template" est requis';

                    app.api.print(message.template, message.tray);
                    break;

                // Ouverture du tiroir
                case app.COMMANDS.OPEN_DRAWER:
                    app.api.openDrawer();
                    break;

                // Déconnexion de l'imprimante
                case app.COMMANDS.CLOSE_USB_DEVICE:
                    app.api.disconnectPrinter();
                    break;

                default:
                    throw 'Commande inconnue : '+ message.command;
                    break;
            }
        } catch (ex){
            console.error(message.command, ex);

            app.sendChromeMessage(new AppMessage(message.command, {message: message}, false, ex));

            //throw ex;
        }
    };
};

/**
 * [Listener] Erreur de l'API Chrome
 * @returns {Function}
 */
App.prototype.createOnChromeRuntimeErrorListener = function()
{
    var app = this;

    /** @param {String} error */
    return function(error) {
        console.debug('App::onChromeRuntimeError');

        console.error(error);

        app.sendChromeMessage(new AppMessage(app.COMMANDS.CHROME_RUNTIME_ERROR, {}, false, error));
    };
};

/**
 * [Listener] Connexion à l'imprimante
 * @returns {Function}
 */
App.prototype.createOnDeviceConnectedListener = function()
{
    var app = this;

    /** @param {Printer} printer */
    return function(printer) {
        console.debug('App::onDeviceConnected - Imprimante connectée', printer);

        var interface, endpoint
        var success = false;
        var error = null;

        if ((interface = this.getPrinter().getCurrentInterface()) != null){
            if ((endpoint = this.getPrinter().getCurrentEndpoint()) != null){
                success = true;
            } else {
                error = 'Aucun point d\'accès avec le périphérique détecté !';
            }
        } else {
            error = 'Aucune interface détecté !';
        }

        app.sendChromeMessage(new AppMessage(app.COMMANDS.OPEN_USB_DEVICE,
            {
                interface: interface,
                endpoint: endpoint
            }, success, error));
    };
};

/**
 * [Listener] Déconnexion de l'imprimante
 * @returns {Function}
 */
App.prototype.createOnDeviceDisconnectedListener = function()
{
    var app = this;

    return function() {
        console.debug('App::onDeviceDisconnected - Imprimante déconnectée');

        if (app.connection)
            app.sendChromeMessage(new AppMessage(app.COMMANDS.CLOSE_USB_DEVICE));
    };
};

/**
 * [Listener] Impression
 * @returns {Function}
 */
App.prototype.createOnPrintListener = function()
{
    var app = this;

    return function() {
        console.debug('App::onPrint');

        app.sendChromeMessage(new AppMessage(app.COMMANDS.PRINT));
    };
};

/**
 * [Listener] Ouverture tiroir
 * @returns {Function}
 */
App.prototype.createOnOpenDrawerListener = function()
{
    var app = this;

    return function() {
        console.debug('App::onOpenDrawer');

        app.sendChromeMessage(new AppMessage(app.COMMANDS.OPEN_DRAWER));
    };
};

/**
 * Envoie à la page Web la liste des périphériques connectés accessibles
 */
App.prototype.sendConnectedUsbDeviceList = function()
{
    var app = this;

    var deviceFilter = {
        filters: this.deviceInfoList
    };

    chrome.usb.getDevices(deviceFilter, function(deviceList) {
        if (app.hasChromeRuntimeError()) return;

        app.sendChromeMessage(new AppMessage(app.COMMANDS.LIST_USB_DEVICES, {devices: deviceList}));
    });
};

/**
 * Affichage une popup de sélection de l'imprimante parmi les périphérique USB accessibles
 * ou parmi tous les périphériques USB de la machine
 */
App.prototype.selectUsbDevice = function()
{
    var app = this;

    console.log('App:selectUsbDevice');

    // Affichage du dialog de sélection du périphérique
    chrome.app.window.create(
        'dialog/printer.html',
        {
            id: 'printerDialog',
            alwaysOnTop: true,
            innerBounds: {width: 560, height: 380, minWidth: 560, minHeight: 380}
        },
        function (dialog) {
            dialog.contentWindow.dialog = dialog;
            dialog.contentWindow.app = app;
            dialog.contentWindow.device = null;

            dialog.onClosed.addListener(function (){
                var reponse = null;

                if (dialog.contentWindow.validation){
                    reponse = {
                        device: dialog.contentWindow.curDevice,
                        printerType: dialog.contentWindow.curPrinterType
                    }
                }

                // Envoi du périphérique sélectionné
                app.sendChromeMessage(new AppMessage(app.COMMANDS.POPUP_USB_DEVICES, reponse));
            });
        }
    );
}
