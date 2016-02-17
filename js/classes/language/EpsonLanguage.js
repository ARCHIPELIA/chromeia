function EpsonLanguage () {}

EpsonLanguage.prototype.initPrinter = function() {
    return EpsonLanguage.ESC + '@';
};

EpsonLanguage.prototype.initCharacters = function(internationalCharacter, characterTableCode) {
    var command  = this.setInternationalCharacterSet(internationalCharacter);
        command += this.setCharacterTable(characterTableCode);
    return command;
};

EpsonLanguage.prototype.setInternationalCharacterSet = function(internationalCharacter) {
    return EpsonLanguage.ESC + 'R' + internationalCharacter;
};

EpsonLanguage.prototype.setCharacterTable = function(characterTableCode) {
    return EpsonLanguage.ESC + 't' + characterTableCode;
};

EpsonLanguage.prototype.cutPaper = function() {
    return EpsonLanguage.ESC + 'i'; // partial 1 point
//    return EpsonLanguage.ESC + 'm'; // partial 3 points
};

EpsonLanguage.prototype.feedLine = function(nbLines) {
    return EpsonLanguage.ESC + 'd' + nbLines;
};

EpsonLanguage.prototype.feedAndCutPaper = function(nbLines) {
    console.log('feedAndCut', nbLines);
    var command  = this.feedLine(nbLines);
        command += this.cutPaper();
    return command;
};

/**
 * Sélection du bac d'impression
 * @param {Char} tray
 * @returns {String}
 */
EpsonLanguage.prototype.selectPrinterTray = function(tray) {
    return EpsonLanguage.ESC + 'c0' + tray;
};

/**
 * Sélectionne le mode d'impression
 * @param {Char} mode
 * @returns {String}
 */
EpsonLanguage.prototype.setPrintMode = function(mode) {
    return EpsonLanguage.ESC + '!' + mode;
};

/**
 * Sélectionne la police d'impression
 * @param {Char} font
 * @returns {String}
 */
EpsonLanguage.prototype.setFont = function(font) {
    return EpsonLanguage.ESC + 'M' + font;
};

/**
 * Sélectionne la couleur d'impression
 * @param {Char} color
 * @returns {String}
 */
EpsonLanguage.prototype.setColor = function(color) {
    return EpsonLanguage.ESC + 'r' + color;
};

/**
 * Emet un signal au tiroir-caisse
 * @returns {String}
 */
EpsonLanguage.prototype.drawerKickOut = function() {
    var command = EpsonLanguage.GS + '(E'
            + String.fromCharCode(0x04)
            + String.fromCharCode(0x00)
            + String.fromCharCode(0x05)
            + String.fromCharCode(0x77)
            + String.fromCharCode(0x00)
            + String.fromCharCode(0x00);
    command += EpsonLanguage.ESC + 'p'
            + String.fromCharCode(0x00)
            + String.fromCharCode(0x64)
            + String.fromCharCode(0x32);
    return command;
};

EpsonLanguage.prototype.doBold = function(string) {
    var command  = EpsonLanguage.ESC + 'E' + String.fromCharCode(0x01);
        command += string;
        command += EpsonLanguage.ESC + 'E' + String.fromCharCode(0x00);
    return command;
};

EpsonLanguage.prototype.doItalic = function(string) {
    return string;
};

EpsonLanguage.prototype.doUnderline = function(string) {
    var command  = EpsonLanguage.ESC + '-' + String.fromCharCode(0x01);
        command += string;
        command += EpsonLanguage.ESC + '-' + String.fromCharCode(0x00);
    return command;
};

EpsonLanguage.prototype.doStrike = function(string) {
    var command  = EpsonLanguage.ESC + 'G' + String.fromCharCode(0x01);
        command += string;
        command += EpsonLanguage.ESC + 'G' + String.fromCharCode(0x00);
    return command;
};

EpsonLanguage.prototype.doDoubleWidth = function(string) {
    var command  = EpsonLanguage.ESC + '!' + String.fromCharCode(EpsonLanguage.MODE_DOUBLE_WIDTH);
        command += string;
        command += EpsonLanguage.ESC + '!' + String.fromCharCode(EpsonLanguage.MODE_FONT_A);
    return command;
};

EpsonLanguage.prototype.doToggleLeftAlign = function(string) {
    var command  = EpsonLanguage.ESC + 'a' + String.fromCharCode(EpsonLanguage.JUSTIFY_LEFT);
        command += string;
    return command;
};

