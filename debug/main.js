var printer = null;

var EVENTS = {
    DEVICE_CONNECTED: 'archipelia:device_connected',
    DEVICE_INFO_OBTAINED: 'archipelia:device_info_obtained',
    DEVICE_DISCONNECTED: 'archipelia:device_disconnected',
    INTERFACE_CLAIMED: 'archipelia:interface_claimed',
    INTERFACE_RELEASED: 'archipelia:interface_released',
    ENDPOINT_SELECTED: 'archipelia:endpoint_selected'
};

/**
 * Récupération du périphérique depuis localStorage
 */
chrome.storage.local.get('selectedDevice', function(items) {
    if (checkRuntimeError() !== true) return;
    
    if (items.hasOwnProperty('selectedDevice') !== true) {
        console.log('No device in localStorage')
        return;
    }
    
    console.log('Device restored', items.selectedDevice);
    openPrinterConnection(items.selectedDevice);
});

/*
 * Cheminement du script :
 * 1) showSelectDeviceWindow (usb.getUserSelectedDevices)
 * ou récupération depuis localStorage
 * 2) openPrinterConnection (usb.openDevice)
 * 3) getPrinterInfo (usb.getConfiguration)
 * 4) claimInterface (usb.claimInterface)
 * 5) findEndpoint (out)
 * 6) envoyer les commandes à l'imprimante
 */

/**
 * Lorsque l'on est connecté à un périphérique, récupère les infos de celui-ci
 */
bindEvent(EVENTS.DEVICE_CONNECTED, function() {
    getPrinterInfo();
});

/**
 * Lorsque l'on a les infos d'un périhpérique, on prend la main dessus
 */
bindEvent(EVENTS.DEVICE_INFO_OBTAINED, function() {
    // Ne pas continuer si aucune interface
    if (printer.getInterfaces().length < 1) return;

    // Tente de prendre le contrôle de la première interface
    claimInterface( printer.getInterfaceAt(0) );
});

/**
 * Après avoir prit la main, on sélectionne le point de sortie (out)
 * @event EVENTS.ENDPOINT_SELECTED
 */
bindEvent(EVENTS.INTERFACE_CLAIMED, function() {
    // Trouve l'endpoint en direction OUT
    var endpointOut = findEndpoint(ENDPOINT_DIRECTION_OUT);
    if (endpointOut !== null) {
        printer.setCurrentEndpoint(endpointOut);
        triggerEvent(EVENTS.ENDPOINT_SELECTED, [ endpointOut.getAddress() ]);

        console.log('Current endpoint', endpointOut);
    }
});

/**
 * Affiche la fenêtre de sélection du périphérique.
 */
function showSelectDeviceWindow() {
    var params = {
        multiple: false
    };

    chrome.usb.getUserSelectedDevices(params, function (selectedDeviceList) {
        resetWarningMessage();
        
        // Aucun périphérique sélectionné
        if (selectedDeviceList.length < 1) return;

        var selectedDevice = selectedDeviceList[0];
        console.log('Selected device', selectedDevice);
        
        chrome.storage.local.set({'selectedDevice': selectedDevice}, function() {
            if (checkRuntimeError() !== true) return;
            
            console.log('Device stored');
            openPrinterConnection(selectedDevice);
        });
    });
}

/**
 * Ouvre une connection avec un périphérique donné
 * @param {Object} device
 * @event EVENTS.DEVICE_CONNECTED
 */
function openPrinterConnection(device) {
    chrome.usb.openDevice(device, function (connection) {
        if (checkRuntimeError() !== true) return;

        printer = new EpsonTMH6000IV(device.vendorId, device.productId, device.device);
        printer.setConnection(connection);
        
        triggerEvent(EVENTS.DEVICE_CONNECTED);
    });
}

/**
 * Récupère les informations du périphérique sélectionné (metadata, interfaces, endpoints)
 * @event EVENTS.DEVICE_INFO_OBTAINED
 */
