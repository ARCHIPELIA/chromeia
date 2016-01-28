
var selDevice;
var selPrinterType;
var butValider;
var butShowUSB;
var devices         =  [];
var curDevice       =  null;
var curPrinterType  =  null;
var validation      =  false;

/**
 * drawSelectDevice
 */
function drawSelectDevice(){
    chrome.usb.getDevices({}, function (items){
        console.debug('Items: ', items);

        selDevice.find('option').remove();
        devices = [];

        if (items.length > 0){
            for (var i = 0, item; (item = items[i]) !== undefined; i++){
                chrome.usb.getConfigurations(item, function (configs){ console.debug('Configs ['+ i +'] : ', configs) });

                devices.push(item);

                var option = $('<option>'+ item.productName +' [product: '+ item.productId +' - vendor: '+ item.vendorId +']</option>').attr({
                    value: i
                });

                if (i == 0){
                    option.attr('selected', 'selected');
                }

                selDevice.append(option);
            }

            butValider.prop('disabled', false);
        } else {
            selDevice.append('<option selected="selected">- Aucun périphérique detecté -</option>');
            butValider.prop('disabled', true);
        }

        var printers = Printer.getPrinterTypes();
        var i = 0;

        selPrinterType.find('option').remove();
        selPrinterType.append('<option value="">- Imprimante générique -</option>');

        for (var val in printers){
            var option = $('<option>'+ printers[val].name +'</option>').attr({
                value: val
            });

            selPrinterType.append(option);
        }

        // Rafraichissement du device sélectionné
        selDevice.triggerHandler('change');
    });
}

/**
 * onChangeDevice
 */
function onChangeDevice(){
    var selValue = selDevice.val();
    var printers = Printer.getPrinterTypes();

    curDevice = devices[selValue];

    selPrinterType.val('');

    try {
        if (curDevice){
            for (var val in printers){
                var printer = printers[val];

                // Recherche d'un modèle d'imprimante comptatible
                if (printer.devices instanceof Array){
                    for (var i = 0, printDevice; (printDevice = printer.devices[i]) !== undefined; i++){
                        if (curDevice.productId == printDevice.productId && curDevice.vendorId == printDevice.vendorId){
                            selPrinterType.val(val);
                            return;
                        }
                    }
                }
            }
        }
    } finally {
        // Rafraichissement du type d'imprimante sélectionné
        selPrinterType.triggerHandler('change');
    }
}

/**
 * onChangePrinterType
 */
function onChangePrinterType(){
    curPrinterType = selPrinterType.val();
    console.log(curPrinterType);
}

// document ready
$(document).ready(function (){
    selDevice      =  $('#sel-device-comptatible');
    selPrinterType =  $('#sel-printer-type');
    butValider     =  $('#but-valider-device');
    butShowUSB     =  $('#but-show-usb-device');

    // Affichage de la liste des périphériques détéctés
    drawSelectDevice();

    // Bouton pour sélectionner un autre périphérique USB
    butShowUSB.on('click', function (){
        var params = {
            multiple: false
        };

        chrome.usb.getUserSelectedDevices(params, function (selectedDeviceList) {
            if (app.hasChromeRuntimeError()) return;

            drawSelectDevice();
        });
    });

    // Bouton pour valider le choix du périphérique
    butValider.on('click', function (){
        if (curDevice != null){
            console.debug('Choix device :', curDevice);
            validation = true;

            dialog.close();
        }
    });

    // Changement du device USB
    selDevice.on('change', onChangeDevice.bind(selDevice));

    // Changement du modèle d'imprimante
    selPrinterType.on('change', onChangePrinterType.bind(selPrinterType));

    selDevice.triggerHandler('change');
});
