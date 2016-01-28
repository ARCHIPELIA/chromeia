/* global chrome, Printer, EventEmitter */

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
    
};
App.prototype = Object.create(EventEmitter.prototype);
App.prototype.constructor = EventEmitter;

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
 * @type Object
 */
App.prototype.api = null;

/**
 * Liste des commandes émises ou reçues par l'application
 * @type Object
 */
App.prototype.COMMANDS = {
    IN: {
        DISCONNECT_USB_DEVICE: 'disconnect-usb-device',
        LIST_CONNECTED_USB_DEVICES: 'list-connected-usb-devices',
        OPEN_USB_DEVICE: 'open-usb-device',
        PRINT: 'print'
    },
    OUT: {
        CHROME_RUNTIME_ERROR: 'chrome-runtime-error',
        LIST_CONNECTED_USB_DEVICES: 'connected-usb-device-list',
        PRINTER_CONNECTION_OPENED: 'printer-connection-opened',
        PRINTER_CONNECTION_CLOSED: 'printer-connection-closed'
    }
};

/**
 * Vérifie l'existence d'une erreur de l'API Chrome.
 * @return {Boolean} TRUE en cas d'erreur, FALSE sinon
 */
App.prototype.hasChromeRuntimeError = function ()
{
    if (chrome.runtime.lastError) {
        this.sendChromeMessage(this.COMMANDS.OUT.CHROME_RUNTIME_ERROR, {
            errorMessage: chrome.runtime.lastError.message
        });
        console.error(chrome.runtime.lastError);
        return true;
    }
    return false;
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
        console.log('App::onConnection');
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
 * Retourne un listener pour la réception d'un message
 * en provenance de la page Web
 * @returns {Function}
 */
App.prototype.createOnChromeMessageListener = function()
{
    var app = this;
    /** @param {Object} message */
    return function(message) {
        console.log('App::onMessage', message);

        if (typeof message !== 'object'
            || !message.hasOwnProperty('command')
        ) {
            console.error('App::onMessage - Bad message format', message);
            return;
        }
        
        // Lister les périphériques USB connectés
        if (message.command === app.COMMANDS.IN.LIST_CONNECTED_USB_DEVICES) {
            app.sendConnectedUsbDeviceList();
        }
        // Ouvrir une connexion avec un périphérique USB
        else if (message.command === app.COMMANDS.IN.OPEN_USB_DEVICE
            && message.hasOwnProperty('device')
            && message.hasOwnProperty('printerName')
        ) {
            app.api.openPrinterConnection(
                message.device,
                message.printerName
            );
        }
        // Lancer une impression test
        else if (message.command === app.COMMANDS.IN.PRINT
            && message.hasOwnProperty('template')
        ) {
            app.api.sendCommandToPrinter(message.template);
        }
        // Déconnexion de l'imprimante
        else if (message.command === app.COMMANDS.IN.DISCONNECT_USB_DEVICE) {
            app.api.disconnectPrinter();
        }
        else {
            console.error('App::onMessage - Unknown command', message.command);
        }
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
        console.log('App::onDeviceConnected - Printer connected', printer);
        app.sendChromeMessage(app.COMMANDS.OUT.PRINTER_CONNECTION_OPENED);
    };
};

/**
 * [Listener] Déconnexion de l'imprimante
 * @returns {Function}
 */
App.prototype.createOnDeviceDisconnectedListener = function()
{
    var app = this;
    /** @param {Printer} printer */
    return function(printer) {
        console.log('App::onDeviceDisconnected - Printer disconnected', printer);
        app.sendChromeMessage(app.COMMANDS.OUT.PRINTER_CONNECTION_CLOSED);
    };
};

/**
 * [Listener] Erreur de l'API Chrome
 * @returns {Function}
 */
App.prototype.createOnChromeRuntimeErrorListener = function()
{
    var app = this;
    /** @param {String} errorMessage */
    return function(errorMessage) {
        app.sendChromeMessage(app.COMMANDS.OUT.CHROME_RUNTIME_ERROR, {
            errorMessage: errorMessage
        });
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
        console.log('App::onDisconnect');
        app.connection = null;
        
        app.api.disconnectPrinter();
    };
};

/**
 * Envoie un message à la page Web via l'API Chrome
 * @param {String} command
 * @param {Object} parameters
 */
App.prototype.sendChromeMessage = function(command, parameters)
{
    if (! this.connection) return;
    
    var messageData = (parameters instanceof Object === true)
        ? parameters
        : {}
    ;
    messageData.command = command;
    
    console.log('App:sendChromeMessage', messageData);
    
    this.connection.postMessage(messageData);
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

        app.sendChromeMessage(app.COMMANDS.OUT.LIST_CONNECTED_USB_DEVICES, {
            devices: deviceList
        });
    });
};