EpsonLanguage.prototype.doToggleRightAlign = function(string) {
    var command  = EpsonLanguage.ESC + 'a' + String.fromCharCode(EpsonLanguage.JUSTIFY_RIGHT);
        command += string;
        command += EpsonLanguage.ESC + 'a' + String.fromCharCode(EpsonLanguage.JUSTIFY_LEFT);
    return command;
};

EpsonLanguage.prototype.doToggleCenterAlign = function(string) {
    var command  = EpsonLanguage.ESC + 'a' + String.fromCharCode(EpsonLanguage.JUSTIFY_CENTER);
        command += string;
        command += EpsonLanguage.ESC + 'a' + String.fromCharCode(EpsonLanguage.JUSTIFY_LEFT);
    return command;
};

EpsonLanguage.prototype.doToggleJustify = function(string) {
    return string;
};

EpsonLanguage.prototype.doLeftAlign = function() {
    return EpsonLanguage.ESC + 'a' + String.fromCharCode(EpsonLanguage.JUSTIFY_LEFT);
};

EpsonLanguage.prototype.doRightAlign = function() {
    return EpsonLanguage.ESC + 'a' + String.fromCharCode(EpsonLanguage.JUSTIFY_RIGHT);
};

EpsonLanguage.prototype.doCenterAlign = function() {
    return EpsonLanguage.ESC + 'a' + String.fromCharCode(EpsonLanguage.JUSTIFY_CENTER);
};

EpsonLanguage.prototype.doJustify = function() {
    return '';
};

EpsonLanguage.prototype.toCodePage = function(text, characterTableCode) {
    var codePage;

    // Sélection de la Page de Codes
    switch (characterTableCode.charCodeAt(0)){
        case EpsonLanguage.CHARACTER_TABLE_PC437:
            codePage = EpsonLanguage.CODEPAGES_PC437;
            break;
    }

    // Aucune page de codes trouvé
    if (codePage == null)
        return text;

    // Conversion
    var buffer   = '';

    for (var i in text){
        var charPos = codePage.indexOf(text[i]);

        if (charPos !== -1){
            buffer += String.fromCharCode(charPos + 128);
        } else {
            buffer += text[i];
        }
    };

    return buffer;
}

