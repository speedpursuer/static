angular.module('app.services', [])


.factory('DBService', function($q, pouchdb, ErrorService) {

    //var dbName = "ballroad_test", remoteURL = "http://admin:12341234@localhost:5984/";
    //var dbName = "ballroad", remoteURL = "http://admin:12341234@localhost:5984/";
    //var db = pouchdb.create(dbName);//, remoteDB = pouchdb.create(remoteURL + dbName);
    //deleteDB();
    //syncTo();        
    //setupView();    
    //testFun();

    var service = {};

    var string = {
        dbName: "ballroad_test",
        remoteURL: "http://121.40.197.226:4984/",
        dbAdapter: "websql",
        network_err: "您的网络较慢，请稍后尝试同步"
    }
    
    var db = pouchdb.create(string.dbName, {adapter: string.dbAdapter});
            
    var favoriteList = [];
    var playerList = [];
    var newsList = [];

    //deleteDB();

    service.setNewsList = function(_list) {                                               
        newsList = _list;        
    };

    service.getNewsList = function() {
        return newsList;
    };

    service.getMoreNews = function() {

        var deferred = $q.defer();
     
        db.query('views/local', options).then(function (result) {

            if (result && result.rows.length > 0) {

                options.startkey = result.rows[result.rows.length - 1].key;
                options.skip = 1;

                result = result.rows.map(function(row) {
                    var thumb = "", favorite = false;
                    if (row.doc) {
                        thumb = row.doc.thumb;
                        favorite = row.doc.favorite;
                    }
                    return {
                        _id: row.id,
                        name: row.value.name,
                        desc: row.value.desc,
                        image: row.value.image,
                        local: row.value.local,
                        thumb: thumb,
                        favorite: favorite                        
                    };
                });

                deferred.resolve(result);
            }else {
                deferred.reject("no more data");    
            }


        }).catch(function (err) {                
            deferred.reject(err);                
        });

        return deferred.promise;
    }

    service.getNewsUpdate = function() {
        options = {limit : 5, descending : true, include_docs : true};
        return service.getMoreNews();
    };    

    service.setPlayerList = function(_list) {                                               
        playerList = _list;       
    };

    service.getPlayerList = function() {
        return playerList;
    };

    service.getStars = function() {
        return db.find({
            selector: {type: 'player', star: true}
        });        
    };

    service.getAllPlayers = function() {       
        return retrieveAllPlayers();
    };    
		  
    service.setFavoriteList = function(_list) {		
        if(favoriteList.length) {
            favoriteList = favoriteList.concat(_list);
        }else{
            favoriteList = _list;           
        }	 			    
    };

	service.getFavoriteList = function(){
	    return favoriteList;
	};

	service.addFavorite = function(clipID, thumb) {

        for(var i=0;i<favoriteList.length;i++) {
            if(favoriteList[i]._id == clipID) {                
                return;
            }
        }

        getDoc(clipID).then(function(result){
            result.thumb = thumb;
            result.favorite = true;
            favoriteList.push(result);
        });     
    };

	service.removeFavorite = function(clipID) {	    	
    	for(var i=0;i<favoriteList.length;i++) {
    		if(favoriteList[i]._id == clipID) {
    			favoriteList.splice(i,1);
    			return;
    		}
    	}
    };

    service.getMovesByPlayer = function(playerID) {
        var deferred = $q.defer();
        
        db.query('views/moves', {startkey: [playerID], endkey: [playerID, {}], reduce: true, group: true}).then(function (result) {
                      
            var moves = [];

            for(i in result.rows) {                                
                moves.push({name: result.rows[i].key[1], image: result.rows[i].key[2], desc: result.rows[i].key[3], clipQty: result.rows[i].value});
            }
            deferred.resolve(moves);

        }).catch(function (err) {
            deferred.reject(err);
        }); 

        return deferred.promise;       
    };

    service.returnClips = function() {
        return clips;
    }

    var clips = {
        options: {},
        end: false,
        limit: 6,
        init: function(playerID, moveName) {
            this.options = {limit : this.limit, startkey: [playerID, moveName], endkey: [playerID, moveName, {}], reduce: true, group: true};
            this.end = false;
            return getClips(this);
        },
        more: function() {
            return getClips(this);  
        },
        hasMore: function() {
            return this.end;
        }
    };

    function getClips(favorite) {

        var deferred = $q.defer();

        var _options = favorite.options;
     
        db.query('views/clips', _options).then(function (result) {

            if (result && result.rows.length > 0) {

                if(result.rows.length < favorite.limit) {
                    favorite.end = true;
                }
                
                _options.startkey = result.rows[result.rows.length - 1].key;
                _options.skip = 1;
            
                var keys = [];
                
                for(i in result.rows) {
                    keys.push(result.rows[i].value);
                }

                db.query('views/local', {include_docs : true, keys: keys}).then(function (result) {
                                                   
                    result = result.rows.map(function(row) {
                        var thumb = "", favorite = false;
                        if (row.doc) {
                            thumb = row.doc.thumb;
                            favorite = row.doc.favorite;
                        }
                        return {
                            _id: row.id,
                            name: row.value.name,
                            desc: row.value.desc,
                            image: row.value.image,
                            local: row.value.local,
                            thumb: thumb,
                            favorite: favorite                        
                        };
                    });
                    
                    deferred.resolve(result);             

                }).catch(function (err) {                
                    deferred.reject(err);                
                });
            }else{
                favorite.end = true;                
                deferred.resolve("No more data");             
            }
        }).catch(function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    }

    service.returnFavorite = function() {
        return favorite;
    }

    function initFavorite() {
        return favorite.init();
    }

    var favorite = {
        options: {},
        end: false,
        limit: 6,
        init: function() {
            this.options = {limit : this.limit, include_docs: true, startkey: [true], endkey: [true, {}]};
            this.end = false;
            this.end = false;
            return getFavorite(this);
        },
        more: function() {
            return getFavorite(this);  
        },
        hasMore: function() {
            return this.end;
        }  
    }

    function getFavorite(favorite) {

        var deferred = $q.defer();

        var _options = favorite.options;

        db.query('views/favorite', _options).then(function (result) {

            if (result && result.rows.length > 0) {

                if(result.rows.length < favorite.limit) {
                    favorite.end = true;
                }
                
                _options.startkey = result.rows[result.rows.length - 1].key;
                _options.skip = 1;
                                               
                result = result.rows.map(function(row) {
                    return {
                        _id: row.doc._id,
                        name: row.doc.name,
                        desc: row.doc.desc,
                        image: row.doc.image,
                        thumb: row.value.thumb,
                        favorite: row.key[0],
                        local: row.id
                    };
                });
                
                service.setFavoriteList(result);
                deferred.resolve("Favorite retrieved");                   

            }else{
                //deferred.reject("No more data");
                deferred.resolve("No more data");                   
                favorite.end = true;
            }

        }).catch(function (err) {                
            deferred.reject(err);                
        });

        return deferred.promise;
    }

    service.getClipsByPlayer = function(playerID, moveName) {

        var deferred = $q.defer();
     
        db.query('views/clips', {startkey: [playerID, moveName], endkey: [playerID, moveName, {}], reduce: true, group: true}).then(function (result) {
            
            var keys = [];
            
            for(i in result.rows) {
                keys.push(result.rows[i].value);
            }

            db.query('views/local', {include_docs : true, keys: keys}).then(function (result) {
                                               
                result = result.rows.map(function(row) {
                    var thumb = "", favorite = false;
                    if (row.doc) {
                        thumb = row.doc.thumb;
                        favorite = row.doc.favorite;
                    }
                    return {
                        _id: row.id,
                        name: row.value.name,
                        desc: row.value.desc,
                        image: row.value.image,
                        local: row.value.local,
                        thumb: thumb,
                        favorite: favorite                        
                    };
                });
                
                deferred.resolve(result);             

            }).catch(function (err) {                
                deferred.reject(err);                
            });
        }).catch(function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    };
    
    service.syncRemote = function() {
        return syncFromRemote();
    };

    service.put = function(doc) {
        return db.put(doc);
    };

    service.updateBoth = function(clipID, favorite, curClipList) {

        var post_fix = ".jpg";

        var updateList = function(list) {
            if(list && list.length > 0) {
                for(i in list) {
                    if(list[i]._id == clipID) {                
                        list[i].thumb = list[i].image + post_fix;
                        list[i].favorite = favorite;
                        return;
                    }
                }        
            }            
        };

        db.get(clipID).then(function(clip) {
            db.get(clip.local).then(function(local) {
                local.thumb = clip.image + post_fix;
                local.favorite = favorite;
                db.put(local);
            }).catch(function(){
                var local = {
                    _id: clip.local,
                    type: "local",
                    favorite: favorite,
                    thumb: clip.image + post_fix,
                    clip: clipID            
                }
                db.put(local);
            });  

            if(favorite) {
                service.addFavorite(clipID, clip.image + post_fix);
            } else {
                service.removeFavorite(clipID);
            }                                  
        });

        updateList(curClipList);        
        //updateList(newsList);        
    };
    
    service.updateFavorite = function(clipID, localID, flag) {    

        var updateList = function(list) {
            if(list && list.length > 0) {
                for(i in list) {
                    if(list[i]._id == clipID) {                        
                        list[i].favorite = flag;
                        return;
                    }
                }        
            }            
        };

        db.get(localID).then(function(local) {
            local.favorite = flag;
            db.put(local);      
            if(flag) {
                service.addFavorite(clipID, local.thumb);
            } else {
                service.removeFavorite(clipID);
            }          
        }).catch(function(){
            var local = {
                _id: localID,
                type: "local",
                favorite: flag,
                thumb: "",
                clip: clipID               
            }
            db.put(local);
            service.addFavorite(clipID, "");
        });   

        //updateList(newsList);     
    };

    service.updateThumb = function(clipID, curClipList) {

        var post_fix = ".jpg";

        var updateList = function(list) {
            if(list && list.length > 0) {
                for(i in list) {
                    if(list[i]._id == clipID) {                
                        list[i].thumb = list[i].image + post_fix;
                        return;
                    }
                }        
            }            
        };

        db.get(clipID).then(function(clip) {

            db.get(clip.local).then(function(local) {
                local.thumb = clip.image + post_fix;
                db.put(local);
            }).catch(function(){
                var local = {
                    _id: clip.local,
                    type: "local",
                    favorite: false,
                    thumb: clip.image + post_fix,
                    clip: clipID            
                }
                db.put(local);
            });         
        });    

        updateList(favoriteList);
        updateList(curClipList);
        //updateList(newsList);            
    };

    function initFail() {
        ErrorService.showModal();
        ErrorService.hideSplashScreen();        
    }

    service.init = function() {
        var deferred = $q.defer();    
        isDBInstalled()
        .then(function() {
            syncFromRemote().then(function(){                                   
                retrieveAllPlayers()
                .then(initFavorite)
                .then(function() {
                    deferred.resolve("DB Existed");
                }).catch(function(err){                    
                    initFail();
                    deferred.reject("Err in getting init data: " + err);                     
                });
            }).catch(function(){                        
                retrieveAllPlayers()
                .then(initFavorite)
                .then(function() {
                    deferred.resolve("DB Existed");
                    ErrorService.showAlert(string.network_err);
                }).catch(function(err){                    
                    initFail();
                    deferred.reject("Err in getting init data: " + err);                     
                });
            });            
        }).catch(function() {
            syncFromRemote()
            .then(setupView)
            .then(setUpIndex)
            .then(markInstalled)
            .then(retrieveAllPlayers)
            .then(initFavorite)
            .then(function() {
                deferred.resolve("DB Created");
            }).catch(function (err){                
                initFail();
                deferred.reject("Err in creating DB" + err);            
            });
        });
      
        return deferred.promise;        
    };

    function getDoc(id) {
        return db.get(id);
    }

    function retrieveAllPlayers() {
        var deferred = $q.defer();

        db.query('views/players', {reduce: true, group: true, group_level: 2}).then(function (result) {            
            
            var keys = [], qtys = [];
            
            for(i in result.rows) {
                keys.push(result.rows[i].key);
                qtys.push(result.rows[i].value);
            }

            db.allDocs({
                include_docs: true,
                keys: keys
            }).then(function (result) {
                                
                for(i in result.rows) {
                    result.rows[i].doc.clipQty = qtys[i];
                }     

                result = result.rows.map(function(row) {
                    return row.doc;
                });

                service.setPlayerList(result);

                deferred.resolve("All players retrieved");

            }).catch(function (err) {
                deferred.reject(err);
            });

        }).catch(function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function retrieveFavorite() {

        var deferred = $q.defer();
        
        db.query('views/favorite', {include_docs : true, keys: [true]}).then(function (result) {
                                               
            result = result.rows.map(function(row) {
                return {
                    _id: row.doc._id,
                    name: row.doc.name,
                    desc: row.doc.desc,
                    image: row.doc.image,
                    thumb: row.value.thumb,
                    favorite: row.key,
                    local: row.id
                };
            });

            service.setFavoriteList(result);

            deferred.resolve("Favorite retrieved");                        

        }).catch(function (err) {                
            deferred.reject(err);                
        });    

        return deferred.promise;   
    }

    function deleteDB() {      
        db.destroy().then(function (response) {
            console.log(response);
        }).catch(function (err) {
            console.log(err);
        });
    }

    function syncFromRemote() {
        return db.replicate.from(string.remoteURL + string.dbName);
    }

    function setupView() {
        var ddoc = {
            _id: '_design/views',
            views: {
                players: {
                    map: function(doc) {
                        var player, clip;
                        if (doc.move_name && doc.clip_player) {
                            for (clip in doc.clip_player) {
                                player = doc.clip_player[clip];                                
                                emit(player, clip);
                                //emit([player, clip], 1);
                            }
                        }
                    }.toString(),
                    reduce: "_count"                
                },
                moves: {
                    map: function(doc) {
                        var player, clip;
                        if (doc.move_name && doc.clip_player && doc.image) {
                            for (clip in doc.clip_player) {
                                player = doc.clip_player[clip];                                
                                emit([player, doc.move_name, doc.image, doc.desc], 1);
                            }
                        }
                    }.toString(),
                    reduce: function(key, values, rereduce) {
                        return sum(values);
                    }.toString()
                },
                clips: {
                    map: function(doc) {
                        var player, clip;
                        if (doc.move_name && doc.clip_player) {
                            for (clip in doc.clip_player) {
                                player = doc.clip_player[clip];
                                emit([player, doc.move_name, clip], clip);
                            }
                        }
                    }.toString()                     
                },
                local: {
                    map: function(doc) {      
                        if (doc.type === 'clip') {
                            emit(doc._id, {_id : doc.local, desc: doc.desc, name: doc.name, image: doc.image, local: doc.local});
                        }
                    }.toString()
                },
                favorite: {
                    map: function(doc) { 
                        if (doc.type === 'local') {
                            emit([doc.favorite, doc.clip], {_id : doc.clip, thumb: doc.thumb});
                        }
                    }.toString()
                }
            }   
        };
        return db.put(ddoc);
    }    

    function setUpIndex() {
    	return db.createIndex({
    		index: {
    			fields: ['type']
    		}
		});
    }
    
    function markInstalled() {
        return db.put({
            _id: 'DBInstalled',
            status: 'completed'
        });
    }

    function isDBInstalled() {
        return db.get('DBInstalled');
    }

    return service;    
})

.factory('ImgCacheService', function($q, ImgCache) {

    var service = {};

    service.cacheImg = function(src) {
        var img = new Image();
        fatchImg(img, src);
    }

    function fatchImg(el, src) {
        ImgCache.isCached(src, function(path, success) {
            if (success) {
                ImgCache.useCachedFileWithSource(el, src);
            } else {
                ImgCache.cacheFile(src, function() {
                    ImgCache.useCachedFileWithSource(el, src);
                });
            }
        });    
    }

    return service;
})

.factory('FileCacheService', function($q, ImgCache) {

    var service = {};

    service.download = function(src) {

        var deferred = $q.defer();
               
        ImgCache.$promise.then(function() {

            ImgCache.cacheFile(src, function() {
                ImgCache.getCachedFileURL(src, function(src, dest) {
                    deferred.resolve(dest);
                });
            },
            function() {
                deferred.reject("download file error");
            },
            function(p) {
                $("#progress").val(p.loaded/p.total);
            });
        });

        return deferred.promise;
    };

    return service;
})

.factory('AnimationService', function() {
    
    var service = {}
    
    var win = function(d) {                                
    };
    
    var fail = function(e) {
        console.log(e)
    };
    
    service.playAnimation = function(clipURL, favorite, showFavBut) {
        favorite = favorite? "true": "false";
        showFavBut = showFavBut? "true": "false";
        cordova.exec(win, fail, "MyHybridPlugin", "playClip", [clipURL, favorite, showFavBut]);
    };
    
    return service;
})

.factory('ErrorService', function($rootScope, $ionicModal, $cordovaSplashscreen, $ionicPopup, $ionicLoading, $timeout) {
                
         
    var service = {};
                
    $ionicModal.fromTemplateUrl('templates/modal.html', {
        scope: $rootScope,
        animation: 'slide-in-up',
        backdropClickToClose: false,
        hardwareBackButtonClose: false
    }).then(function(modal) {
        $rootScope.modal = modal;
    });

    service.showModal = function() {
        $rootScope.modal.show();
    };

    service.hideSplashScreen = function() {
        $timeout(function() {
            $cordovaSplashscreen.hide();
        }, 500);   
    };

    service.showAlert = function(title) {
        var alertPopup = $ionicPopup.alert({
            title: title
        });

        alertPopup.then(function(res) {
        });
    };

    service.showDownLoader = function() {
        $ionicLoading.show({     
            template: '<span>Downloading...</span><progress max="1" id="progress"></progress>',
            hideOnStateChange: true
        });
    };
    
    service.showLoader = function(title) {
        $ionicLoading.show({
            template: title,
            hideOnStateChange: true
        });
    };

    service.hideLoader = function(alert) {
        $ionicLoading.hide();
        if (alert) {
            service.showAlert(alert);
        }       
    };

    return service;
})

/*

service.init_ = function() {
        var deferred = $q.defer();    
        isDBInstalled()
        .then(function() {
            retrieveAllPlayers()
            //.then(retrieveFavorite)
            .then(initFavorite)
            .then(syncFromRemote)
            .then(function() {
                deferred.resolve("DB Existed");
            }).catch(function(){
                deferred.resolve("DB Existed, Network disconnected");
                ErrorService.showAlert("Network disconnected");
            }); 
        }).catch(function() {
            syncFromRemote()
            .then(setupView)
            .then(setUpIndex)
            .then(markInstalled)
            .then(retrieveAllPlayers)
            //.then(retrieveFavorite)
            .then(initFavorite)
            .then(function() {
                deferred.resolve("DB Created");
            }).catch(function (err){                
                ErrorService.showModal();
                ErrorService.hideSplashScreen();
                deferred.reject(err);            
            });
        });
      
        return deferred.promise;        
    };
 service.getClipsByPlayer = function() {
        return getClips(options);
    };

    service.getClipsByPlayerInit = function(playerID, moveName) {
        options = {limit : 6, startkey: [playerID, moveName], endkey: [playerID, moveName, {}], reduce: true, group: true};
        return getClips(options);

function map(doc) {      
        if (doc.type === 'local') {
            emit(doc.favorite, {_id : doc.clip, thumb: doc.thumb});
        }
    }

    function testView() {
        
        db.query(map, {limit : 3, include_docs: true, key: true}).then(function (result) {
            console.log(result);
        }).catch(function (err) {
            console.log(err);
        });
    }

  service.getFavorite = function() {
        return retrieveFavorite();
    };
        for(i in playerList) {
            ImgCacheService.cacheImg(playerList[i].avatar);
        }

// test code
    function map(doc) {      
        if (doc.type === 'local') {
            emit(doc.favorite, {_id : doc.clip, thumb: doc.thumb});
        }
    }

    function map_r(doc) {      
        if (doc.type === 'clip') {
            emit(doc._id, {_id : doc.local, desc: doc.desc, name: doc.name, image: doc.image});
        }
    }

    function testView() {

        //var keys = [true];
        //var keys = ['clip8', 'clip3'];
        //db.query('views/moves', {startkey: ['player1'], endkey: ['player1', {}], reduce: true, group: true}).then(function (result) {
        //db.query('views/players', {reduce: true, group: true}).then(function (result) {            
        //db.query(map_r, {include_docs : true, keys: keys}).then(function (result) {
        db.query(map_r, {include_docs : true}).then(function (result) {
            console.log(result);
        }).catch(function (err) {
            console.log(err);
        });
    }

    function syncTo() {
        return db.replicate.to(remoteURL + "ballroad_test", {
            live: false,
            retry: false,            
            doc_ids: ['Crossover', 'Dribble', 'Dunk', 'Layup', 'Pass', 'Shoot', 'TripleThreat', 
            'clip1', 'clip2', 'clip3', 'clip4', 'clip5', 'clip6', 'clip7', 'clip8', 'clip9',
            'player1', 'player2', 'player3', 'player4' 
            ]
        }).then(function(result){
            console.log(result);
        }).catch(function(err){
            console.log(err);
        });        
    }
    // test code

.factory('NewsService', function($q, DBService) {
    
    var service = {};

    var newsList = [];
    var options = {};
    var noMoreItemsAvailable = false;

    resetOptions();

    function resetOptions() {
        options = {limit : 5, descending : true};
    }

    service.getMoreNews = function() {        
        DBService.getAllClips(options).then(function(result){
            newsList = newsList.concat(result);
        }).catch(function(err) {
            noMoreItemsAvailable = true;
        });
    };

    service.getNewsList = function() {
        return newsList;
    };

    service.getNewsUpdate = function() {
        resetOptions();
        return service.getAllClips(options);
    };

    service.hasMore = function() {
        return noMoreItemsAvailable;
    };

    return service;
})

        db.query('views/local', {include_docs : true, key: clipID}).then(function (result) {
                                               
            result = result.rows.map(function(row) {
                var thumb = "", favorite = false;
                if (row.doc) {
                    thumb = row.doc.thumb;
                    favorite = row.doc.favorite;
                }
                return {
                    _id: row.id,
                    name: row.value.name,
                    desc: row.value.desc,
                    image: row.value.image,
                    local: row.value.local,
                    thumb: thumb,
                    favorite: favorite                        
                };
            });
            
            favoriteList.push(result[0]);                        

        }).catch(function (err) {                
            deferred.reject(err);                
        });
        

service.setLocalClip = function(clipID, dest) {
        var deferred = $q.defer();
        db.get(clipID).then(function(clip) {
            clip.image = dest;
            clip.local = true;
            db.put(clip).then(function() {
                deferred.resolve(dest);
            }).catch(function(err) {
                deferred.reject(err);
            });
        }).catch(function(err) {
            deferred.reject(err);
        });
        return deferred.promise;
    };


function testFun() {

        var deferred = $q.defer();

        var playerID = 'player1';

        var moveName = 'Crossover';

        db.query('views/clips', {startkey: [playerID, moveName], endkey: [playerID, moveName, {}], reduce: true, group: true}).then(function (result) {
            
            console.log(result);

            var keys = [];
            
            for(i in result.rows) {
                keys.push(result.rows[i].value);
            }

            db.allDocs({
                include_docs: true,
                keys: keys
            }).then(function (result) {
                                               
                result = result.rows.map(function(row) {
                    return row.doc;
                });
                
                deferred.resolve(result);             

            }).catch(function (err) {                
                deferred.reject(err);                
            });
        }).catch(function (err) {
            deferred.reject(err);
        });
        
    }


service.getClipsByPlayer_ = function(id) {
        return db.find({
            selector: {
                type: 'clip',
                playerID: id
            }
        });
    };
    
    service.getFavorite_ = function() {
        return db.find({
            selector: {
                type: 'clip',
                favorite: true
            }
        }); 
    };

service.setFavorite_ = function(clipID, favorite) {        
        db.get(clipID).then(function(clip) {
            clip.favorite = favorite;
            db.put(clip).then(function() {                
                setFavoriteBackup(clipID, favorite);
            });
        });
    };
    
    function setFavoriteBackup(_clipID, flag) {
        db.find({
            selector: {
                type: "favorite", 
                clipID: _clipID             
            }
        }).then(function(result) {
            var doc = result.docs[0];
            if(doc) {
                doc.favorite = flag;
                db.put(doc);
            } else {
                var id = "local";
                if ( typeof(device) !== "undefined") {
                    id = device.uuid;
                }
                var favorite = {
                    _id: id + "_" + _clipID,
                    type: "favorite",
                    clipID: _clipID,
                    user: id,
                    favorite: flag
                }
                db.put(favorite);
            }
        });
    }

.factory('ClipService', function(DBService) {
    var service = {};
    
    service.updateClipThumb = function(clipID) {
        DBService.getDoc(clipID).then(function(result){
            var clip = result;
            clip.thumb = clip.image + ".jpg";
            DBService.put(clip);
        });
    };
    return service;
})

service.init_ = function() {
        var deferred = $q.defer();    
        isDBInstalled()
        .then(retrieveAllPlayers)
        .then(function(){           
            service.getFavorite().then(function(result){
                service.setItems(result.docs);              
                syncFromRemote().then(function() {
                    deferred.resolve("DB Existed");
                }).catch(function(){
                    deferred.resolve("DB Existed, Network disconnected");
                    ErrorService.showAlert("Network disconnected");
                });                             
            });                                     
        }).catch(function(err){            
            syncFromRemote()
            .then(setupView)
            .then(setUpIndex1)            
            //.then(setUpFavorite)
            .then(markInstalled)
            .then(retrieveAllPlayers)
            .then(function(){
                service.getFavorite().then(function(result){
                    service.setItems(result.docs);
                    deferred.resolve("DB Created");                 
                });
            })
            .catch(function (err){
                console.log(err);
                ErrorService.showModal();
                ErrorService.hideSplashScreen();
                deferred.reject(err);            
            });   
        });
        return deferred.promise;        
    };


.factory('ClipService_new', function($q, $timeout) {

    var service = {};
    
    function GifWraper() {
       
        var gif = {};
        var gifiddle = {};

        return {
            loadFile: function(fileName) {
                var deferred = $q.defer();
        
                var rawFile = new XMLHttpRequest();
                rawFile.open("GET", fileName, true)
                rawFile.responseType = 'arraybuffer';

                gif = new GifFile();

                rawFile.onload = function(e) {                    
                    gif.load(this.response);        
                };            
                rawFile.send(null);

                gif.events.on('load', function() {
                    deferred.resolve(this);
                }.bind(this));

                gif.events.on('error', function(evt) {
                    deferred.reject(evt);
                }.bind(this));

                return deferred.promise;
            },
            renderView: function() {
                gifiddle = new Gifiddle();
                GifiddleControls(gifiddle);
                GifiddleAutoplay(gifiddle);
                gifiddle.setup(gif);
            },
            destroy: function() {                                                
                gifiddle.destroy();                
                gif = null;
                gifiddle = null;
            },
            stop: function() {
            	gifiddle.stop();
            }
        };
    }

    service.loadFile = function(fileName) {
        var gifWraper = new GifWraper();
        return gifWraper.loadFile(fileName);
    };

    service.renderView = function(gifWraper) {
        gifWraper.renderView();
    };

    service.destroy = function(gifWraper) {
        gifWraper.destroy();
        gifWraper = undefined;
    };
    
    service.stop = function(gifWraper) {
    	gifWraper.stop();    	
    };  
    
    service.groupClips = function(clips) {		
		var i = clips.length, returnObj = {};		
		while(i--) {
			if(returnObj[clips[i].move]){
	            returnObj[clips[i].move].push(clips[i]);
	        }else{
	            returnObj[clips[i].move] = [clips[i]];
	        }
		}
		return returnObj;			
	};
    
    return service;
})

.factory('ClipService_old', function($q, $timeout, DBService) {
    var service = {};
    
    var gif = new GifFile();
    var gifiddle = new Gifiddle();

    service.loadFile = function(fileName){    

        var deferred = $q.defer();
        
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", fileName, true)
        rawFile.responseType = 'arraybuffer';
        rawFile.onload = function(e) {     
            gif.byteLength = this.response.byteLength;    
            gif.load(this.response);        
        };            
        rawFile.send(null);

        gif.events.on('load', function() {
            deferred.resolve(gif);
        }.bind(this));

        gif.events.on('error', function(evt) {
            deferred.reject(evt);
        }.bind(this));

        return deferred.promise;
    };

    service.renderView = function(gif) {  	
        GifiddleControls(gifiddle);
        GifiddleAutoplay(gifiddle);
        gifiddle.setup(gif); 
    };

    service.destroy = function() {
    	gifiddle.destroy();        
    };
    
    service.stop = function() {        
        gifiddle.stop();    
    };

    return service;
})

.factory('ClipService_old', function($q, $timeout, DBService) {
    var service = {};
    var gif = new GifFile();
    var gifiddle = {};

    service.loadFile = function(fileName){    

        var deferred = $q.defer();
        
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", fileName, true)
        rawFile.responseType = 'arraybuffer';
        rawFile.onload = function(e) {     
            gif.byteLength = this.response.byteLength;    
            gif.load(this.response);        
        };            
        rawFile.send(null);

        gif.events.on('load', function() {
            deferred.resolve(gif);
        }.bind(this));

        gif.events.on('error', function(evt) {
            deferred.reject(evt);
        }.bind(this));

        return deferred.promise;
    };

    service.renderView = function(gif) {
        gifiddle = new Gifiddle();
        GifiddleControls(gifiddle);
        GifiddleAutoplay(gifiddle);
        gifiddle.setup(gif); 
    };

    service.destroy = function() {
        gif.destroy();
        gif.destoryEvent();
        gifiddle.destroy();
        gifiddle = {};    
    };

    return service;
})   

.factory('BlankFactory', [function(){

}])

.service('BlankService', [function(){

}])

.factory('DataService', function(){


       
    service.ini_old = function() {
        var deferred = $q.defer();    
        isDBCompleted().then(function(doc){
            deferred.resolve("OK!");                
        }).catch(function(err){            
            syncFromRemote()
            .then(setupView)
            .then(markCompleted)
            .then()
            .then(function(){
                deferred.resolve("OK!");
            })
            .catch(function (err){
                console.log(err);
                deferred.reject(err);
            });   
        });
        return deferred.promise;        
    };
    var moveList = [
        {id: 1, playerID: "player1", playerName: 'Michael Jordan', name: 'Fadeaway', desc: 'desc', image: 'images/1.gif', thumb: "images/1.jpg"},
        {id: 2, playerID: "player1", playerName: 'Michael Jordan', name: 'Crossover', desc: 'desc', image: 'images/2.gif', thumb: "images/2.jpg"},
        {id: 3, playerID: "player1", playerName: 'Michael Jordan', name: 'Double-crossover', desc: 'desc', image: 'images/3.gif', thumb: "images/3.jpg"},
        {id: 4, playerID: "player1", playerName: 'Michael Jordan', name: 'Layup', desc: 'desc', image: 'images/4.gif', thumb: "images/4.jpg"},
        {id: 5, playerID: "player1", playerName: 'Michael Jordan', name: 'Fadeaway', desc: 'desc', image: 'images/5.gif', thumb: "images/5.jpg"},
        {id: 7, playerID: "player3", playerName: 'Allen Iverson', name: 'Layup', desc: 'desc', image: 'images/7.gif', thumb: "images/7.jpg"},
        {id: 8, playerID: "player2", playerName: 'Kobe Bryant', name: 'Reverse-Dunk', desc: 'desc', image: 'images/8.gif', thumb: "images/8.jpg"},
        {id: 9, playerID: "player1", playerName: 'Michael Jordan', name: 'Stay in air', desc: 'desc', image: 'images/9.gif', thumb: "images/9.jpg"},
    ];

    var moveList = [
        {id: 1, playerID: 1, playerName: 'Michael Jordan', name: 'Fadeaway', desc: 'desc', image: 'images/1.gif', thumb: "images/1.jpg"},
        {id: 2, playerID: 1, playerName: 'Michael Jordan', name: 'Crossover', desc: 'desc', image: 'images/2.gif', thumb: "images/2.jpg"},
        {id: 3, playerID: 1, playerName: 'Michael Jordan', name: 'Double-crossover', desc: 'desc', image: 'images/3.gif', thumb: "images/3.jpg"},
        {id: 4, playerID: 1, playerName: 'Michael Jordan', name: 'Layup', desc: 'desc', image: 'images/4.gif', thumb: "images/4.jpg"},
        {id: 5, playerID: 1, playerName: 'Michael Jordan', name: 'Fadeaway', desc: 'desc', image: 'images/5.gif', thumb: "images/5.jpg"},
        {id: 7, playerID: 3, playerName: 'Allen Iverson', name: 'Layup', desc: 'desc', image: 'images/7.gif', thumb: "images/7.jpg"},
        {id: 8, playerID: 2, playerName: 'Kobe Bryant', name: 'Reverse-Dunk', desc: 'desc', image: 'images/8.gif', thumb: "images/8.jpg"},
        {id: 9, playerID: 1, playerName: 'Michael Jordan', name: 'Stay in air', desc: 'desc', image: 'images/9.gif', thumb: "images/9.jpg"},
    ];

    var playerList = [
        {id: 1, name: "Michael Jordan", desc: "The great of all time", image: "images/p1.jpg"},
        {id: 2, name: "Kobe Bryant", desc: "The best player since MJ", image: "images/p2.jpg"},
        {id: 3, name: "Allen Iverson", desc: "The fastest SG", image: "images/p3.jpg"},        
    ]

    return {
        getMoveByID: function(id) {
            var result;
            angular.forEach(moveList, function(item, key){                                
                if (item.id === id) {
                    result = item;
                }
            });
            return result;
        },
        getMoveList: function() {
            return moveList;
        },
        getPlayerList: function() {
            return playerList;
        },
        getPlayerByID: function(id) {
            var result;
            angular.forEach(playerList, function(item, key){                                
                if (item.id === id) {
                    result = item;
                }
            });
            return result;
        },
        getMoveByPlayerID: function(id) {
            var result=[];
            angular.forEach(moveList, function(item, key){                                
                if (item.playerID === id) {
                    result.push(item);
                }
            });
            return result;
        }
    }
})

.factory('DBService', function(pouchdb) {

    //var dbName = "bboy", remoteURL = "http://admin:12341234@localhost:5984/";    
    var dbName = "bboy", remoteURL = "http://121.40.197.226:4984/";
    var db = pouchdb.create(dbName), remoteDB = pouchdb.create(remoteURL + dbName);
    
    setupView();
    //cleanView();

    //var dbName = "bboy", remoteURL = "http://admin:12341234@localhost:5984/";
    //var dbName = "player", remoteURL = "http://121.40.197.226:4984/";

    //var db = pouchdb.create(dbName), remoteDB = pouchdb.create(remoteURL + dbName);

    //createDB(dbName);
    //deleteDB(dbName);
    //createDB(dbName);
    //putDataInBatch();


    /*
    var replicationHandlerTo = db.replicate.to(remoteDB + dbName, {
        live: false,
        retry: false
    });

    var replicationHandlerFrom = db.replicate.from(remoteDB + dbName, {
        live: false,
        retry: false
    });

    function mapFunction(doc) {
        if (doc.type==="clip") {
            //emit(doc.playerID);
            emit(doc.playerID, {_id : doc.playerID, name: doc.name, desc: doc.desc, image: doc.image, thumb: doc.thumb});
        }
    }

    function testMap() {
        db.query(mapFunction, {
          key          : 'player1',
          include_docs : true
        }).then(function (result) {
          alert(result);
        }).catch(function (err) {
          alert(err);
        });
    }


    function setupView() {
        var ddoc = {
            _id: '_design/index',
            views: {
                by_type: {
                    map: function(doc) {
                        if (doc.type) {
                            emit(doc.type);
                        }
                    }.toString()
                },
                by_playerID: {
                    map: function(doc) {
                        if (doc.playerID && doc.type==='clip') {
                            emit(doc.playerID);
                        }
                    }.toString()
                }
            }   
        };
        // save it
        db.put(ddoc).then(function () {
            console.log("index success");
        }).catch(function (err) {
          // some error (maybe a 409, because it already exists?)
            console.log("index error");
            if (err.status == 409) {
                //alert("index already exists");
            }
        });    
    }

    function cleanView() {
        db.viewCleanup().then(function (result) {
            // handle result
        }).catch(function (err) {
            console.log(err);
        });
    }
            
    function deleteDB(dbName) {
        
        db.destroy(dbName).then(function (response) {
            console.log(response);
        }).catch(function (err) {
            console.log(err);
        });
        db.destroy().then(function (response) {
            console.log(response);
        }).catch(function (err) {
            console.log(err);
        });
    }
    function createDB(dbName) {
        db = pouchdb.create(dbName);
    }    
    function putDataInBatch() {
        db.bulkDocs([
            {_id: "player1", name: "Michael Jordan", desc: "The great of all time", image: "images/p1.jpg"},
            {_id: "player2", name: "Kobe Bryant", desc: "The best player since MJ", image: "images/p2.jpg"},
            {_id: "player3", name: "Allen Iverson", desc: "The fastest SG", image: "images/p3.jpg"},        
        ]).then(function (response) {
            console.log(response);
        }).catch(function (err) {
            console.log(err);
        });
    }
    
	return {        
        getPlayerList: function() {
            return db.allDocs({
                include_docs: true,
            });
        },
        getAllPlayers: function() {
            return db.query('index/by_type', {key: 'player', include_docs: true});
        },
        getClipsByPlayer: function(playerID) {
            return db.query('index/by_playerID', {key: playerID, include_docs: true});
        },
        syncTo: function() {
            return db.replicate.to(remoteURL + dbName, {
                live: false,
                retry: false
            });
        },
        syncFrom: function() {
            return db.replicate.from(remoteURL + dbName, {
                live: false,
                retry: false
            });
        },
        syncFromLive: function() {
            return db.replicate.from(remoteURL + dbName, {
                live: true,
                retry: true
            });
        },
        checkChanges: function() {
            return remoteDB.changes({
                since: 'now',
                live: true,
                include_docs: false
            });
        },
        getRemotePlayList: function() {
            db.replicate.from(remoteURL + dbName, {
                live: false,
                retry: false
            }).on('complete', function () {
                console.log("sync to remote completed"); 
                return db.allDocs({
                    include_docs: true,
                });
            }).on('error', function (err) {
                console.log(err);
            });
        },
        testQuery: function() {
            return db.query('index/by_type', {key: 'player', include_docs: true});
        },
        testQuery2: function() {
            return db.query('index/by_playerID', {key: 'player2', include_docs: true});
        },
        testQuery3: function() {
            testMap();
        }
    };	
});

function find() {
        db.find({
            selector: {
                type: 'clip',
                //favorite: true
            }
        }).then(function(result ){
            console.log(result);
        }).catch(function(err) {
            console.log(err)
        }); 
    }
    
    function add() {
        return db.put(
            {
                _id: "local_clip1",
                favorite: true,
                type: "local_ref",
                localURL: "file://abc.gif",
                //clipID: "clip1"
            }
        );
    }
    
    function test1() {
        db.query(map1, {include_docs : true}).then(function (result) {
            console.log(result);
        }).catch(function (err) {
            console.log(err);
        });
    }
    
    function map1(doc) {
        if (doc.type === 'local_ref') {
            emit(doc.localURL, {_id: doc.local_clipID});
        }
    }
        
    function map2(doc) {
        if (doc.type === 'clip') {
            emit({_id : doc.clipID, image : doc.image});
        }
    }
    
    function test_() {
        db.query('index/clips_by_playerID_local', {key: "player1", include_docs: true}).then(function (result) {
            console.log(result);
        }).catch(function (err) {
            console.log(err);
        });
    }
    
    function map(doc) {
        // join artist data to albums
        if (doc.type === 'clip') {
            emit({_id : doc.clipID, favorite : doc.favorite});
        }
    }
       
    
    function test() {
        db.query(map, {include_docs : true}).then(function (result) {
            console.log(result);
        }).catch(function (err) {
            console.log(err);
        });
    }
    
    function installDB() {
        syncFromRemote()
        .then(setUpIndex1)
        .then(setUpIndex2)
        //.then(setupView)            
        //.then(setUpFavorite)
        .then(markInstalled)
        .then(function(){
            deferred.resolve("DB Created");
        })
        .catch(function (err){
            console.log(err);
            ErrorService.showModal();
            ErrorService.hideSplashScreen();
            deferred.reject(err);            
        });   
    }
    
    service.init_ = function() {
        var deferred = $q.defer();    
        syncFromRemote().then(function(doc){
            deferred.resolve("sync successful");                
        }).catch(function(err) {
            deferred.resolve("sync failed");                            
            ErrorService.showAlert("Network disconnected");                 
        });
        return deferred.promise;   
    };
    
    service.getAllPlayers_old = function() {
        return db.query('index/by_type', {key: 'player', include_docs: true});        
    };

    service.getClipsByPlayer_old = function(playerID) {
        return db.query('index/by_playerID', {key: playerID, include_docs: true});
    };

    service.setLocalClip_new = function(clipID, dest, local) {
        db.find({
            selector: {
                type: "local", 
                clipID: clipID              
            }
        }).then(function(result) {
            var doc = result.docs[0];
            if(doc) {
                doc.local = local;
                doc.image = dest;
            } else {                
                doc = {
                    _id: "local_" + clipID,
                    type: "local",
                    clipID: clipID,
                    local: local,
                    image: dest
                }               
            }
            return db.put(doc);
        });
    };

    function setupView_() {
        var ddoc = {
            _id: '_design/index',
            views: {
                clips_favorite: {
                    map: function(doc) {
                        if (doc.type === 'clip') {
                            emit(doc.playerID, {_id : doc.clipID, favorite : doc.favorite});
                        }
                    }.toString()
                }                
            }   
        };
        return db.put(ddoc);
    }
    
    function setupView_old() {
        var ddoc = {
            _id: '_design/index',
            views: {
                by_type: {
                    map: function(doc) {
                        if (doc.type) {
                            emit(doc.type);
                        }
                    }.toString()
                },
                by_playerID: {
                    map: function(doc) {
                        if (doc.playerID && doc.type==='clip') {
                            emit(doc.playerID);
                        }
                    }.toString()
                }
            }   
        };
        return db.put(ddoc);
    }
    
    db.on('error', function (err) {     
        console.log(err);
    });
    

*/
    