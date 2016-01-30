angular.element(document).ready(function () {
    if (window.cordova) {
        console.log("Running in Cordova, will bootstrap AngularJS once 'deviceready' event fires.");
        
        document.addEventListener('deviceready', function () {
            console.log("Deviceready event has fired, bootstrapping AngularJS.");            
            angular.bootstrap(document.body, ['app']);            
        }, false);
    } else {
        console.log("Running in browser, bootstrapping AngularJS now.");        
        angular.bootstrap(document.body, ['app']);
    }
	
	/*
	function javaScriptCall(){
		var scope = angular.element(document.getElementById('idForJS')).scope();
		scope.test();
	}*/
});

function updateClipThumb(){
	var scope = angular.element(document.getElementById('ClipsScopeID')).scope();
	scope.updateThumbFromNative();
}

function updateClipThumbForFavorite(){
    var scope = angular.element(document.getElementById('FavoriteScopeID')).scope();
    scope.updateThumbFromNative();
}

function updateClipFavorite(){
    var scope = angular.element(document.getElementById('ClipsScopeID')).scope();
    scope.updateFavoriteFromNative();
}

function updateClipBoth(){
    var scope = angular.element(document.getElementById('ClipsScopeID')).scope();
    scope.updateBothFromNative();
}