EpsonLanguage.prototype.parse = function(text) {
    var self = this;
    var tableCode = null;

    var initPrintRegExp      = new RegExp('\{\{initPrint\}\}', 'g');
    var initCharactersRegExp = new RegExp('\{\{initCharacters (.{1}) (.{1})\}\}', 'g');
    var bacRegExp            = new RegExp('\{\{bac (.{1})\}\}', 'g');
    var kickoutRegExp        = new RegExp('\{\{kickout\}\}', 'g');
    var feedLineRegExp       = new RegExp('\{\{feedLine (.{1})\}\}', 'g');
    var feedAndCutRegExp     = new RegExp('\{\{feedAndCut (.{1})\}\}', 'g');
    var cutRegExp            = new RegExp('\{\{cut\}\}', 'g');
    var boldRegExp           = new RegExp('\{\{bold\}\}([^()]*)\{\{\endbold}\}', 'g'); // (([^]|.)+?)
    var italicRegExp         = new RegExp('\{\{italic\}\}([^()]*)\{\{\enditalic}\}', 'g');
    var underlineRegExp      = new RegExp('\{\{underline\}\}([^()]*)\{\{\endunderline}\}', 'g');
    var strikeRegExp         = new RegExp('\{\{strike\}\}([^()]*)\{\{\endstrike}\}', 'g');
    var h2RegExp             = new RegExp('\{\{h2\}\}([^()]*)\{\{\endh2}\}', 'g'); // (([^]|.)+?)
    var bigRegExp            = new RegExp('\{\{big\}\}([^()]*)\{\{\endbig}\}', 'g');
    var leftRegExp           = new RegExp('\{\{left\}\}([^()]*)\{\{\endleft}\}', 'g');
    var rightRegExp          = new RegExp('\{\{right\}\}([^()]*)\{\{\endright}\}', 'g');
    var centerRegExp         = new RegExp('\{\{center\}\}([^()]*)\{\{endcenter\}\}', 'g');
    var singleLeftRegExp     = new RegExp('\{\{left\}\}', 'g');
    var singleRightRegExp    = new RegExp('\{\{right\}\}', 'g');
    var singleCenterRegExp   = new RegExp('\{\{center\}\}', 'g');
    var singleJustifyRegExp  = new RegExp('\{\{justify\}\}', 'g');
    var R0RegExp             = new RegExp('\{\{R0\}\}', 'g');
    var R1RegExp             = new RegExp('\{\{R1\}\}', 'g');

    // {{initPrint}}
    text = text.replace(initPrintRegExp, function() {
        return self.initPrinter();
    });
    // {{initCharacters X Y}}
    text = text.replace(initCharactersRegExp, function(match, internationalCharacter, characterTableCode) {
        tableCode = characterTableCode;

        return self.initCharacters(internationalCharacter, characterTableCode);
    });
    // {{bac X}}
    text = text.replace(bacRegExp, function(match, tray) {
        return self.selectPrinterTray(tray);
    });
    // {{kickout}}
    text = text.replace(kickoutRegExp, function() {
        return self.drawerKickOut();
    });
    // {{feedLine X}}
    text = text.replace(feedLineRegExp, function(match, lines) {
        return self.feedLine(lines);
    });
    // {{feedAndCut X}}
    text = text.replace(feedAndCutRegExp, function(match, lines) {
        return self.feedAndCutPaper(lines);
    });
    // {{cut}}
    text = text.replace(cutRegExp, function() {
        return self.cutPaper();
    });

    // {{bold}}...{{endbold}}
    text = text.replace(boldRegExp, function(match, string) {
        return self.doBold(string);
    });
    // {{italic}}...{{enditalic}}
    text = text.replace(italicRegExp, function(match, string) {
        return self.doItalic(string);
    });
    // {{underline}}...{{endunderline}}
    text = text.replace(underlineRegExp, function(match, string) {
        return self.doUnderline(string);
    });
    // {{strike}}...{{endstrike}}
    text = text.replace(strikeRegExp, function(match, string) {
        return self.doStrike(string);
    });
    // {{h2}}...{{endh2}}
    text = text.replace(h2RegExp, function(match, string) {
        return self.doDoubleWidth(string);
    });
    // {{big}}...{{endbig}}
    text = text.replace(bigRegExp, function(match, string) {
        return self.doDoubleWidth(string);
    });

    // {{left}}...{{endleft}}
    text = text.replace(leftRegExp, function(match, string) {
        return self.doToggleLeftAlign(string);
    });
    // {{right}}...{{endright}}
    text = text.replace(rightRegExp, function(match, string) {
        return self.doToggleRightAlign(string);
    });
    // {{center}}...{{endcenter}}
    text = text.replace(centerRegExp, function(match, string) {
        return self.doToggleCenterAlign(string);
    });
    // {{justify}}...{{endjustify}}
    text = text.replace(centerRegExp, function(match, string) {
        return self.doToggleJustify(string);
    });
    // {{left}}
    text = text.replace(singleLeftRegExp, function() {
        return self.doLeftAlign();
    });
    // {{right}}
    text = text.replace(singleRightRegExp, function() {
        return self.doRightAlign();
    });
    // {{center}}
    text = text.replace(singleCenterRegExp, function() {
        return self.doCenterAlign();
    });
    // {{justify}}
    text = text.replace(singleJustifyRegExp, function() {
        return self.doJustify();
    });

    // {{R0}}
    text = text.replace(R0RegExp, function() {
        return self.setInternationalCharacterSet(EpsonLanguage.INTERNATIONAL_CHARSET_USA);
    });
    // {{R1}}
    text = text.replace(R1RegExp, function() {
        return self.setInternationalCharacterSet(EpsonLanguage.INTERNATIONAL_CHARSET_FRANCE);
    });

    if (tableCode != null){
        text = self.toCodePage(text, tableCode);
    }

    return text;
};

/* Codes ASCII */
EpsonLanguage.NUL = "\x00";
EpsonLanguage.LF = "\x0a";
EpsonLanguage.ESC = "\x1b";
EpsonLanguage.FS = "\x1c";
EpsonLanguage.FF = "\x0c";
EpsonLanguage.GS = "\x1d";
EpsonLanguage.DLE = "\x10";
EpsonLanguage.EOT = "\x04";

/* Cut types */
EpsonLanguage.CUT_FULL = 0x41; // 65
EpsonLanguage.CUT_PARTIAL = 0x42; // 66

/* Fonts */
EpsonLanguage.FONT_A = 0x00;
EpsonLanguage.FONT_B = 0x01;
EpsonLanguage.FONT_C = 0x02;

/* Print Colors */
EpsonLanguage.COLOR_1 = 0x00;
EpsonLanguage.COLOR_2 = 0x01;

