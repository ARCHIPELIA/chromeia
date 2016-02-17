/* global chrome, Printer, EventEmitter, ENDPOINT_DIRECTION_IN, ENDPOINT_DIRECTION_OUT */

/**
 * API de communication avec l'imprimante
 * @returns {Api}
 */
var Api = function()
{
    // Initialise la classe parente EventEmitter en premier lieu
    EventEmitter.apply(this);

    // Évènement lancé lorsque que la connexion à un périphérique est établie
    this.addListener(this.EVENTS.INTERNAL.DEVICE_CONNECTED,
        this.onUsbDeviceConnectedListener
    );

    // Lorsque l'on a les infos d'un périhpérique, on prend la main dessus
    this.addListener(this.EVENTS.INTERNAL.DEVICE_INFO_OBTAINED,
        this.onUsbDeviceInfoObtainedListener
    );

    // Après avoir prit la main, on sélectionne le point de sortie (out)
    this.addListener(this.EVENTS.INTERNAL.INTERFACE_CLAIMED,
        this.onUsbInterfaceClaimedListener
    );
};

Api.prototype = Object.create(EventEmitter.prototype);
Api.prototype.constructor = EventEmitter;

/**
 * Instance de l'objet représentant l'imprimante
 * @type Printer
 */
Api.prototype.printer = null;

/**
 * Liste des événements émis par la classe Api
 * @type Object
 */
Api.prototype.EVENTS = {
    RUNTIME_ERROR: 'chrome:api:runtime:error',
    DEVICE_CONNECTED: 'chrome:api:device:connected',
    DEVICE_DISCONNECTED: 'chrome:api:device:disconnected',
    PRINT: 'chrome:api:device:print',
    OPEN_DRAWER: 'chrome:api:device:open-drawer',
    INTERNAL: {
        DEVICE_CONNECTED: 'chrome:api:internal:device:connected',
        DEVICE_DISCONNECTED: 'chrome:api:internal:device:disconnected',
        DEVICE_INFO_OBTAINED: 'chrome:api:internal:device:info-obtained',
        INTERFACE_CLAIMED: 'chrome:api:internal:interface:claimed',
        INTERFACE_RELEASED: 'chrome:api:internal:interface:released',
        ENDPOINT_SELECTED: 'chrome:api:internal:endpoint:selected'
    }
};

/**
 * Vérifie l'existence d'une erreur de l'API Chrome.
 * @event EVENTS.RUNTIME_ERROR
 * @return {Boolean} TRUE en cas d'erreur, FALSE sinon
 */
Api.prototype.hasChromeRuntimeError = function ()
{
    if (chrome.runtime.lastError) {
        console.error('Api::chromeRuntimeError', chrome.runtime.lastError.message);

        this.emitEvent(this.EVENTS.RUNTIME_ERROR, [
            chrome.runtime.lastError.message
        ]);

        return true;
    }
    return false;
};

/**
 * Récupérer l'instance de l'imprimante connectée
 * @returns {Printer}
 */
Api.prototype.getPrinter = function()
{
    if (!this.printer)
        throw 'Aucune imprimante connecté !';

    return this.printer;
};

/**
 * [Listener] Connexion à un périphérique USB.
 * Récupère les infos du périphérique
 */
Api.prototype.onUsbDeviceConnectedListener = function()
{
    this.getPrinterInfo();
};

/**
 * [Listener] Récupération des infos d'un périphérique USB.
 * Prend le contrôle sur la première interface USB du périphérique
 */
Api.prototype.onUsbDeviceInfoObtainedListener = function()
{
    // Ne pas continuer si aucune interface
    if (this.getPrinter().getInterfaces().length < 1) return;

    // Tente de prendre le contrôle de la première interface
    this.claimInterface( this.getPrinter().getInterfaceAt(0) );
};

/**
 * [Listener] Prise de contrôle d'une interface USB.
 * Sélectionne un point de sortie pour la communication avec le périphérique
 * @event EVENTS.INTERNAL.ENDPOINT_SELECTED
 */
Api.prototype.onUsbInterfaceClaimedListener = function()
{
    // Trouve l'endpoint en direction OUT
    var endpointOut = this.getPrinter().findEndpoint(ENDPOINT_DIRECTION_OUT);

    if (endpointOut !== null) {
        this.getPrinter().setCurrentEndpoint(endpointOut);

        console.log('Current endpoint', endpointOut);

        this.emitEvent(this.EVENTS.INTERNAL.ENDPOINT_SELECTED, [
            endpointOut.getAddress()
        ]);
    }

    this.emitEvent(this.EVENTS.DEVICE_CONNECTED, [
        this.printer
    ]);
};


/**
 * Ouvre une connexion avec le périphérique USB
 * et instancie l'objet de l'imprimante
 * @param {Object} device
 * @param {String} printerType
 * @event EVENTS.INTERNAL.DEVICE_CONNECTED
 * @event EVENTS.DEVICE_CONNECTED
 */
Api.prototype.openPrinterConnection = function(device, printerType)
{
    var api = this;

    function openDevice(){
        chrome.usb.openDevice(device, function (connection) {
            if (api.hasChromeRuntimeError()) return;

            console.debug('Api::openPrinterConnection - Connexion ouverte', device, connection);

            // Créer l'objet représentant l'imprimante en fonction du modèle
            api.printer = Printer.getPrinter(device, printerType);

            api.printer.setConnection(connection);

            api.emitEvent(api.EVENTS.INTERNAL.DEVICE_CONNECTED, [
                api.printer
            ]);
        });
    };

    if (this.printer != null){
        // Ferme la connexion déjà ouverte avec le périphérique
        chrome.usb.closeDevice(this.getPrinter().getConnection(), function() {
            if (api.hasChromeRuntimeError()) return;

            api.printer = null;

            openDevice();
        });
    } else {
        openDevice();
    }
};



