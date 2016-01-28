/* global chrome, Printer, EventEmitter, ENDPOINT_DIRECTION_IN, ENDPOINT_DIRECTION_OUT */

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
    if (this.printer.getInterfaces().length < 1) return;

    // Tente de prendre le contrôle de la première interface
    this.claimInterface( this.printer.getInterfaceAt(0) );
};

/**
 * [Listener] Prise de contrôle d'une interface USB.
 * Sélectionne un point de sortie pour la communication avec le périphérique
 * @event EVENTS.INTERNAL.ENDPOINT_SELECTED
 */
Api.prototype.onUsbInterfaceClaimedListener = function()
{
    // Trouve l'endpoint en direction OUT
    var endpointOut = this.printer.findEndpoint(ENDPOINT_DIRECTION_OUT);
    if (endpointOut !== null) {
        this.printer.setCurrentEndpoint(endpointOut);

        console.log('Current endpoint', endpointOut);
        
        this.emitEvent(this.EVENTS.INTERNAL.ENDPOINT_SELECTED, [
            endpointOut.getAddress()
        ]);
    }
};


/**
 * Ouvre une connexion avec le périphérique USB
 * et instancie l'objet de l'imprimante
 * @param {Object} device
 * @param {String} printerName
 * @event EVENTS.INTERNAL.DEVICE_CONNECTED
 * @event EVENTS.DEVICE_CONNECTED
 */
Api.prototype.openPrinterConnection = function(device, printerName)
{
    var api = this;
    
    chrome.usb.openDevice(device, function (connection) {
        if (api.hasChromeRuntimeError()) return;
        console.log('Api::openPrinterConnection - Connection opened', device, connection);

        // Créer l'objet représentant l'imprimante en fonction du modèle
        switch (printerName) {
            case "EPSON TM-H6000IV Receipt":
                api.printer = new EpsonTMH6000IV(device.vendorId, device.productId, device.device);
                break;
            case "EPSON TM-U950 Receipt":
                api.printer = new EpsonTMU950(device.vendorId, device.productId, device.device);
                break;
            case "EPSON TM-T20II Receipt":
                api.printer = new EpsonTMT20II(device.vendorId, device.productId, device.device);
                break;
            default:
                console.error('Instanciate generic printer');
                api.printer = new Printer(device.vendorId, device.productId, device.device);
                break;
        }

        if (! api.printer instanceof Printer) {
            console.error('Could not instanciate printer object');
            return;
        }

        api.printer.setConnection(connection);
        
        api.emitEvent(api.EVENTS.INTERNAL.DEVICE_CONNECTED, [
            api.printer
        ]);
        api.emitEvent(api.EVENTS.DEVICE_CONNECTED, [
            api.printer
        ]);
    });
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
    chrome.usb.getConfiguration(this.printer.getConnection(), function(config) {
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
        api.printer.setInterfaces(interfaceList);
        
        api.emitEvent(api.EVENTS.INTERNAL.DEVICE_INFO_OBTAINED);
        api.emitEvent(api.EVENTS.DEVICE_CONNECTED, [
            api.printer
        ]);
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

    chrome.usb.claimInterface(this.printer.getConnection(), interfaceObj.getId(), function() {
        if (api.hasChromeRuntimeError()) return;
        console.log('USB interface claimed', interfaceObj);

        api.printer.setCurrentInterface(interfaceObj);
        
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
    var interfaceObj = this.printer.getCurrentInterface();

    if (! interfaceObj) return;

    chrome.usb.releaseInterface(this.printer.getConnection(), interfaceObj.getId(), function() {
        if (api.hasChromeRuntimeError()) return;
        
        api.printer.setCurrentInterfaceIndex(null);
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
    if (! this.printer) return;
    var api = this;
    
    // Ferme la connexion avec le périphérique
    chrome.usb.closeDevice(this.printer.getConnection(), function() {
//        // Retire les infos du périphérique en localStorage
//        chrome.storage.local.remove('selectedDevice', function() {
//            if (app.hasChromeRuntimeError()) return;
//            
            api.emitEvent(api.EVENTS.INTERNAL.DEVICE_DISCONNECTED, [
                api.printer
            ]);
            api.emitEvent(api.EVENTS.DEVICE_DISCONNECTED, [
                api.printer
            ]);
            
            api.printer = null;
//        });
    });
};

/**
 * Envoie les données à l'imprimante
 * @param {String} template Le template à parser et imprimer
 */
Api.prototype.sendCommandToPrinter = function(template)
{
    var currentEndpoint = this.printer.getCurrentEndpoint();
    var transferInfo = {
        "direction": currentEndpoint.getDirection(),
        "endpoint": currentEndpoint.getAddress(),
        "data": this.printer.parseCommand(template)
    };
    
    chrome.usb.bulkTransfer(this.printer.getConnection(), transferInfo, function (transferResult) {
        console.log('bulkTransfer', transferResult);
    });
};