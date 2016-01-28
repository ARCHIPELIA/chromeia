$(document).ready(function() {
    var $body = $('body');
    var $selecteDeviceButton = $('.js-select-device');
    var $deviceInfo = $('.js-info');
    var $printerButtons = $('.js-printer-button');
    var $printButton = $('.js-print');
    var $feedButton = $('.js-feed');
    var $cutButton = $('.js-cut-full');
    var $inputField = $('.js-input');
    var $testButton = $('.js-test');
    var $receiptButton = $('.js-receipt');
    var $templateButton = $('.js-template');
    var $rollPaperButton = $('.js-paper-roll');
    var $slipPaperButton = $('.js-paper-slip');
    var $slipPaperFeedField = $('.js-paper-slip-feed');
    
    /**
     * Bouton de sélection du périphérique
     */
    $selecteDeviceButton.on('click', showSelectDeviceWindow);
    
    $testButton.on('click', function() {
        var feedLines = $slipPaperFeedField.val();
        var inputText = $inputField.val().trim();
        if (inputText === '') return;
        var date = (new Date()).toLocaleTimeString();
        var string = date + ' ' + inputText + '\n';
        var tray = String.fromCharCode(0x04);
        
        var command  = '{{initPrint}}';
        command += '{{bac ' + tray + '}}';
        // Sauts de lignes avant le texte
        for (var index = 0; index < feedLines; index++) {
            command += "\n";
        }
        command += '        ' + string; // espace pour combler le vide du papier "roll"
        command += EpsonLanguage.FF; // print and eject slip paper
        var parserCommand = printer.language.parse(command);

        var buffer = stringtoArrayBuffer(parserCommand);
        sendCommandToPrinter( buffer );
    });
    
    /**
     * Bouton "Roll paper"
     */
    $rollPaperButton.on('click', function() {
        printer.setCurrentTray(0x00);
        var tray = String.fromCharCode(0x00);
        var command  = '{{initPrint}}{{bac ' + tray + '}}';
        var parserCommand = printer.language.parse(command);
        var buffer = stringtoArrayBuffer(parserCommand);
        sendCommandToPrinter( buffer );
    });
    
    /**
     * Bouton "Slip paper"
     */
    $slipPaperButton.on('click', function() {
        printer.setCurrentTray(0x04);
        var tray = String.fromCharCode(0x04);
        var command  = '{{initPrint}}{{bac ' + tray + '}}';
        var parserCommand = printer.language.parse(command);
        var buffer = stringtoArrayBuffer(parserCommand);
        sendCommandToPrinter( buffer );
    });
    
    /**
     * Bouton "Receipt"
     */
    $receiptButton.on('click', function() {
        var buffer = printer.parseCommand(ticket);
        sendCommandToPrinter( buffer );
    });
    
    /**
     * Bouton "Template"
     */
    $templateButton.on('click', function() {
        var template = "{{bold}}bold{{endbold}}\n\
\n\
{{italic}}italic{{enditalic}}\n\
\n\
{{underline}}underline{{endunderline}}\n\
\n\
{{strike}}strike{{endstrike}}\n\
\n\
{{h2}}texte h2{{endh2}}\n\
\n\
{{big}}text big{{endbig}}\n\
\n\
feedLine 4{{feedLine " + String.fromCharCode(4) + "}}\n\
\n\
{{right}}texte right{{endright}}\n\
\n\
{{center}}text center{{endcenter}}\n\
\n\
{{right}}simple right\n\
\n\
{{center}}simple center\n\
\n\
{{left}}simple left";
        
        var buffer = printer.parseCommand(template);
        sendCommandToPrinter( buffer );
    });
    
    /**
     * Bouton "Send text"
     */
    $printButton.on('click', function() {
        var inputText = $inputField.val().trim();
        if (inputText === '') return;
        
        var date = (new Date()).toLocaleTimeString();
        /**
         * @see Le caractère de fin de ligne est obligatoire,
         * sinon les commandes envoyées à la suite ne fonctionneront pas.
         */
        var string = date + ' ' + inputText + '\n';

        var buffer = printer.parseCommand(string);
        sendCommandToPrinter( buffer );
    });
    
    /**
     * Bouton "Cut"
     */
    $cutButton.on('click', function() {
        var string = '{{cut}}';
        var command = printer.language.parse(string);
        var buffer = stringtoArrayBuffer(command);
        sendCommandToPrinter( buffer );
    });
    
    /**
     * Bouton "Feed"
     */
    $feedButton.on('click', function() {
        var string = '{{feedLine ' + String.fromCharCode(0x02) + '}}';
        var command = printer.language.parse(string);
        var buffer = stringtoArrayBuffer(command);
        sendCommandToPrinter( buffer );
    });
    
    /**
     * Bouton de déconnexion du périphérique
     */
    $body.on('click', '.js-disconnect', function() {
        disconnectPrinter();
    });

    /**
     * Évènement: connexion réussie au périphérique
     */
    bindEvent(EVENTS.DEVICE_CONNECTED, function() {
        showStep(2);
    });

    /**
     * Évènement: déconnexion du périphérique
     */
    bindEvent(EVENTS.DEVICE_DISCONNECTED, function() {
        showStep(1);
    });

    /**
     * Évènement: les infos du périphérique ont été obtenues
     */
    bindEvent(EVENTS.DEVICE_INFO_OBTAINED, function() {
        var content ='Vendor ID: ' + printer.getVendorId() + ' (' + printer.getVendorIdHex() + ')<br>'
                    + 'Product ID: ' + printer.getProductId() + ' (' + printer.getProductIdHex() + ')';

        printer.getInterfaces().forEach(function(usbInterface) {
            content += '<h3 class="clickable js-interface-' + usbInterface.getId() + ' js-interfaces" data-id="' + usbInterface.getId() + '">';
            content += 'Interface #' + usbInterface.getId() + '</h3>';
            content += 'Alternate Setting: ' + usbInterface.getAlternateSetting() + '<br>';
            content += 'Class: ' + usbInterface.getClass() + '<br>';
            content += 'Subclass: ' + usbInterface.getSubclass() + '<br>';
            content += 'Protocol: ' + usbInterface.getProtocol();

            usbInterface.getEndpoints().forEach(function(endpoint) {
                content += '<br><br><strong class="clickable js-endpoint-' + endpoint.getAddress() + ' js-endpoints" data-address="' + endpoint.getAddress() + '">';
                content += '&bull; ' + 'Endpoint ' + endpoint.getAddress() + '</strong><br>';
                content += '- Type: ' + endpoint.getType() + '<br>';
                content += '- Direction: <strong>' + endpoint.getDirection() + '</strong><br>';
                content += '- Maximum Packet Size: ' + endpoint.getMaximumPacketSize();
            });
        });
        
        content += '<br><br><button type="button" class="js-disconnect">Disconnect</button>';

        $deviceInfo.html(content);
    });

    /**
     * Évènement: une interface a été sélectionnée
     */
    bindEvent(EVENTS.INTERFACE_CLAIMED, function(event, interfaceId) {
        $('.js-interfaces').removeClass('active');
        $('.js-interface-' + interfaceId).addClass('active');
    });

    /**
     * Évènement: une interface a été déseléctionnée
     */
    bindEvent(EVENTS.INTERFACE_RELEASED, function(event, interfaceId) {
        $('.js-interfaces').removeClass('active');
    });

    /**
     * Évènement: un endpoint a été sélectionné
     */
    bindEvent(EVENTS.ENDPOINT_SELECTED, function(event, endpointAddress) {
        $('.js-endpoints').removeClass('active');
        $('.js-endpoint-' + endpointAddress).addClass('active');

        $printerButtons.attr('disabled', false);
    });
});