/**
 * Récupère les informations USB de l'imprimante connectée
 * (metadata, interfaces, endpoints)
 * @event EVENTS.INTERNAL.DEVICE_INFO_OBTAINED
 * @event EVENTS.DEVICE_CONNECTED
 */
Api.prototype.getPrinterInfo = function()
{
    var api = this;

    chrome.usb.getConfiguration(this.getPrinter().getConnection(), function(config) {
        if (api.hasChromeRuntimeError()) return;

        console.log('Device config', config);

        var interfaceList = [];
        var usbInterface = null;
        var endpointList = [];
        var endpointObj = null;

        // Liste les interfaces du périphérique USB
        config.interfaces.forEach(function(interface) {
            // Nouvelle instance de l'objet UsbInterface
            usbInterface = new UsbInterface(interface.interfaceNumber);
            usbInterface.setAlternateSetting(interface.alternateSetting);
            usbInterface.setClass(interface.interfaceClass);
            usbInterface.setSubclass(interface.interfaceSubclass);
            usbInterface.setProtocol(interface.interfaceProtocol);

            interfaceList.push(usbInterface);

            // Liste les points d'entrée/sortie
            interface.endpoints.forEach(function(endpoint) {
                endpointObj = new Endpoint(endpoint.address);
                endpointObj.setType(endpoint.type);
                endpointObj.setDirection(endpoint.direction);
                endpointObj.setMaximumPacketSize(endpoint.maximumPacketSize);

                endpointList.push(endpointObj);
            });

            usbInterface.setEndpoints(endpointList);
        });

        // Ajoute les interfaces à l'objet Printer
        api.getPrinter().setInterfaces(interfaceList);

        api.emitEvent(api.EVENTS.INTERNAL.DEVICE_INFO_OBTAINED);
    });
};

/**
 * Prend le contrôle de l'interface donnée
 * Si une interface était sous contrôle, elle est relâchée
 * @param {UsbInterface} interfaceObj
 * @event EVENTS.INTERNAL.INTERFACE_CLAIMED
 */
Api.prototype.claimInterface = function(interfaceObj)
{
    var api = this;

    this.releaseCurrentInterface();

    chrome.usb.claimInterface(this.getPrinter().getConnection(), interfaceObj.getId(), function() {
        if (api.hasChromeRuntimeError()) return;

        console.log('USB interface claimed', interfaceObj);

        api.getPrinter().setCurrentInterface(interfaceObj);

        api.emitEvent(api.EVENTS.INTERNAL.INTERFACE_CLAIMED, [
            interfaceObj.getId()
        ]);
    });
};

/**
 * Relâche le contrôle de l'interface actuellement utilisée
 * @event EVENTS.INTERNAL.INTERFACE_RELEASED
 */
Api.prototype.releaseCurrentInterface = function()
{
    var api = this;
    var interfaceObj = this.getPrinter().getCurrentInterface();

    if (!interfaceObj) return;

    chrome.usb.releaseInterface(this.getPrinter().getConnection(), interfaceObj.getId(), function() {
        if (api.hasChromeRuntimeError()) return;

        api.getPrinter().setCurrentInterfaceIndex(null);
        api.emitEvent(api.EVENTS.INTERNAL.INTERFACE_RELEASED, [
            interfaceObj
        ]);
    });
};

/**
 * Ferme la connexion avec le périphérique et
 * supprime les données du localStorage
 * @event EVENTS.DEVICE_DISCONNECTED
 */
Api.prototype.disconnectPrinter = function()
{
    var api = this;

    if (this.printer == null){
        api.emitEvent(api.EVENTS.DEVICE_DISCONNECTED);
        return;
    }

    // Ferme la connexion avec le périphérique
    chrome.usb.closeDevice(this.getPrinter().getConnection(), function() {
        api.printer = null;

        api.emitEvent(api.EVENTS.INTERNAL.DEVICE_DISCONNECTED);
        api.emitEvent(api.EVENTS.DEVICE_DISCONNECTED);
    });
};

/**
 * Envoie les données à l'imprimante
 * @param {String} template Le template à parser et imprimer
 * @param {String} tray Le bac d'impression
 */
Api.prototype.print = function(template, tray)
{
    var api = this;

    this.sendCommand(
            this.getPrinter().parsePrint(template, tray),
            function (){
                api.emitEvent(api.EVENTS.PRINT);
            }
    );
};

/**
 * Ouverture du tiroir caisse
 */
Api.prototype.openDrawer = function()
{
    var api = this;

    this.sendCommand(
            this.getPrinter().parseCommand( this.getPrinter().language.drawerKickOut() ),
            function (){
                api.emitEvent(api.EVENTS.OPEN_DRAWER);
            }
    );
};

/**
 * Envoi de la commande à l'imprimante
 * @param {String} data
 * @param {Function} callback
 */
Api.prototype.sendCommand = function(data, callback)
{
    var currentEndpoint = this.getPrinter().getCurrentEndpoint();

    if (currentEndpoint == null)
        throw 'Erreur de communication avec l\'imprimante !';

    var transferInfo = {
        direction: currentEndpoint.getDirection(),
        endpoint: currentEndpoint.getAddress(),
        data: data
    };

    chrome.usb.bulkTransfer(this.getPrinter().getConnection(), transferInfo, function (transferResult) {
        console.log('bulkTransfer', transferResult);

        if (callback instanceof Function)
            callback();
    });
}