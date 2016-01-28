function EpsonTMU950(vendorId, productId, deviceId) {
    console.info('New printer instanciated: EPSON TM-U950 Receipt');
    Printer.call(this, vendorId, productId, deviceId);
}
EpsonTMU950.prototype = Object.create(Printer.prototype);
EpsonTMU950.prototype.constructor = EpsonTMU950;

/**
 * Instancie l'implémentation du langage ESC/POS
 */
EpsonTMU950.prototype.initLanguage = function() {
    console.info('EpsonTMU950::initLanguage');
    this.language = new EpsonTMH6000IVLanguage();
};

/**
 * Finalise la commande d'impression donnée selon les spécificités du modèle d'imprimante
 * @param {String} string
 * @param {String} tray
 * @returns {String}
 */
EpsonTMU950.prototype.finalizePrintCommand = function(string, tray) {
    var finalFeed = String.fromCharCode(0x10);
    tray = String.fromCharCode(tray);
    string = string.replace(/é/gi, "" + String.fromCharCode(0x7B));
    string = string.replace(/è/gi, "" + String.fromCharCode(0x7D));
    string = string.replace(/à/gi, "" + String.fromCharCode(0x40));
    string = string.replace(/ù/gi, "" + String.fromCharCode(0x7C));
    
    /**
     * @todo Portion de code Java qui n'a pas été implémentée
     * où "flux" (Java) = string (JS)
     * Normalizer.normalize(flux, Normalizer.Form.NFD).replaceAll("[\u0300-\u036F]", "");
     */
    
    var command  = '{{initPrint}}';
        command += '{{bac ' + tray + '}}';
        command += '{{R1}}';
        command += string;
        command += '{{feedAndCut ' + finalFeed + '}}';
        
    console.info('EpsonTMU950::finalizePrintCommand', command);
    return command;
};

