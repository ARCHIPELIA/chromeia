var $window = $(window);

/**
 * Vérifie l'existence d'une erreur de l'API Chrome.
 * Affiche un message et log l'erreur si besoin.
 * @return {Boolean} TRUE si tout va bien, FALSE en cas d'erreur
 */
function checkRuntimeError() {
    if (chrome.runtime.lastError != undefined) {
        console.log(chrome.runtime.lastError);
        showWarningMessage('Runtime error: ' + chrome.runtime.lastError.message);
        return false;
    }
    return true;
}

/**
 * Émet un évènement dans l'application
 * @param  {String} eventId
 * @param  {Array} eventData
 */
function triggerEvent(eventId, eventData) {
    $window.trigger(eventId, eventData);
}

/**
 * Attache une fonction à un évènement dans l'application
 * @param  {String} eventId
 * @param  {Function} eventHandler
 */
function bindEvent(eventId, eventHandler) {
    if ($.isFunction(eventHandler) !== true) return;
    
    $window.on(eventId, eventHandler);
}

/**
 * 
 * @param {String} num
 * @param {Integer} size
 * @returns {String}
 * @see http://stackoverflow.com/questions/2998784/how-to-output-integers-with-leading-zeros-in-javascript
 */
function pad(num, size) {
    size = size || 2;
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

/**
 * Convertit une chaîne de caractères en un ArrayBuffer
 * @param {String} string
 * @returns {ArrayBuffer}
 */
 function stringtoArrayBuffer(string) {
    var length = string.length;
    var totalDataSize = length * 2;

    var data = new ArrayBuffer(totalDataSize);
    var dataView = new Uint8Array(data, 0, totalDataSize);

    for (var index = 0; index < length; index++) {
        dataView[index] = string.charCodeAt(index);
    }

    return data;
};

/**
 * @see https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/String/trim
 */
if (!String.prototype.trim) {
    (function () {
        // On s'assure de bien retirer BOM et NBSP
        var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
        String.prototype.trim = function () {
            return this.replace(rtrim, '');
        };
    })();
}