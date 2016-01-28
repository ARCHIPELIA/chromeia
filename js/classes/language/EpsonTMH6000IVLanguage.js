function EpsonTMH6000IVLanguage() {
    EpsonLanguage.call(this);
}
EpsonTMH6000IVLanguage.prototype = Object.create(EpsonLanguage.prototype);
EpsonTMH6000IVLanguage.prototype.constructor = EpsonTMH6000IVLanguage;

EpsonTMH6000IVLanguage.prototype.cutPaper = function() {
    return EpsonLanguage.ESC + 'i';
};

EpsonTMH6000IVLanguage.prototype.feedLine = function(nbLines) {
    return EpsonLanguage.ESC + 'd' + nbLines;
};

EpsonTMH6000IVLanguage.prototype.feedAndCutPaper = function(nbLines) {
    var command  = this.feedLine(nbLines);
        command += this.cutPaper();
    return command;
};