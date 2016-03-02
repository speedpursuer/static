angular.module('ImgCache', [])

.provider('ImgCache', function() {

    ImgCache.$init = function() {

        ImgCache.init(function() {
            ImgCache.$deferred.resolve();
        }, function(err) {
            alert(err);
            ImgCache.$deferred.reject();
        });
    }

    this.manualInit = false;

    this.setOptions = function(options) {
        angular.extend(ImgCache.options, options);
    }

    this.setOption = function(name, value) {
        ImgCache.options[name] = value;
    }

    this.$get = ['$q', function ($q) {

        ImgCache.$deferred = $q.defer();
        ImgCache.$promise = ImgCache.$deferred.promise;

        if(!this.manualInit) {
            ImgCache.$init();
        }

        return ImgCache;
    }];

})

.directive('imgCacheBg', ['ImgCache', function() {

    return {
        restrict: 'A',
        scope: {
            icBg: '@',
        },
        link: function(scope, el, attrs) {

            var setImg = function(type, el, src) {

                ImgCache.getCachedFileURL(src, function(src, dest) {
                    $(el).hide();
                    el.css({'background-image': 'url(' + dest + ')' });
                    $(el).removeClass('boxLoading');
                    $(el).fadeIn(800);
                });
            }

            var loadImg = function(type, el, src) {            	
            	
            	$(el).addClass('boxLoading');
            	            	            	
                ImgCache.$promise.then(function() {

                    ImgCache.isCached(src, function(path, success) {

                        if (success) {
                            setImg(type, el, src);
                        } else {
                            ImgCache.cacheFile(src, function() {
                                setImg(type, el, src);
                            }, function() {                                
                                $(el).addClass('default');
                                $(el).removeClass('boxLoading');                                
                            });
                        }

                    });
                });
            }
        
            attrs.$observe('icBg', function(src) {

                loadImg('bg', el, src);

            });
        }
    };
}])

.directive('imgCacheSrcAvatar', ['ImgCache', function() {

    return {
        restrict: 'A',
        scope: {
            icSrc: '@'
        },
        link: function(scope, el, attrs) {

            var setImg = function(type, el, src) {                

                $(el).hide();

                ImgCache.useCachedFileWithSource(el, src, function(){
                    $(el).fadeIn(1000);
                }, function(){
                    $(el).fadeIn(1000);
                });        
            }

            var loadImg = function(type, el, src) {                
                             
                el.attr('src', "images/bg.jpg");                

                ImgCache.$promise.then(function() {

                    ImgCache.isCached(src, function(path, success) {

                        if (success) {
                            setImg(type, el, src);
                        } else {
                            ImgCache.cacheFile(src, function() {
                                setImg(type, el, src);
                            }, function() {
                                el.attr('src', "images/player.png");
                            });
                        }

                    });
                });
            }
            
            attrs.$observe('icSrc', function(src) {

                loadImg('src', el, src);

            });            
        }
    };
}])

.directive('imgCacheSrc', ['ImgCache', function() {

    return {
        restrict: 'A',
        scope: {
            icSrc: '@'
        },
        link: function(scope, el, attrs) {

            var setImg = function(type, el, src) {               

                ImgCache.useCachedFileWithSource(el, src);              
            }

            var loadImg = function(type, el, src) {        
                
                el.attr('src', "images/bg.jpg");

                ImgCache.$promise.then(function() {

                    ImgCache.isCached(src, function(path, success) {

                        if (success) {                            
                            setImg(type, el, src);
                        } else {
                            ImgCache.cacheFile(src, function() {                                
                                setImg(type, el, src);
                            }, function() {
                                el.attr('src', "images/cloud.png");
                            });
                        }

                    });
                });
            }
            
            attrs.$observe('icSrc', function(src) {
                loadImg('src', el, src);
            });                   
        }
    };
}])


.directive('imgCacheSrcMove', ['ImgCache', function() {

    return {
        restrict: 'A',
        scope: {
            icSrc: '@'
        },
        link: function(scope, el, attrs) {

            var setImg = function(type, el, src, callback) {                

                ImgCache.useCachedFileWithSource(el, src, function(){
                    if(callback) callback();
                }, function(){
                    if(callback) callback();
                });             
            }

            var loadImg = function(type, el, src) {        
                
                el.attr('src', "images/bg.jpg");

                ImgCache.$promise.then(function() {

                    ImgCache.isCached(src, function(path, success) {

                        if (success) {
                            setImg(type, el, src);
                        } else {
                            ImgCache.cacheFile(src, function() {   
                                $(el).hide();
                                setImg(type, el, src, function(){
                                    $(el).fadeIn(500);
                                });
                            }, function() {
                                el.attr('src', "images/default.png");
                            });
                        }

                    });
                });
            }
            
            attrs.$observe('icSrc', function(src) {
                loadImg('src', el, src);
            });
        }
    };
}])