function EpsonTMU950Language() {
    EpsonLanguage.call(this);
}
EpsonTMU950Language.prototype = Object.create(EpsonLanguage.prototype);
EpsonTMU950Language.prototype.constructor = EpsonTMU950Language;

EpsonTMU950Language.prototype.cutPaper = function() {
    return EpsonLanguage.ESC + 'i';
};

EpsonTMU950Language.prototype.feedLine = function(nbLines) {
    return EpsonLanguage.ESC + 'd' + nbLines;
};

EpsonTMU950Language.prototype.feedAndCutPaper = function(nbLines) {
    var command  = this.feedLine(nbLines);
        command += this.cutPaper();
    return command;
};