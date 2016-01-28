function UsbInterface (interfaceId) {
    this.id = interfaceId;
    this.class = null;
    this.subclass = null;
    this.protocol = null;
    this.alternateSetting = null;
    this.endpoints = [];
}

UsbInterface.prototype.getId = function() {
    return this.id;
};
UsbInterface.prototype.getClass = function() {
    return this.class;
};
UsbInterface.prototype.getSubclass = function() {
    return this.subclass;
};
UsbInterface.prototype.getProtocol = function() {
    return this.protocol;
};
UsbInterface.prototype.getAlternateSetting = function() {
    return this.alternateSetting;
};
UsbInterface.prototype.getEndpoints = function() {
    return this.endpoints;
};

UsbInterface.prototype.setId = function(interfaceId) {
    this.id = interfaceId;
};
UsbInterface.prototype.setClass = function(classId) {
    this.class = classId;
};
UsbInterface.prototype.setSubclass = function(subclassId) {
    this.subclass = subclassId;
};
UsbInterface.prototype.setProtocol = function(protocol) {
    this.protocol = protocol;
};
UsbInterface.prototype.setAlternateSetting = function(alternateSetting) {
    this.alternateSetting = alternateSetting;
};
UsbInterface.prototype.setEndpoints = function(endpointList) {
    this.endpoints = endpointList;
};