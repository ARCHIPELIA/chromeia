function EpsonTMT20IILanguage() {
    EpsonLanguage.call(this);
}
EpsonTMT20IILanguage.prototype = Object.create(EpsonLanguage.prototype);
EpsonTMT20IILanguage.prototype.constructor = EpsonTMT20IILanguage;

EpsonTMT20IILanguage.prototype.cutPaper = function() {
    return EpsonLanguage.GS + 'V' + String.fromCharCode(0x01);
};

EpsonTMT20IILanguage.prototype.feedLine = function(nbLines) {
    return '';
};

EpsonTMT20IILanguage.prototype.feedAndCutPaper = function(nbLines) {
    return EpsonLanguage.GS + 'V' + String.fromCharCode(EpsonLanguage.CUT_PARTIAL) + nbLines;
};