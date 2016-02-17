angular.module('app', ['ionic', 'app.controllers', 'app.routes', 'app.services', 'app.directives', 'pouchdb', 'ImgCache', 'ngCordova'])

.config(['$ionicConfigProvider', 'ImgCacheProvider', function($ionicConfigProvider, ImgCacheProvider) {

    // set more options at once
    ImgCacheProvider.setOptions({
    	//debug: true,
    	usePersistentCache: true,
    	useDataURI: true,
		  skipURIencoding: true
    });

    $ionicConfigProvider.views.swipeBackEnabled(false);
    $ionicConfigProvider.scrolling.jsScrolling(false);
}])

.run(['$ionicPlatform', '$cordovaStatusbar', '$rootScope', function($ionicPlatform, $cordovaStatusbar, $rootScope) {
    $ionicPlatform.ready(function() {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if(window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
        cordova.plugins.Keyboard.disableScroll(true);
      }
      if(window.StatusBar) {
        // org.apache.cordova.statusbar required
        StatusBar.styleDefault();
      }
      //$cordovaStatusbar.hide();

      //screen.lockOrientation('portrait');
    });

    $rootScope.$on('$stateChangeError', 
      function(event, toState, toParams, fromState, fromParams, error){
        console.log("stateChangeError");  
        event.preventDefault();
    });
    
    /*
    window.addEventListener("orientationchange", function(){
      console.log('Orientation changed to ' + screen.orientation);
    });
    if (window.cordova && ionic.Platform.isIOS()) {
      alert("statusTap");
      window.addEventListener("statusTap", function() {
        $ionicScrollDelegate.scrollTop(true);
      });
    }
    */
}]);

angular.module('app.routes', [])

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise('/root');

  $stateProvider

    .state('root', {
      url: '/root',      
      controller: 'RootCtrl',      
      templateUrl: 'templates/root.html'
    })

    .state('tabsController', {
      url: '/tab',
      abstract:true,
      templateUrl: 'templates/tabsController.html',      
      resolve: {
        init: ['DBService', function(DBService) {
          return DBService.init();
        }]     
      },
    })
        
    .state('tabsController.stars', {
      url: '/stars',
      resolve: {
        stars: ['DBService', 'init', function(DBService, init) {
          return DBService.dataFetcher().getStars();
        }]
      },
      views: {
        'tab1': {
          templateUrl: 'templates/stars.html',
          controller: 'StarsCtrl'
        }
      }
    })

    .state('tabsController.moves', {
      url: '/moves/:playerID, :playerName',
      resolve: {
        moves: ['$stateParams', 'DBService', function($stateParams, DBService) {
          return DBService.dataFetcher().getMovesByPlayer($stateParams.playerID);
        }]
      },
      views: {
        'tab1': {
          controller: 'MovesCtrl',
          templateUrl: 'templates/moves.html',
        }
      }
    })  

    .state('tabsController.clips', {      
      url: '/clips/:playerID, :moveName, :moveID',
      resolve: {
        clips: ['$stateParams', 'DBService', function($stateParams, DBService) {          
          //return DBService.getClipsByPlayer($stateParams.playerID, $stateParams.moveName);                    
          return DBService.pagination().clips().init($stateParams.playerID, $stateParams.moveID);
          //return DBService.pagination().favorite().init();
        }]
      },
      views: {
        'tab1': {
          controller: 'ClipsCtrl',
          templateUrl: 'templates/clips.html',
        }
      }
    })

    .state('tabsController.players', {
      url: '/players',
      /*
      resolve: {
        players: function($stateParams, DBService, init) {
          return DBService.getAllPlayers_();
        }
      },*/
      views: {
        'tab2': {
          controller: 'PlayersCtrl',
          templateUrl: 'templates/players.html',
        }
      }
    })

    .state('tabsController.tab2Moves', {
      url: '/moves2/:playerID, :playerName',
      resolve: {
        moves: ['$stateParams', 'DBService', function($stateParams, DBService) {
          return DBService.dataFetcher().getMovesByPlayer($stateParams.playerID);
        }]
      },
      views: {
        'tab2': {
          controller: 'Tab2MovesCtrl',
          templateUrl: 'templates/moves.html',
        }
      }
    })  

    .state('tabsController.tab2Clips', {
      url: '/clips2/:playerID, :moveName, :moveID',
      resolve: {
        clips: ['$stateParams', 'DBService', function($stateParams, DBService) {
          //return DBService.getClipsByPlayer($stateParams.playerID, $stateParams.moveName);                    
          return DBService.pagination().clips().init($stateParams.playerID, $stateParams.moveID);
          //return DBService.pagination().favorite().init();
        }]
      },
      views: {
        'tab2': {
          controller: 'ClipsCtrl',
          templateUrl: 'templates/clips.html',
        }
      }
    })  

    .state('tabsController.favorite', {
      url: '/favorite',      
      /*
      cache: false,      
      resolve: {
        clips: function(DBService) {
          return DBService.returnFavorite().init();
        }
      },
      */
      views: {
        'tab4': {
          controller: 'FavorateCtrl',
          templateUrl: 'templates/favorite.html',
        }
      }
    })
}]);

