function EpsonTMH6000IV(vendorId, productId, deviceId) {
    console.info('New printer instanciated: Epson TM-H6000IV');
    Printer.call(this, vendorId, productId, deviceId);
}
EpsonTMH6000IV.prototype = Object.create(Printer.prototype);
EpsonTMH6000IV.prototype.constructor = EpsonTMH6000IV;

/**
 * Instancie l'implémentation du langage ESC/POS
 */
EpsonTMH6000IV.prototype.initLanguage = function() {
    console.info('EpsonTMH6000IV::initLanguage');
    this.language = new EpsonTMH6000IVLanguage();
};

/**
 * Finalise la commande d'impression donnée selon les spécificités du modèle d'imprimante
 * @param {String} string
 * @param {String} tray
 * @returns {String}
 */
EpsonTMH6000IV.prototype.finalizePrintCommand = function(string, tray) {
    var charset = String.fromCharCode(EpsonLanguage.INTERNATIONAL_CHARSET_USA);
    var table = String.fromCharCode(EpsonLanguage.CHARACTER_TABLE_PC437);
    var finalFeed = String.fromCharCode(0x05);
    tray = String.fromCharCode(tray);

    var command  = '{{initPrint}}';
        command += '{{bac ' + tray + '}}';
        command += '{{initCharacters ' + charset + ' ' + table + '}}';
        command += string;
        command += '{{feedAndCut ' + finalFeed + '}}';

    console.info('EpsonTMH6000IV::finalizePrintCommand', command);
    return command;
};

