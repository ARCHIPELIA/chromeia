/**
 * @param {Integer} vendorId
 * @param {Integer} productId
 * @param {Integer} deviceId
 * @returns {Printer}
 */
function Printer (vendorId, productId, deviceId) {
    this.vendorId = vendorId;
    this.productId = productId;
    this.deviceId = deviceId;
    this.connection = null;
    this.interfaces = [];
    this.currentEndpoint = null;
    this.language = null;
    this.tray = 0x00;

    // Index de l'interface courrante dans la liste des interfaces
    this.currentInterfaceIndex = null;
    
    // Instancie l'implémentation du langage ESC/POS conforme au modèle de l'imprimante
    this.initLanguage();
}

/**
 * Instancie l'implémentation générique du langage ESC/POS
 */
Printer.prototype.initLanguage = function() {
    console.log('Printer::initLanguage');
    this.language = new EpsonLanguage();
};

/**
 * @returns {Integer}
 */
Printer.prototype.getVendorId = function() {
    return this.vendorId;
};

/**
 * @returns {String}
 */
Printer.prototype.getVendorIdHex = function() {
    return '0x' + ('0000' + this.getVendorId().toString(16)).slice(-4);
};

/**
 * @returns {Integer}
 */
Printer.prototype.getProductId = function() {
    return this.productId;
};

/**
 * @returns {String}
 */
Printer.prototype.getProductIdHex = function() {
    return '0x' + ('0000' + this.getProductId().toString(16)).slice(-4);
};

/**
 * @returns {Integer}
 */
Printer.prototype.getDeviceId = function() {
    return this.deviceId;
};

/**
 * @returns {Object}
 */
Printer.prototype.getConnection = function() {
    return this.connection;
};

/**
 * @returns {Array}
 */
Printer.prototype.getInterfaces = function() {
    return this.interfaces;
};

/**
 * @return {UsbInterface}
 */
Printer.prototype.getCurrentInterface = function() {
    return this.interfaces[this.currentInterfaceIndex];
};

/**
 * @param {Integer} index
 * @return {UsbInterface}
 */
Printer.prototype.getInterfaceAt = function(index) {
    return this.interfaces[index];
};

/**
 * @return {Endpoint}
 */
Printer.prototype.getCurrentEndpoint = function() {
    return this.currentEndpoint;
};

/**
 * @returns {String}
 */
Printer.prototype.getCurrentTray = function() {
    return this.tray;
};

/**
 * @param {Integer} vendorId
 */
Printer.prototype.setVendorId = function(vendorId) {
    this.vendorId = vendorId;
};

/**
 * @param {Integer} productId
 */
Printer.prototype.setProductId = function(productId) {
    this.productId = productId;
};

/**
 * @param {Integer} deviceId
 */
Printer.prototype.setDeviceId = function(deviceId) {
    this.deviceId = deviceId;
};

/**
 * @param {Object} connection
 */
Printer.prototype.setConnection = function(connection) {
    this.connection = connection;
};

/**
 * @param {Array} interfaceList
 */
Printer.prototype.setInterfaces = function(interfaceList) {
    this.interfaces = interfaceList;
};

/**
 * @param {Integer} index
 */
Printer.prototype.setCurrentInterfaceIndex = function(index) {
    this.currentInterfaceIndex = index;
};

/**
 * @param {UsbInterface} interfaceObj
 */
Printer.prototype.setCurrentInterface = function(interfaceObj) {
    var index = this.getInterfaces().indexOf(interfaceObj);

    if (index < 0) {
        console.error('Unknown interface', interfaceObj);
        return;
    }

    this.setCurrentInterfaceIndex(index);
};

/**
 * @param {Endpoint} endpoint
 */
Printer.prototype.setCurrentEndpoint = function(endpoint) {
    this.currentEndpoint = endpoint;
};


/**
 * Retourne, parmis les endpoints de l'interface courante,
 * le premier endpoint qui correspond à la direction donnnée
 * @param  {String} direction
 * @return {Endpoint}
 */
Printer.prototype.findEndpoint = function(direction) {
    var interfaceObj = this.getCurrentInterface();
    var matchedEndpoint = null;

    if (! interfaceObj) {
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
};

/**
 * @param {String} tray
 */
Printer.prototype.setCurrentTray = function(tray) {
    this.tray = tray;
};

/**
 * Parse la chaîne de caractères et injècte les commandes ESC/POS d'initialisation
 * en fonction du modèle de l'imprimante
 * @param {String} string
 * @returns {ArrayBuffer}
 */
Printer.prototype.parseCommand = function(string) {
    // Finalise la commande d'impression selon le modèle de l'imprimante
    var finalizedString = this.finalizePrintCommand(string, this.getCurrentTray());
    
    // Parse le texte pour y insérer le commande ESC/POS
    var parsedString = this.language.parse(finalizedString);
    
    // Retourne le buffer
    return this.stringtoArrayBuffer(parsedString);
};

/**
 * Finalise la commande d'impression donnée selon les spécificités du modèle d'imprimante
 * @param {String} command
 * @returns {String}
 */
Printer.prototype.finalizePrintCommand = function(command) {
    return command;
};

/**
 * Convertit une chaîne de caractères en un ArrayBuffer
 * @param {String} string
 * @returns {ArrayBuffer}
 */
Printer.prototype.stringtoArrayBuffer = function(string)
{
    var length = string.length;
    var totalDataSize = length * 2;

    var data = new ArrayBuffer(totalDataSize);
    var dataView = new Uint8Array(data, 0, totalDataSize);

    for (var index = 0; index < length; index++) {
        dataView[index] = string.charCodeAt(index);
    }

    return data;
};