/* International Character Set */
EpsonLanguage.INTERNATIONAL_CHARSET_USA = 0x00;
EpsonLanguage.INTERNATIONAL_CHARSET_FRANCE = 0x01;
EpsonLanguage.INTERNATIONAL_CHARSET_GERMANY = 0x02;
EpsonLanguage.INTERNATIONAL_CHARSET_UK = 0x03;
EpsonLanguage.INTERNATIONAL_CHARSET_DENMARK_1 = 0x04;
EpsonLanguage.INTERNATIONAL_CHARSET_SWEDEN = 0x05;
EpsonLanguage.INTERNATIONAL_CHARSET_ITALY = 0x06;
EpsonLanguage.INTERNATIONAL_CHARSET_SPAIN = 0x07;
EpsonLanguage.INTERNATIONAL_CHARSET_JAPAN = 0x08;
EpsonLanguage.INTERNATIONAL_CHARSET_NORWAY = 0x09;
EpsonLanguage.INTERNATIONAL_CHARSET_DENMARK_2 = 0x0A;

/* Justifications */
EpsonLanguage.JUSTIFY_LEFT = 0x00;
EpsonLanguage.JUSTIFY_CENTER = 0x01;
EpsonLanguage.JUSTIFY_RIGHT = 0x02;
EpsonLanguage.JUSTIFY_FULL = 0x03;

/* Print mode constants */
EpsonLanguage.MODE_FONT_A = 0x00; // 0
EpsonLanguage.MODE_FONT_B = 0x01; // 1
EpsonLanguage.MODE_EMPHASIZED = 0x08; // 8
EpsonLanguage.MODE_DOUBLE_HEIGHT = 0x10; // 16
EpsonLanguage.MODE_DOUBLE_WIDTH = 0x20; // 32
EpsonLanguage.MODE_UNDERLINE = 0x80; // 128

/* Print mode constants */
EpsonLanguage.CHARACTER_TABLE_PC437 = 0x00; // 0 - USA: Standard Europe
EpsonLanguage.CHARACTER_TABLE_KATAKANA = 0x01; // 1 - Katanaka
EpsonLanguage.CHARACTER_TABLE_PC850 = 0x02; // 2 - Multilingual
EpsonLanguage.CHARACTER_TABLE_PC860 = 0x03; // 3 - Portuguese
EpsonLanguage.CHARACTER_TABLE_PC863 = 0x04; // 4 - Canadian-French
EpsonLanguage.CHARACTER_TABLE_PC865 = 0x05; // 5 - Nordic
EpsonLanguage.CHARACTER_TABLE_WPC1252 = 0x10; // 16 - Windows Latin1
EpsonLanguage.CHARACTER_TABLE_PC866 = 0x11; // 17 - Cyrillic #2
EpsonLanguage.CHARACTER_TABLE_PC852 = 0x12; // 18 - Latin 2
EpsonLanguage.CHARACTER_TABLE_PC858 = 0x13; // 19 - Euro
EpsonLanguage.CHARACTER_TABLE_THAI_CODE_42 = 0x14; // 20
EpsonLanguage.CHARACTER_TABLE_THAI_CODE_11 = 0x15; // 21
EpsonLanguage.CHARACTER_TABLE_THAI_CODE_13 = 0x16; // 22
EpsonLanguage.CHARACTER_TABLE_THAI_CODE_14 = 0x17; // 23
EpsonLanguage.CHARACTER_TABLE_THAI_CODE_16 = 0x18; // 24
EpsonLanguage.CHARACTER_TABLE_THAI_CODE_17 = 0x19; // 25
EpsonLanguage.CHARACTER_TABLE_THAI_CODE_18 = 0x1A; // 26
EpsonLanguage.CHARACTER_TABLE_USER_DEFINED_1 = 0xFE; // 254
EpsonLanguage.CHARACTER_TABLE_USER_DEFINED_2 = 0xFF; // 255

/* PC437 */
EpsonLanguage.CODEPAGES_PC437 =
    'ÇüéâäàåçêëèïîìÄÅ' +
    'ÉæÆôöòûùÿÖÜ¢£¥₧ƒ' +
    'áíóúñÑªº¿⌐¬½¼¡«»' +
    '░▒▓│┤╡╢╖╕╣║╗╝╜╛┐' +
    '└┴┬├─┼╞╟╚╔╩╦╠═╬╧' +
    '╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
    'αßΓπΣσµτΦΘΩδ∞φε∩' +
    '≡±≥≤⌠⌡÷≈°··√ⁿ²■';