angular.module('app.services', [])


.factory('DBService', ['$q', '$timeout', 'pouchdb', 'ErrorService', 'FileCacheService', function($q, $timeout, pouchdb, ErrorService, FileCacheService) {

    var service = {};    

    var string = {
        dbName: "cliplay",
        remoteURL: dbString? dbString: "http://admin:12341234@localhost:5984/",        
        dbAdapter: "websql",
        network_err: {
            title: "无法获取最新数据",
            desc: "没有可使用的互联网连接。"
        }
    }
    
    var db = null;

    var isPad = (typeof device !== 'undefined' && device.model.indexOf("iPad") !== -1)? true: false;

    //db.info().then(console.log.bind(console));
    //deleteDB();

    service.list = function() {
        return list;
    };      

    service.dataFetcher = function() {
        return dataFetcher;
    }; 

    service.pagination = function() {
        return pagination;
    }; 

    service.remoteDB = function() {
        return remoteDB;
    };

    var list = {
        
        favoriteList: [],
        playerList: [],
        moveList: [],
        clipList: [],

        setClipList: function(_list) {                 
            copyList(this.clipList, _list);
        },

        resetClipList: function() {     
            this.clipList.length = 0;                 
        },

        getClipList: function(){
            return this.clipList;
        },

        setMoveList: function(_list) {                                                             
            this.moveList.length = 0;            
            copyList(this.moveList, _list);
        },

        getMoveList: function() {
            return this.moveList;
        },
        
        setPlayerList: function(_list) {                                                     
            this.playerList.length = 0
            copyList(this.playerList, _list);
        },

        getPlayerList: function() {
            return this.playerList;
        },

        setFavoriteList: function(_list) {                             
            copyList(this.favoriteList, _list);
        },

        resetFavoriteList: function() {     
            this.favoriteList.length = 0;                 
        },

        getFavoriteList: function(){
            return this.favoriteList;
        },

        addFavoriteToList: function(clipID, thumb) {

            for(var i=0;i<this.favoriteList.length;i++) {
                if(this.favoriteList[i]._id == clipID) {                
                    return;
                }
            }
            var that = this;
            getDoc(clipID).then(function(result){
                result.thumb = thumb;
                result.favorite = true;                
                that.favoriteList.unshift(result);
            });     
        },

        removeFavoriteFromList: function(clipID) {         
            for(var i=0;i<this.favoriteList.length;i++) {
                if(this.favoriteList[i]._id == clipID) {
                    this.favoriteList.splice(i,1);
                    return;
                }
            }
        },

        getMoves: function() {
            return db.find({
                selector: {type: 'move'}
            });        
        },

        getAllPlayers: function() {       
            return retrieveAllPlayers();
        },
    };

    var dataFetcher = {
        getStars: function() {
            return db.find({
                selector: {type: 'player', star: true}
            });        
        },

        getMoves: function() {
            var deferred = $q.defer();

            db.find({
                selector: {type: 'move'},
                fields: ['_id', 'move_name', 'image']
            }).then(function(result){
                list.setMoveList(result.docs);
                deferred.resolve("Moves retrieved");
            }).catch(function(){
                deferred.reject("Moves not retrieved");
            });

            return deferred.promise;
        },

        getMovesByPlayer: function(playerID) {
            var deferred = $q.defer();
            
            db.query('views/moves', {startkey: [playerID], endkey: [playerID, {}], reduce: true, group: true}).then(function (result) {
                          
                var moves = [];

                for(i in result.rows) {                                
                    moves.push({_id: result.rows[i].key[4], name: result.rows[i].key[1], image: result.rows[i].key[2], desc: result.rows[i].key[3], clipQty: result.rows[i].value});
                }
                deferred.resolve(moves);

            }).catch(function (err) {
                deferred.reject(err);
            }); 

            return deferred.promise;       
        },
    };      

    var pagination = {       

        clips: function() {
            return this.clipsPg;
        },

        favorite: function() {
            return this.favoritePg;
        },

        clipsPg: {
            options: {},
            end: {noMore: true},
            limit: isPad? 12: 7,    
            descending: true,           
            init: function(playerID, moveID) {
                this.options = {descending : this.descending, limit : this.limit, endkey: [playerID, moveID], startkey: [playerID, moveID, {}], reduce: true, group: true};                
                list.resetClipList();
                this.end.noMore = true;
                return this.getClips();
            },
            
            more: function(callback) {            
                this.getClips()
                .catch(function(){
                    ErrorService.showAlert('无法获取数据');
                }).finally(function(){
                    if(callback) callback();
                });
            },
            
            hasNoMore: function() {                
                return this.end;
            },
           
            getClips: function() {

                var deferred = $q.defer();

                var that = this;

                var _options = that.options;
             
                db.query('views/clips', _options).then(function (result) {

                    if (result && result.rows.length > 0) {

                        _options.startkey = result.rows[result.rows.length - 1].key;
                        //_options.skip = 1;                                              
                                                        
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

                            if(result.length < that.limit) {
                                that.end.noMore = true;
                            }else{
                                that.end.noMore = false;
                            }

                            if(result.length == that.limit) {
                                result.splice(-1,1);
                            }                            
                            
                            list.setClipList(result);
                            deferred.resolve("More data fetched");
                        }).catch(function (err) {                
                            deferred.reject(err);                
                        });
                    }else{                       
                        that.end.noMore = true;            
                        deferred.resolve("No more data");             
                    }
                }).catch(function (err) {
                    deferred.reject(err);
                });

                return deferred.promise;
            },
        },

        favoritePg: {
            options: {},
            end: {
                noMore: true
            },
            limit: isPad? 12: 7,
            view: "",
            descending: true,
            
            init: function() {
                this.view = "favorite";
                this.options = {descending : this.descending, limit : this.limit, include_docs: true, endkey: [true], startkey: [true, {}]};    
                this.end.noMore = true;
                list.resetFavoriteList();
                return this.getFavorite();
            },
            search: function(search, callback) {

                if(!search) search = {};

                list.resetFavoriteList();

                if(search.player && search.move) {
                    this.view = "favorite_player_move";                   
                    this.options = {descending : this.descending, limit : this.limit, include_docs: true, endkey: [true, search.player, search.move], startkey: [true, search.player, search.move, {}]};                
                }else if(search.player) {
                    this.view = "favorite_player";
                    this.options = {descending : this.descending, limit : this.limit, include_docs: true, endkey: [true, search.player], startkey: [true, search.player, {}]};                
                }else if(search.move) {
                    this.view = "favorite_move";
                    this.options = {descending : this.descending, limit : this.limit, include_docs: true, endkey: [true, search.move], startkey: [true, search.move, {}]};
                }else {
                    this.view = "favorite";
                    this.options = {descending : this.descending, limit : this.limit, include_docs: true, endkey: [true], startkey: [true, {}]};    
                }

                this.end.noMore = true;

                this.more(callback);                             
            },            
            more: function(callback) {              
                this.getFavorite()
                .catch(function() {
                    ErrorService.showAlert('无法获取数据');
                }).finally(function() {
                    if(callback) callback();
                });
            },
            hasNoMore: function() {
                return this.end;
            },
            needLoad: function() {              
                if(!this.hasNoMore().noMore && list.getFavoriteList().length < this.limit) {
                    return true;
                }else {
                    return false;    
                }                
            },
            getFavorite: function() {

                var deferred = $q.defer();

                var that = this;

                var _options = that.options;

                db.query('views/' + that.view, _options).then(function (result) {

                    if (result && result.rows.length > 0) {

                        _options.startkey = result.rows[result.rows.length - 1].key;
                        //_options.skip = 1;

                        if(result.rows.length < that.limit) {
                            that.end.noMore = true;
                        }else{
                            that.end.noMore = false;
                        }

                        if(result.rows.length == that.limit) {
                            result.rows.splice(-1,1);
                        }   
                                                                               
                        result = result.rows.map(function(row) {
                        
                            return {
                                _id: row.doc._id,
                                name: row.doc.name,
                                desc: row.doc.desc,
                                image: row.doc.image,
                                thumb: row.value.thumb,
                                favorite: row.key[0],
                                local: row.id,
                                player: row.doc.player,
                                move: row.doc.move,
                                timestamp: row.value.timestamp
                            };
                        });
                        
                        list.setFavoriteList(result);
                        deferred.resolve("Favorite retrieved");                   

                    }else{
                        that.end.noMore = true;
                        deferred.resolve("No more data");                                           
                    }

                }).catch(function (err) {                
                    deferred.reject(err);                
                });

                return deferred.promise;
            }  
        }
    };

    var remoteDB = {
        syncRemote: function(callback) {
            syncFromRemote().then(function(result) {
                if(result.docs_written > 0) {
                    retrieveAllPlayers();
                    retrieveAllMoves();
                }                
            }).catch(function(err) {
                ErrorService.showAlert('无法同步数据', '请确认互联网连接。');
            }).finally(function(){
                if(callback) callback();
            });
        },    

        change: function() {
            db.changes({
                limit: 10,
                since: 73
            }).then(function (result) {
                console.log(result);
            }).catch(function (err) {
                console.log(err);
            }); 
        }   
    };

    service.put = function(doc) {
        return db.put(doc);
    };

    var clipUpdator = {
        localClipID: "",
        post_fix: ".jpg",
        updateFavorite: function() {
            
        },

        updateThumb: function() {

        },

        updateBoth: function() {
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
                    var date = new Date();
                    local.thumb = clip.image + post_fix;
                    local.favorite = favorite;                
                    local.timestamp = "" + date.getTime();
                    db.put(local);
                }).catch(function(){
                    var date = new Date();
                    var local = {
                        _id: clip.local,
                        type: "local",
                        favorite: favorite,
                        thumb: clip.image + post_fix,
                        clip: clipID,
                        player: clip.player,
                        move: clip.move,
                        timestamp: "" + date.getTime()            
                    }
                    db.put(local);
                });  

                if(favorite) {
                    list.addFavoriteToList(clipID, clip.image + post_fix);
                } else {
                    list.removeFavoriteFromList(clipID);
                }                                  
            });

            updateList(curClipList);    
        },

        updateClipList: function(list, flag1, flag2) {
            if(list && list.length > 0) {
                for(i in list) {
                    if(list[i].local == localClipID) {                                            
                        list[i].thumb = list[i].image + post_fix;
                        list[i].favorite = favorite;
                        return;
                    }
                }        
            }  
        }
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
                var date = new Date();
                local.thumb = clip.image + post_fix;
                local.favorite = favorite;                
                local.timestamp = "" + date.getTime();
                db.put(local);
            }).catch(function(){
                var date = new Date();
                var local = {
                    _id: clip.local,
                    type: "local",
                    favorite: favorite,
                    thumb: clip.image + post_fix,
                    clip: clipID,
                    player: clip.player,
                    move: clip.move,
                    timestamp: "" + date.getTime()            
                }
                db.put(local);
            });  

            if(favorite) {
                list.addFavoriteToList(clipID, clip.image + post_fix);
            } else {
                list.removeFavoriteFromList(clipID);
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
            var date = new Date();
            local.timestamp = "" + date.getTime();
            db.put(local);      
            if(flag) {
                list.addFavoriteToList(clipID, local.thumb);
            } else {
                list.removeFavoriteFromList(clipID);
            }          
        }).catch(function(){

            db.get(clipID).then(function(clip) {

                var date = new Date();
                
                var local = {
                    _id: localID,
                    type: "local",
                    favorite: flag,
                    thumb: "",
                    clip: clipID,
                    player: clip.player,
                    move: clip.move,
                    timestamp: "" + date.getTime()
                }
                db.put(local);
                list.addFavoriteToList(clipID, "");
            });
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
                    clip: clipID,
                    player: clip.player,
                    move: clip.move            
                }
                db.put(local);
            });         
        });    

        updateList(list.getFavoriteList());
        updateList(curClipList);
        //updateList(newsList);            
    };

    service.init = function() {        
        var deferred = $q.defer();
        
        createDB();
        
        isDBInstalled()
        .then(function() {
            syncFromRemote().then(function(){                                           
                retrieveLists()
                .then(function() {
                    deferred.resolve("DB Existed");
                }).catch(function(err){                    
                    initFail();
                    deferred.reject("Err in getting init data: " + err);                     
                });
            }).catch(function(){                                   
                retrieveLists()
                .then(function() {
                    deferred.resolve("DB Existed");
                    ErrorService.showAlert(string.network_err.title, string.network_err.desc);
                }).catch(function(err){                    
                    initFail();
                    deferred.reject("Err in getting init data: " + err);                     
                });
            });            
        }).catch(function() {
            ErrorService.showProgress();
            cleanDB()
            .then(syncFromRemote)              
            //.then(setupIndexes)
            .then(setUpIndex)
            .then(setupView)
            .then(retrieveLists)           
            .then(verifyView)
            .then(loadImgs)
            .then(markInstalled)    
            .then(function() {
                deferred.resolve("DB Created");
            }).catch(function (err){                
                console.log("install err, details = " + err);
                initFail();
                deferred.reject("Err in creating DB" + err);                            
            });
        });
      
        return deferred.promise;        
    };

    function setupIndexes() {
        var list = [];
        list.push(setupView());
        list.push(setUpIndex());
        return executePromises(list);
    }

    function retrieveLists() {
        //console.log("Ready for retrieveLists");
        var list = [];
        list.push(retrieveAllPlayers());
        list.push(retrieveAllMoves());
        list.push(retrieveFavorites());
        return executePromises(list);
    }    

    function loadImgs() {
        var list = [];
        list.push(loadMoveImg());
        list.push(loadPlayerImg());        
        return executePromises(list);
    }

    function loadMoveImg() {
        //console.log("ready for loadMoveImg");
        return FileCacheService.cacheFiles(list.moveList);
    }

    function loadPlayerImg() {
        //console.log("ready for loadPlayerImg");
        return FileCacheService.cacheAvatar(list.playerList);
    }

    function executePromises(list) {
        var promises = [];

        angular.forEach(list , function(item) {            
            promises.push(item);
        });

        return $q.all(promises);
    }
    
    function verifyView() {
        //console.log("ready for verifyView");
        var deferred = $q.defer();      

        var playerID = list.getPlayerList()[0]._id;    

        dataFetcher.getMovesByPlayer(playerID).then(function(result){
            var moveID = result[0]._id;
            pagination.clips().init(playerID, moveID).then(function(result) {
                var search = {
                    player: playerID,
                    move: moveID
                };
                pagination.favorite().init(search).then(function(result) {
                    //console.log("Index verified");
                    deferred.resolve("Index verified");
                }).catch(function(err) {
                    deferred.reject(err);
                });                        
            }).catch(function(err) {
                deferred.reject(err);
            });
        }).catch(function(err) {
            deferred.reject(err);
        });
        return deferred.promise;        
    }

    function initFail() {
        ErrorService.showAlert("安装遇到小问题", "请确认互联网连接后重试。", true);         
    }

    function retrieveFavorites() {
        //console.log("ready for retrieveFavorites");
        return pagination.favorite().init();
    }

    function retrieveAllMoves() {
        //console.log("ready for retrieveAllMoves");
        return dataFetcher.getMoves();
    }

    function retrieveAllPlayers() {
        //console.log("ready for retrieveAllPlayers");
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

                list.setPlayerList(result);

                deferred.resolve("All players retrieved");

            }).catch(function (err) {
                deferred.reject(err);
            });

        }).catch(function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function copyList(desc, source) {
        desc.push.apply(desc, source);
    }

    function getDoc(id) {
        return db.get(id);
    }

    function deleteDB() {      
        db.destroy().then(function (response) {
            console.log(response);
        }).catch(function (err) {
            console.log(err);
        });
    }

    function cleanDB() {      
        var deferred = $q.defer();
        db.destroy().then(function() {
            createDB();
            $timeout(function(){
                deferred.resolve("DB recreated");
            },10);         
        }).catch(function() {
            deferred.reject("DB destroy err");
        });
        return deferred.promise;
    }

    function createDB() {
        if(db) {
            db = null;
        }
        db = pouchdb.create(string.dbName, {size: 40, adapter: string.dbAdapter, auto_compaction: true});
    }

    function syncFromRemote() {
        //console.log("ready for syncFromRemote");
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
                                emit([player, doc.move_name, doc.image, doc.desc, doc._id], 1);
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
                                emit([player, doc._id, clip], clip);
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
                            emit([doc.favorite, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
                        }
                    }.toString()
                },
                favorite_player_move: {
                    map: function(doc) { 
                        if (doc.type === 'local') {
                            emit([doc.favorite, doc.player, doc.move, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
                        }
                    }.toString()
                },
                favorite_player: {
                    map: function(doc) { 
                        if (doc.type === 'local') {
                            emit([doc.favorite, doc.player, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
                        }
                    }.toString()
                },
                favorite_move: {
                    map: function(doc) { 
                        if (doc.type === 'local') {
                            emit([doc.favorite, doc.move, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
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
        //console.log("Install finished");
        return db.put({
            _id: 'DBInstalled',
            status: 'completed'
        });
    }

    function isDBInstalled() {
        return db.get('DBInstalled');
    }

    return service;    
}])

.factory('ImgCacheService', ['$q', 'ImgCache', function($q, ImgCache) {

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
}])

.factory('FileCacheService', ['$q', 'ImgCache', function($q, ImgCache) {

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

    service.cacheFiles = function(list){

        var promises = [];

        angular.forEach(list , function(item) {
        
            promises.push(cacheFile(item.image));

        });

        return $q.all(promises);
    };

    service.cacheAvatar = function(list){

        var promises = [];

        angular.forEach(list , function(item) {

            promises.push(cacheFile(item.avatar));

            if(item.star) {
                promises.push(cacheFile(item.image));
            }
        });

        return $q.all(promises);
    };

    function cacheFile(src) {

        var deferred = $q.defer();
               
        ImgCache.$promise.then(function() {

            ImgCache.cacheFile(
                src, 
                function() {
                    deferred.resolve("file downloaded");
                },
                function() {
                    deferred.resolve("file not downloaded");                    
                }
            );
        });

        return deferred.promise;
    }

    return service;
}])

.factory('NativeService', function() {
    
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

    service.showMessage = function(title, desc, retry) {        
        var _retry = "false";
        if(retry) {
            _retry = "true";
        }        
        cordova.exec(win, fail, "MyHybridPlugin", "showMessage", [title, desc, _retry]);
    }
    
    return service;
})

.factory('ErrorService', ['$rootScope', '$cordovaSplashscreen', '$ionicPopup', '$ionicLoading', '$timeout', 'NativeService', function($rootScope, $cordovaSplashscreen, $ionicPopup, $ionicLoading, $timeout, NativeService) {
                         
    var service = {};            

    service.showSplashScreen = function() {
        $cordovaSplashscreen.show();
    };

    service.hideSplashScreen = function() {
        $timeout(function() {
            $cordovaSplashscreen.hide();
        }, 500);   
    };

    service.showProgress = function() {        
        $timeout(function() {
            $cordovaSplashscreen.addProgress();
        }, 10);  
    };

    service.showAlert = function(title, desc, retry) {
        
        NativeService.showMessage(title, desc? desc: "请稍后重试", retry);
        // var alertPopup = $ionicPopup.alert({
        //     title: title
        // });

        // alertPopup.then(function(res) {
        // });                
    };

    service.showDownLoader = function() {
        $ionicLoading.show({     
            template: '<span>Downloading...</span><progress max="1" id="progress"></progress>',
            hideOnStateChange: true
        });
    };
    
    service.showLoader = function() {
        $ionicLoading.show({
            template: '<ion-spinner icon="crescent" class="spinner-assertive"></ion-spinner>',
            hideOnStateChange: false
        });
    };

    service.hideLoader = function(alert) {
        $ionicLoading.hide();
        if (alert) {
            service.showAlert(alert);
        }       
    };

    return service;
}]);

angular.module('app.controllers', [])

.controller('RootCtrl', ['$scope', '$state', '$timeout', function($scope, $state, $timeout) {
	
	(function() {		
		cacheViews();
	}());	  

	$scope.retry = function() {
  	cacheViews();  	
  };

  function cacheViews() {  	
		$state.go("tabsController.favorite").then(function(result) {
  		$timeout(function() {
		  	$state.go("tabsController.players").then(function(result) {
					$timeout(function() {
						$state.go("tabsController.stars");
					});		
				});
			});		
		});
  }
}])

.controller('StarsCtrl', ['$scope', '$ionicSlideBoxDelegate', '$state', 'ErrorService', 'stars', function($scope, $ionicSlideBoxDelegate, $state, ErrorService, stars) {
  	
	(function() {
		renderPlayList(stars);		
	}());	  

 	function renderPlayList(results) {
 		$scope.stars = results.docs;
		$ionicSlideBoxDelegate.update();
		$ionicSlideBoxDelegate.slide(0);					
		ErrorService.hideSplashScreen();
 	}

 	$scope.showMoves = function(playerID, playerName) {
		$state.go("tabsController.moves", {playerID: playerID, playerName: playerName});
	};	
}])
   
.controller('ClipsCtrl', ['$scope', '$stateParams', '$ionicListDelegate', 'DBService', 'NativeService' ,function($scope, $stateParams, $ionicListDelegate, DBService, NativeService) {
	
	$scope.clips = DBService.list().getClipList();	
	$scope.noMoreItemsAvailable = DBService.pagination().clips().hasNoMore();

	$scope.listCanSwipe = true;	
	$scope.playerName = $stateParams.playerName;
	$scope.moveName = $stateParams.moveName;	
	$scope.playingClipIndex = "";
	
	$scope.loadMore = function() {
		DBService.pagination().clips().more(function(){
			$scope.$broadcast('scroll.infiniteScrollComplete');
		});
  };

	$scope.play = function(index) {		
		$scope.playingClipIndex = index;
		NativeService.playAnimation($scope.clips[index].image, $scope.clips[index].favorite, true);
	};

	$scope.updateFavorite = function(index) {
		$ionicListDelegate.closeOptionButtons();
		setFavorite(index);
	};

	$scope.updateFavoriteFromNative = function() {
		setFavorite($scope.playingClipIndex);
	};

	$scope.updateThumbFromNative = function(load) {
		if(load === 'download' || !$scope.clips[$scope.playingClipIndex].thumb) {
			DBService.updateThumb($scope.clips[$scope.playingClipIndex]._id, $scope.clips);			
		}
	};

	$scope.updateBothFromNative = function(load) {
		if(load === 'download' || !$scope.clips[$scope.playingClipIndex].thumb) {
			DBService.updateBoth($scope.clips[$scope.playingClipIndex]._id, !$scope.clips[$scope.playingClipIndex].favorite, $scope.clips);	
		}else {
			setFavorite($scope.playingClipIndex);
		}		
	};

	function setFavorite(index) {
		DBService.updateFavorite($scope.clips[index]._id, $scope.clips[index].local, !$scope.clips[index].favorite);
		$scope.clips[index].favorite = !$scope.clips[index].favorite;
	}
}])

.controller('FavorateCtrl', ['$scope', '$state', '$ionicScrollDelegate', '$ionicListDelegate', '$ionicPopover', 'ErrorService', 'DBService', 'NativeService', function($scope, $state, $ionicScrollDelegate, $ionicListDelegate, $ionicPopover, ErrorService, DBService, NativeService) {
	
 	$scope.listCanSwipe = true;
 	$scope.playingClipIndex = "";
	$scope.clips = DBService.list().getFavoriteList();	
	$scope.noMoreItemsAvailable = DBService.pagination().favorite().hasNoMore();

	$scope.data = {  	
    players: DBService.list().getPlayerList(),
    moves: DBService.list().getMoveList()
  };
 
  $scope.search = {
  	selected_player: "",
  	selected_move: "",    
    by_player: "",
    by_move: "",
  };

  $ionicPopover.fromTemplateUrl('templates/popover.html', {
    scope: $scope
  }).then(function(popover) {
    $scope.popover = popover;
  });
  
  $scope.openPopover = function($event) {
  	$scope.search.by_player = $scope.search.selected_player;
  	$scope.search.by_move = $scope.search.selected_move;
    $scope.popover.show($event);
  };

  $scope.filter = function() {

  	ErrorService.showLoader();

  	$ionicScrollDelegate.scrollTop();

  	var search = {
  		player: $scope.search.by_player,
  		move: $scope.search.by_move
  	};

  	$scope.search.selected_player = $scope.search.by_player;
  	$scope.search.selected_move = $scope.search.by_move;

  	DBService.pagination().favorite().search(search, function() {		
			ErrorService.hideLoader();
		});

    $scope.popover.hide();
  };

	$scope.loadMore = function() { 
		DBService.pagination().favorite().more(function() {
			$scope.$broadcast('scroll.infiniteScrollComplete');
		});
  };
	
	$scope.play = function(index) {		
		$scope.playingClipIndex = index;
		NativeService.playAnimation($scope.clips[index].image, $scope.clips[index].favorite, false);
	};

	$scope.removeFavorite = function(index) {	
		$ionicListDelegate.closeOptionButtons();		
		setFavorite(index);
		if(DBService.pagination().favorite().needLoad()) {
			$scope.loadMore();
		}		
	};
	
	$scope.updateThumbFromNative = function(load) {	
		if(load === 'download' || !$scope.clips[$scope.playingClipIndex].thumb) {		
			DBService.updateThumb($scope.clips[$scope.playingClipIndex]._id, null);	
		}
	};

	function setFavorite(index) {
		DBService.updateFavorite($scope.clips[index]._id, $scope.clips[index].local, false);		
	}
}])

.controller('PlayersCtrl', ['$scope', '$state', 'DBService', function($scope, $state, DBService) {
	
	$scope.players = DBService.list().getPlayerList();

	$scope.doRefresh = function() {		
		DBService.remoteDB().syncRemote(function() {
			$scope.$broadcast('scroll.refreshComplete');
		});
	};	
		
	$scope.showMoves = function(playerID, playerName) {
		$state.go("tabsController.tab2Moves", {playerID: playerID, playerName: playerName});
	};
}])

.controller('MovesCtrl', ['$scope', '$state', '$stateParams', 'moves', function($scope, $state, $stateParams, moves) {

	$scope.moves = moves;
	$scope.playerName = $stateParams.playerName;

	$scope.showClips = function(moveName, moveID) {
		$state.go("tabsController.clips", {playerID: $stateParams.playerID, moveName: moveName, moveID: moveID});
	};

}])

.controller('Tab2MovesCtrl', ['$scope', '$state', '$stateParams', 'moves', function($scope, $state, $stateParams, moves) {
	
	$scope.moves = moves;
	$scope.playerName = $stateParams.playerName;

	$scope.showClips = function(moveName, moveID) {
		$state.go("tabsController.tab2Clips", {playerID: $stateParams.playerID, moveName: moveName, moveID: moveID});
	};

}]);

angular.module('app.directives', [])

.directive('blankDirective', [function(){

}])

.directive('backImg', function(){
    return function(scope, element, attrs){
        var url = attrs.backImg;
        element.css({
            'background-image': 'url(' + url +')'            
        });
    };
})

.directive('hideTabs', ['$rootScope', function($rootScope) {
    return {
        restrict: 'A',
        link: function(scope, element, attributes) {

            scope.$on('$ionicView.beforeEnter', function() {
                scope.$watch(attributes.hideTabs, function(value){
                    $rootScope.hideTabs = value;
                });
            });

            scope.$on('$ionicView.beforeLeave', function() {
                $rootScope.hideTabs = false;
            });
        }
    };
}]);

var dbString = "";

function startForIOS() {
    cordova.exec(
        function(r){
            dbString = r;
            angular.bootstrap(document.body, ['app']);            
        }, 
        function(e){
            console.log(e);
        }, 
        "MyHybridPlugin", "dbString"
    );
}

function test() {
    //angular.injector(['ng', 'app.services']).get("DBService").test();
    var handler = angular.element(document.getElementById('ClipsScopeID')).injector().get('DBService');
    var list = handler.list().getPlayerList();
}

function updateClip(favorite, load, from) {
    
    if(from === "clip") {
        var scope = angular.element(document.getElementById('ClipsScopeID')).scope();
            
        if(load !== "") {
            if(favorite === 'favorite') {
                scope.updateBothFromNative(load);                
            }else{
                scope.updateThumbFromNative(load);
            }
        }else if(favorite === 'favorite') {
            scope.updateFavoriteFromNative();
        }

    } else if(load !== "") {
        var scope = angular.element(document.getElementById('FavoriteScopeID')).scope();
        scope.updateThumbFromNative(load);
    }
}

function retryInstall() {
    var scope = angular.element(document.getElementById('RootScopeID')).scope();
    scope.retry();
}

angular.element(document).ready(function () {
    if (window.cordova) {
        console.log("Running in Cordova, will bootstrap AngularJS once 'deviceready' event fires.");
        
        document.addEventListener('deviceready', function () {
            console.log("Deviceready event has fired, bootstrapping AngularJS.");
            startForIOS();
        }, false);
    } else {
        console.log("Running in browser, bootstrapping AngularJS now.");        
        angular.bootstrap(document.body, ['app']);
    }
});