cordova.define("cordova-plugin-hybrid.HybridBridge", function(require, exports, module) {
var exec = require('cordova/exec'),
    cordova = require('cordova');

function HybridBridge() {

}

HybridBridge.prototype.showList = function(urls, showTip, successCallback, errorCallback) {
	exec(successCallback, errorCallback, "MyHybridPlugin", "play", [showTip, urls]);
};

HybridBridge.prototype.showAlert = function(title, desc, clean, successCallback, errorCallback) {
	var _clean = "false";
	if(clean) {
		_clean = "true";
	}
    exec(successCallback, errorCallback, "MyHybridPlugin", "showMessage", [title, desc, _clean]);
};

HybridBridge.prototype.checkPush = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "MyHybridPlugin", "checkPush", []);
};

HybridBridge.prototype.getDBString = function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "MyHybridPlugin", "dbString", []);
};
	
module.exports = new HybridBridge();



});
