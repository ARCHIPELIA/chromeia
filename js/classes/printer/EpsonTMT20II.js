function EpsonTMT20II(vendorId, productId, deviceId) {
    console.info('New printer instanciated: EPSON TM-T20II Receipt');
    Printer.call(this, vendorId, productId, deviceId);
}
EpsonTMT20II.prototype = Object.create(Printer.prototype);
EpsonTMT20II.prototype.constructor = EpsonTMT20II;

/**
 * Instancie l'implémentation du langage ESC/POS
 */
EpsonTMT20II.prototype.initLanguage = function() {
    console.info('EpsonTMT20II::initLanguage');
    this.language = new EpsonTMH6000IVLanguage();
};

/**
 * Finalise la commande d'impression donnée selon les spécificités du modèle d'imprimante
 * @param {String} string
 * @param {String} tray
 * @returns {String}
 */
EpsonTMT20II.prototype.finalizePrintCommand = function(string, tray) {
    var charset = String.fromCharCode(EpsonLanguage.INTERNATIONAL_CHARSET_FRANCE);
    var table = String.fromCharCode(EpsonLanguage.CHARACTER_TABLE_WPC1252);
    var finalFeed = String.fromCharCode(0x05);
    tray = String.fromCharCode(tray);
    
    var command  = '{{initPrint}}';
        command += '{{bac ' + tray + '}}';
        command += '{{initCharacters ' + charset + ' ' + table + '}}';
        command += string;
        command += '{{feedAndCut ' + finalFeed + '}}';
        
    console.info('EpsonTMT20II::finalizePrintCommand', command);
    return command;
};