/**
 * Affiche le bloc de l'étape donnée
 * @param  {Integer} stepNumber
 */
function showStep(stepNumber) {
    $('.js-steps').addClass('hidden');
    $('.step-' + stepNumber).removeClass('hidden');
}

/**
 * Affiche un message d'avertissement
 * @param  {String} message
 */
function showWarningMessage(message) {
    resetWarningMessage();

    $('body').prepend(
        '<div class="warning js-warning">' + message + '</div>'
    );
}

/**
 * Supprime les messages d'avertissement
 */
function resetWarningMessage() {
    $('.js-warning').remove();
}

var ticket = "{{center}}{{bold}}{{h2}}AUTARCIA{{endh2}}{{endbold}}\n\
17 AV AV DE LA CREATIVITE\n\
59650 VILLENEUVE D ASCQ\n\
Tél: 03 59 57 70 70\n\
Fax: 03 59 57 70 71\n\
\n\
-- DUPLICATA –\n\
Commande : 9682 / Facture : 6499\n\
Date: 08/10/2014 Heure: 17:07:31\n\
Vendeur: admin\n\
\n\
{{left}}------------------------------------------\n\
\n\
VALISE SAMSONITE ARGENT 55 CM       \n\
5556              2 x      98,50    197,00\n\
UN ARTICLE TEST                     \n\
5282              5 x      21,60    108,00\n\
  Ecotaxe         5 x       0,15        -\n\
TRAPPE VISITE RONDE 169 BLANC (VRI) \n\
2358              6 x       9,31     55,87\n\
TRAPPE VISITE RONDE 200 BLANC (VRI) \n\
2359              6 x       9,26     55,58\n\
------------------------------------------\n\
                  Total Brut EUR    417,35\n\
                Total Remise EUR      0,00\n\
                   Total TVA EUR     69,56\n\
                   Total TTC EUR    417,35\n\
\n\
20,00    Base HT     347,79  TVA     69,56\n\
\n\
------------------------------------------\n\
\n\
CARTE BLEUE                         200,00\n\
CHEQUE                              200,00\n\
ESPECES                              20,00\n\
\n\
  rendu 2,65\n\
\n\
{{left}}4 ARTICLE(S)\n\
\n\
{{left}}------------------------------------------\n\
\n\
Client: PERTHUIS Arnaud\n\
\n\
Points fidélités               \n\
\n\
  Solde actuel: 4229 PTS             \n\
\n\
------------------------------------------\n\
\n\
{{center}}RCS Paris 531 802 981\n\
\n\
{{bold}}Merci de votre visite.\n\
\n\
A Bientôt.{{endbold}}";