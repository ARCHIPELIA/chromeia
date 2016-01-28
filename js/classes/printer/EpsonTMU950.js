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
    this.language = new EpsonTMU950Language();
};

/**
 * Finalise la commande d'impression donnée selon les spécificités du modèle d'imprimante
 * @param {String} string
 * @param {String} tray
 * @returns {String}
 */
EpsonTMU950.prototype.finalizePrintCommand = function(string, tray) {
    var charset = String.fromCharCode(EpsonLanguage.INTERNATIONAL_CHARSET_USA);
    var table = String.fromCharCode(EpsonLanguage.CHARACTER_TABLE_PC437);
    var finalFeed = String.fromCharCode(0x10);
    tray = String.fromCharCode(tray);

    var command  = '{{initPrint}}';
        command += '{{bac ' + tray + '}}';
        command += '{{initCharacters ' + charset + ' ' + table + '}}';
        command += '{{R1}}';
        command += string;
        command += '{{feedAndCut ' + finalFeed + '}}';

    console.info('EpsonTMU950::finalizePrintCommand', command);
    return command;
};