function getPrinterInfo() {
    chrome.usb.getConfiguration(printer.getConnection(), function(config) {
        if (checkRuntimeError() !== true) return;
        console.log('Device config', config);

        var interfaceList = [];
        var usbInterface = null;
        var endpointList = [];
        var endpointObj = null;

        config.interfaces.forEach(function(interface) {
            // Nouvelle instance de l'objet UsbInterface
            usbInterface = new UsbInterface(interface.interfaceNumber);
            usbInterface.setAlternateSetting(interface.alternateSetting);
            usbInterface.setClass(interface.interfaceClass);
            usbInterface.setSubclass(interface.interfaceSubclass);
            usbInterface.setProtocol(interface.interfaceProtocol);

            interfaceList.push(usbInterface);
            
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
        printer.setInterfaces(interfaceList);

        triggerEvent(EVENTS.DEVICE_INFO_OBTAINED);
    });
}

/**
 * Prend le contrôle de l'interface donnée
 * Si une interface était sous contrôle, elle est relâchée
 * @param  {UsbInterface} interfaceObj
 * @event EVENTS.INTERFACE_CLAIMED
 */
function claimInterface(interfaceObj) {
    releaseCurrentInterface();

    chrome.usb.claimInterface(printer.getConnection(), interfaceObj.getId(), function() {
        if (checkRuntimeError() !== true) return;
        console.log('USB interface claimed', interfaceObj);

        printer.setCurrentInterface(interfaceObj);
        triggerEvent(EVENTS.INTERFACE_CLAIMED, [ interfaceObj.getId() ]);
    });
}

/**
 * Relâche le contrôle de l'interface actuellement utilisée
 * @event EVENTS.INTERFACE_RELEASED
 */
function releaseCurrentInterface() {
    var interfaceObj = printer.getCurrentInterface();

    if (interfaceObj == undefined) return;

    chrome.usb.releaseInterface(printer.getConnection(), interfaceObj.getId(), function() {
        if (checkRuntimeError() !== true) return;
        
        printer.setCurrentInterfaceIndex(null);
        triggerEvent(EVENTS.INTERFACE_RELEASED, [ interfaceObj.getId() ]);
    });
}

/**
 * Retourne, parmis les endpoints de l'interface courante,
 * le premier endpoint qui correspond à la direction donnnée
 * @param  {String} direction
 * @return {Endpoint}
 */
function findEndpoint(direction) {
    var interfaceObj = printer.getCurrentInterface();
    var matchedEndpoint = null;

    if (interfaceObj == undefined) {
        console.error('Cannot find endpoint, no interface claimed');
        return;
    }

    interfaceObj.getEndpoints().forEach(function(endpoint) {
        if (endpoint.getDirection() === direction) {
            matchedEndpoint = endpoint;
            return;
        }
    });

    return matchedEndpoint;
}

/**
 * Envoie les données à l'imprimante
 * @param {ArrayBuffer} data
 */
function sendCommandToPrinter(data) {
    var currentEndpoint = printer.getCurrentEndpoint();
    var transferInfo = {
        "direction": currentEndpoint.getDirection(),
        "endpoint": currentEndpoint.getAddress(),
        "data": data
    };
    
    chrome.usb.bulkTransfer(printer.getConnection(), transferInfo, function (transferResult) {
        console.log('Send data', transferResult);
    });
}

/**
 * Ferme la connexion avec le périphérique et
 * supprime les données du localStorage
 * @event EVENTS.DEVICE_DISCONNECTED
 */
function disconnectPrinter() {
    // Ferme la connexion avec le périphérique
    chrome.usb.closeDevice(printer.getConnection(), function() {
        // Retire les infos du périphérique en localStorage
        chrome.storage.local.remove('selectedDevice', function() {
            if (checkRuntimeError() !== true) return;
            
            triggerEvent(EVENTS.DEVICE_DISCONNECTED);
        });
    });
}