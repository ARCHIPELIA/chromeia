var ENDPOINT_DIRECTION_IN = 'in';
var ENDPOINT_DIRECTION_OUT = 'out';

function Endpoint (address) {
    this.address = address;
    this.direction = null;
    this.maximumPacketSize = null;
    this.type = null;
}

Endpoint.prototype.getAddress = function() {
    return this.address;
};
Endpoint.prototype.getDirection = function() {
    return this.direction;
};
Endpoint.prototype.getMaximumPacketSize = function() {
    return this.maximumPacketSize;
};
Endpoint.prototype.getType = function() {
    return this.type;
};
Endpoint.prototype.isDirectionOut = function() {
    return (this.direction === 'out');
};

Endpoint.prototype.setAddress = function(address) {
    this.address = address;
};
Endpoint.prototype.setDirection = function(direction) {
    this.direction = direction;
};
Endpoint.prototype.setMaximumPacketSize = function(maximumPacketSize) {
    this.maximumPacketSize = maximumPacketSize;
};
Endpoint.prototype.setType = function(type) {
    this.type = type;
};