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
          return DBService.pagination().clips().init($stateParams.playerID, $stateParams.moveID);
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
          return DBService.pagination().clips().init($stateParams.playerID, $stateParams.moveID);
        }]
      },
      views: {
        'tab2': {
          controller: 'ClipsCtrl',
          templateUrl: 'templates/clips.html',
        }
      }
    })  

    .state('tabsController.news', {
      url: '/news',      
      views: {
        'tab3': {
          controller: 'NewsCtrl',
          templateUrl: 'templates/news.html',
        }
      }
    })

    .state('tabsController.plays', {
      url: '/plays',
      views: {
        'tab4': {
          controller: 'PlaysCtrl',
          templateUrl: 'templates/plays.html',
        }
      }
    })

    .state('tabsController.play', {
      url: '/play/:catID, :catName',
      resolve: {      
        plays: ['$stateParams', 'DBService', function($stateParams, DBService) {
          return DBService.getPlaysByCat($stateParams.catID);
        }]
      },
      views: {
        'tab4': {
          controller: 'PlayCtrl',
          templateUrl: 'templates/play.html',
        }
      }
    })

    .state('tabsController.skills', {
      url: '/skills',     
      views: {
        'tab5': {
          controller: 'SkillsCtrl',
          templateUrl: 'templates/skills.html',
        }
      }
    })

    .state('tabsController.skill', {
      url: '/skill/:catID, :catName',
      resolve: {      
        plays: ['$stateParams', 'DBService', function($stateParams, DBService) {
          return DBService.getSkillsByCat($stateParams.catID);
        }]
      },
      views: {
        'tab5': {
          controller: 'SkillCtrl',
          templateUrl: 'templates/skill.html',
        }
      }
    })

    // .state('tabsController.favorite', {
    //   url: '/favorite',      
    //   views: {
    //     'tab4': {
    //       controller: 'FavorateCtrl',
    //       templateUrl: 'templates/favorite.html',
    //     }
    //   }
    // })
}]);

angular.module('app.services', [])


.factory('DBService', ['$q', '$timeout', 'pouchdb', 'ErrorService', 'FileCacheService', 'NativeService', function($q, $timeout, pouchdb, ErrorService, FileCacheService, NativeService) {

    var service = {};    

    var string = {       
        dbName: dbString? "cliplay_prod": "cliplay_dev_3_29",
        remoteURL: dbString? dbString.split(",")[0]: "http://admin:12341234@localhost:5984/",
        file: dbString? dbString.split(",")[1]: "db.txt",
        dbAdapter: "websql",
        installFail: false
    }
    
    var db = null;

    var isPad = (typeof device !== 'undefined' && device.model.indexOf("iPad") !== -1)? true: false;

    var play = {
        postInfo: false,
        playInfo: false,            
        playPost: function(doc) {  
            var data = [!this.postInfo, JSON.stringify(doc)];          
            if(doc.image.length > 1 && !this.postInfo) {
                this.postInfo = true;
                db.get("_local/DBInstalled").then(function(doc){
                    doc.postInfo = true;
                    return db.put(doc);
                });         
            }
            NativeService.play(data);         
        },   
        playPost_: function(list) {
            var _list = list.slice();            
            _list.unshift(!this.postInfo);
            if(list.length > 1 && !this.postInfo) {
                this.postInfo = true;
                db.get("_local/DBInstalled").then(function(doc){
                    doc.postInfo = true;
                    return db.put(doc);
                });         
            }            
            NativeService.playAnimation(_list);           
        },
        playPlay: function(list) {
            var _list = list.slice();   
            _list.unshift(!this.playInfo);         
            if(list.length > 1 && !this.playInfo) {
                this.playInfo = true;
                db.get("_local/DBInstalled").then(function(doc){
                    doc.playInfo = true;
                    return db.put(doc);
                });         
            }            
            NativeService.playPlay(_list);   
        },
        playArticle: function(doc) {                    
            var data = [!this.postInfo, JSON.stringify(doc)];
            if(doc.image.length > 1 && !this.postInfo) {
                this.postInfo = true;
                db.get("_local/DBInstalled").then(function(doc){
                    doc.postInfo = true;
                    return db.put(doc);
                });         
            }
            NativeService.playArticle(data);
        }     
    };

    service.playClipsByMove = function(playerID, moveID) {
        var id = "post_" + playerID + "_" + moveID;
        db.get(id).then(function(result) {            
            if(!result.image instanceof Array) {
                console.log("Image list not retrieved");    
                return;
            }            
            play.playPost(result);
        }).catch(function(e){
            console.log(e);
        });      
    };

    service.getGaleryByPlayer = function(playerID) {            

        db.get("galery_" + playerID).then(function (result) {                                                               
            play.playPost(result);
        }).catch(function (err) {
            console.log(e);
        });
    };

    service.getSkillsByCat = function(catID) {

        var prefix = "skill_";

        var deferred = $q.defer();

        db.allDocs({
            include_docs: true,
            startkey: prefix + catID,
            endkey: prefix + catID + "\uffff"            
        }).then(function (result) {
                                
            result = result.rows.map(function(row) {                   
                return row.doc;
            });                
            deferred.resolve(result);

        }).catch(function (err) {
            deferred.reject(err);
        });
        
        return deferred.promise;
    };

    service.getPlaysByCat = function(catID) {

        var prefix = "plays_";

        var deferred = $q.defer();

        db.allDocs({
            include_docs: true,
            startkey: prefix + catID,
            endkey: prefix + catID + "\uffff"            
        }).then(function (result) {
                                
            result = result.rows.map(function(row) {                   
                return row.doc;
            });                
            deferred.resolve(result);

        }).catch(function (err) {
            deferred.reject(err);
        });
        
        return deferred.promise;
    };
	
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

    service.play = function() {
        return play;
    };

    var list = {
        
        favoriteList: [],
        playerList: [],
        moveList: [],
        clipList: [],
        starList: [],
        newsList: [],
        playsList: [],
        skillsList: [],

        getPlaysList: function() {
            return this.playsList;
        },

        setPlaysList: function(_list) {
            this.playsList.length = 0
            copyList(this.playsList, _list);
        },

        getSkillsList: function() {
            return this.skillsList;
        },

        setSkillsList: function(_list) {
            this.skillsList.length = 0
            copyList(this.skillsList, _list);
        },

        getStarList: function(){
            return this.starList;
        },      

        setClipList: function(_list) {                 
            copyList(this.clipList, _list);
        },

        resetClipList: function() {     
            this.clipList.length = 0;                 
        },        

        getClipList: function(){
            return this.clipList;
        },

        setNewsList: function(_list) {                 
            copyList(this.newsList, _list);
        },

        addNewsList: function(_list) {                 
            copyListToFront(this.newsList, _list);
        },        

        resetNewsList: function() {     
            this.newsList.length = 0;                 
        },

        getNewsList: function(){
            return this.newsList;
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

        getAllPlayers: function() {       
            return retrieveAllPlayers();
        },
    };

    var dataFetcher = {        

        getMoves: function() {

            // console.log("ready retrieveAllMoves");

            var deferred = $q.defer();

            db.allDocs({
                include_docs: true,
                startkey: "move",
                endkey: "move\uffff"            
            }).then(function (result) {
                                    
                result = result.rows.map(function(row) {                   
                    return row.doc;
                });

                list.setMoveList(result);

                // console.log("finished retrieveAllMoves");

                deferred.resolve("All moves retrieved");

            }).catch(function (err) {
                deferred.reject(err);
            });

            return deferred.promise;
        }, 

        getMovesByPlayer: function(playerID) {
            
            var deferred = $q.defer();      

            var moves = [];

            db.get(playerID).then(function(result){

                moves = result.clip_moves;

                var keys = [];

                for(i in moves) {
                    if(parseInt(moves[i]) > 0) keys.push(i);
                }
                
                return db.allDocs({
                    include_docs: true,
                    keys: keys
                });

            }).then(function (result) {
                                    
                result = result.rows.map(function(row) {
                    row.doc.clipQty = moves[row.doc._id];   
                    row.doc.name = row.doc.move_name;
                    return row.doc;
                });

                deferred.resolve(result);

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

        news: function() {
            return this.newsPg;
        },

        newsPg: {
            options: {},
            end: {noMore: true},
            limit: isPad? 12: 7,    
            descending: true,           
            init: function() {                
                this.options = {descending : this.descending, include_docs: true, limit : this.limit, endkey: "news_", startkey: "news_" + "\uffff"};                                
                list.resetNewsList();
                this.end.noMore = true;
                return this.getNews();
            },

            refresh: function() {

                var deferred = $q.defer();

                var newsList = list.getNewsList();
                var curLast = newsList[0];

                var curStarkey = this.options.startkey;
                var curNoMore = this.end.noMore;

                this.options = {descending : this.descending, include_docs: true, limit : this.limit, endkey: "news_", startkey: "news_" + "\uffff"};
                // this.end.noMore = true;

                var that = this;

                var _options = that.options;
                var _end = that.end;
                
                db.allDocs(_options).then(function (result) {

                    if (result && result.rows.length > 0) {

                        _options.startkey = result.rows[result.rows.length - 1].key;

                        result = result.rows.map(function(row) {                            
                            return row.doc;
                        });    

                        if(result.length < that.limit) {
                            that.end.noMore = true;
                        }else{
                            that.end.noMore = false;
                        }

                        if(result.length == that.limit) {
                            result.splice(-1,1);
                        }                                                

                        return result;                                             
                    }else{                       
                        that.end.noMore = true;            
                        return null;
                    }                                                        

                }).then(function(result){
                    if(result) {
                        var index = findIndexR(result, curLast._id);
                        if(index == -1) {
                            list.resetNewsList();
                            list.setNewsList(result);
                        }else if(index != 0){                            
                            var add = result.slice(0, index);
                            list.addNewsList(add);
                            _options.startkey = curStarkey;
                            _end.noMore = curNoMore;
                        }
                    }
                    return true;                    
                }).then(function(){
                    deferred.resolve(true);
                }).catch(function (err) {
                    deferred.reject(err);
                });

                return deferred.promise;
            },

            more: function(callback) {            
                this.getNews()
                .catch(function(){
                    ErrorService.showAlert('无法获取数据');
                }).finally(function(){
                    if(callback) callback();
                });
            },
            
            hasNoMore: function() {                
                return this.end;
            },
           
            getNews: function() {

                var deferred = $q.defer();

                var that = this;

                var _options = that.options;
                
                db.allDocs(_options).then(function (result) {

                    if (result && result.rows.length > 0) {

                        _options.startkey = result.rows[result.rows.length - 1].key;                        

                        result = result.rows.map(function(row) {                            
                            return row.doc;
                        });    

                        if(result.length < that.limit) {
                            that.end.noMore = true;
                        }else{
                            that.end.noMore = false;
                        }

                        if(result.length == that.limit) {
                            result.splice(-1,1);
                        }                            
                        
                        list.setNewsList(result);

                        deferred.resolve("More data fetched");
                                             
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

        clipsPg: {
            options: {},
            end: {noMore: true},
            limit: isPad? 12: 7,    
            descending: true,           
            init: function(playerID, moveID) {                
                this.options = {descending : this.descending, include_docs: true, limit : this.limit, endkey: "clip_" + playerID + "_" + moveID, startkey: "clip_" + playerID + "_" + moveID + "\uffff"};                                
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
                
                db.allDocs(_options).then(function (result) {

                    if (result && result.rows.length > 0) {

                        _options.startkey = result.rows[result.rows.length - 1].key;

                        var keys = [];

                        result = result.rows.map(function(row) {
                            keys.push(row.doc.local);
                            return row.doc;
                        });                        

                        db.allDocs({keys: keys, include_docs: true}).then(function (r) {                            

                            for(i in result) {
                                var local = r.rows[i];                                                    
                                result[i].thumb = local.doc? local.doc.thumb: "";
                                result[i].favorite = local.doc? local.doc.favorite: false;
                            }

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

                        }).catch(function(err){
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

                this.options = {descending : this.descending, limit : this.limit, include_docs: true};                

                if(search.player && search.move) {
                    this.view = "favorite_player_move";                                      
                    this.options.startkey = [true, search.player, search.move, {}];
                    this.options.endkey = [true, search.player, search.move];
                }else if(search.player) {
                    this.view = "favorite_player";                    
                    this.options.startkey = [true, search.player, {}];
                    this.options.endkey = [true, search.player];
                }else if(search.move) {
                    this.view = "favorite_move";            
                    this.options.startkey = [true, search.move, {}];
                    this.options.endkey = [true, search.move];
                }else {
                    this.view = "favorite";                    
                    this.options.startkey = [true, {}];
                    this.options.endkey = [true];
                }

                if(search.noResult) {
                    this.options.limit = 0;
                }else {
                    list.resetFavoriteList();
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

                db.query(that.view, _options).then(function (result) {

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
                // if(true){
                    // return refreshAllPlayers().then(retrieveNews).then(retrievePlaysCats);                    
                    return retrieveAllPlayers(true)                        
                        .then(retrievePlaysCats)
                        .then(retrieveSkillCats)
                        .then(refreshNews);
                }else{                    
                    return true;
                }
            }).catch(function(err) {                
                syncFail();
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

    service.readNews = function(news) {
        if (!news.read) news.read = true;
        return db.get(news._id).then(function(result) {
            if(!result.read) {
                result.read = true;
                return db.put(result);
            }else {
                return true;
            }
        });
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
        //console.log("start to init");
        var deferred = $q.defer();

        // dataTransfer.transfer(); return;        
        // dataProcess.init(); return;
        createDB();        
                
        isDBInstalled().then(function(result) {       
            if(result.postInfo) play.postInfo = true;
            if(result.playInfo) play.playInfo = true;
            syncData(deferred, false);
        }).catch(function(e) {
            //ErrorService.showProgress();          
            cleanDB()
            .then(loadDBDump)
            .then(markInstalled)
            .then(function() {
                // console.log("DB installed");                
                syncData(deferred, true);
            }).catch(function (err){                
                console.log("install err, details = " + err);                
                installFail();
                deferred.reject("Err in creating DB" + err);                            
            });
        });

        return deferred.promise;        
    };

    function syncData(deferred, install) {
        if(install) {
            bootstrapForInstall(deferred);
        }else{
            bootstrap(deferred);    
        } 
    }

    function bootstrap(deferred, callback) {       
        retrieveLists().then(function() {                   
            deferred.resolve("data prefetched");
            if(callback) callback();
        }).catch(function(err){                    
            initFail();
            deferred.reject("Err in getting init data: " + err);                     
        });
    }

    function bootstrapForInstall(deferred, callback) {     
        
        retrieveListsForInstall().then(function() {                 
            deferred.resolve("data prefetched");
            if(callback) callback();
        }).catch(function(err){                    
            initFail();
            deferred.reject("Err in getting init data: " + err);                     
        });
    }

    function retrieveLists(isInstall) {
        var list = [];
        list.push(retrieveAllPlayers());
        // list.push(retrieveAllMoves());
        //if(!isInstall) list.push(retrieveFavorites());
        list.push(retrieveNews());
        list.push(retrievePlaysCats());
        list.push(retrieveSkillCats());    
        return executePromises(list);
    }

    function retrieveListsForInstall(){
        return retrieveLists(true);
    }   

    function loadImgs() {
        var list = [];
        list.push(loadMoveImg());
        list.push(loadPlayerImg());        
        return executePromises(list);
    }

    function loadMoveImg() {       
        return FileCacheService.cacheFiles(list.moveList);
    }

    function loadPlayerImg() {
        return FileCacheService.cacheAvatar(list.playerList);
    }

    function executePromises(list) {
        var promises = [];

        angular.forEach(list , function(item) {            
            promises.push(item);
        });

        return $q.all(promises);
    }

    function buildIndexes(install) {

        var list = [];

        //var views = ['players', 'allMoves', 'moves', 'clips', 'local'];
        var views = ['moves', 'clips', 'local'];

        if(install) {
            //views = ['players', 'allMoves', 'moves', 'clips', 'local', 'favorite', 'favorite_player_move', 'favorite_player', 'favorite_move'];
            views = ['moves', 'clips', 'local', 'favorite', 'favorite_player_move', 'favorite_player', 'favorite_move'];
        }

        for(i in views) {
            list.push(db.query(views[i], {stale: 'update_after'}));
        }

        return executePromises(list);
    }

    function buildIndexesForInstall() {    
        return buildIndexes(false);
    }

    function initFail() {
        ErrorService.showAlert("启动遇到问题", "请您重新下载安装。", false);         
    }

    function installFail() {
        string.installFail = true;
        ErrorService.showAlert("安装遇到小问题", "请点击重试。", true);       
    }

    function syncFail() {
        if(!hasNetwork()) {
            ErrorService.showAlert("无法同步最新数据", "请确认互联网连接。", false);            
        }else{
            ErrorService.showAlert("无法同步最新数据", "请稍候再试。", false);
        }        
    }

    function hasNetwork() {
        if(!isCordova()) {
            return true;
        }else {
            return navigator.connection.type !== Connection.NONE   
        }      
    }    

    function retrieveFavorites() {
        //console.log("ready for retrieveFavorites");
        return pagination.favorite().init();
    }

    function retrieveNews() {
        return pagination.news().init();
    }

    function refreshNews() {
        return pagination.news().refresh();
    }

    function retrieveAllMoves() {
        //console.log("ready for retrieveAllMoves");
        return dataFetcher.getMoves();
    }

    function retrieveAllPlayers(refresh) {
        // console.log("ready for retrieveAllPlayers");
        var deferred = $q.defer();

        db.allDocs({
            include_docs: true,
            startkey: "player",
            endkey: "player\uffff"            
        }).then(function (result) {
                                
            result = result.rows.map(function(row) {
                return row.doc;
            });

            if(!refresh) {                
                for(i in result) {                
                    if (result[i].star) {
                        list.starList.push(result[i]);
                    }               
                }
            }

            list.setPlayerList(result);           

            deferred.resolve("All players retrieved");

        }).catch(function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function retrievePlaysCats() {
        return $q(function(resolve, reject) {
            retrieveDoc("plays").then(function(doc) {            
                list.setPlaysList(doc.category);                
                resolve("plays retrieved");
            }).catch(function(e){
                reject(e);
            });
        });            
    }

     function retrieveSkillCats() {
        return $q(function(resolve, reject) {
            retrieveDoc("skills").then(function(doc) {            
                list.setSkillsList(doc.cats);     
                resolve("skills retrieved");
            }).catch(function(e){
                reject(e);
            });
        });            
    }

    function refreshAllPlayers() {

        var deferred = $q.defer();

        db.allDocs({
            include_docs: true,
            startkey: "player",
            endkey: "player\uffff"            
        }).then(function (result) {

            var players = list.playerList;

            for(i in result.rows) {
                
                var index = findIndex(players, result.rows[i].key);    

                if(index == -1) {
                    insertArray(players, result.rows[i].doc);
                } else {
                    if(players[index].clip_total != result.rows[i].doc.clip_total) {
                        players[index].clip_total = result.rows[i].doc.clip_total;
                    }    
                }             
            }

            deferred.resolve("All players refreshed");

        }).catch(function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function copyList(desc, source) {
        desc.push.apply(desc, source);
    }

    function copyListToFront(desc, source) {
        desc.unshift.apply(desc, source);
    }

    function getDoc(id) {
        return db.get(id);
    }

    function retrieveDoc(id) {
        return $q(function(resolve, reject) {
            db.get(id).then(function(doc){
                resolve(doc);
            }).catch(function(e){
                reject(e);
            })
        });
    };

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
            deferred.resolve("DB recreated");              
        }).catch(function() {
            deferred.reject("DB destroy err");
        });
        return deferred.promise;
    }

    function createDB() {
        if(db) {
            db = null;
        }
        // db = pouchdb.create(string.dbName, {size: 40, adapter: string.dbAdapter, auto_compaction: false});
        db = pouchdb.create(string.dbName, {auto_compaction: false});
        // deleteDB();       
    }

    function syncFromRemote() {     
        return db.replicate.from(string.remoteURL + string.dbName, {timeout: 5000});
    }    

    function loadDBDump() {
        // console.log("Start to loadDBDump");
        
        var deferred = $q.defer();      

        if(isCordova()) {           

            window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + "/" + string.file, 
                function(fileEntry){

                    fileEntry.file(function(file) {
                        var reader = new FileReader();

                        reader.onloadend = function(e) {
                            // var option = (!string.installFail && hasNetwork()) ? {proxy: string.remoteURL + string.dbName}: {};                          
                            // deferred.resolve(db.load(this.result, option));                       
                            deferred.resolve(db.load(this.result));                    
                        }

                        reader.readAsText(file);
                    });
                },
                function(e){
                    console.log("FileSystem Error");    
                    console.dir(e);             
                    deferred.reject(e);
                }                        
            );

        }else{
            deferred.resolve(db.load(string.file));
        }

        return deferred.promise;
    }

    function isCordova() {
        return (typeof cordova !== 'undefined' || typeof phonegap !== 'undefined');
    };

    function createDesignDoc(name, mapFunction, reduce) {
        var ddoc = {
            _id: '_design/' + name,
            views: {}
        };
        ddoc.views[name] = { map: mapFunction.toString() };
        if(reduce) {
            ddoc.views[name].reduce = reduce;
        }
        return ddoc;
    }

    function setupView(_db) {
        var designDocs = [];        

        designDocs.push(createDesignDoc('favorite', function (doc) {
            if (doc.type === 'local') {
                emit([doc.favorite, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
            }
        }));

        designDocs.push(createDesignDoc('favorite_player_move', function (doc) {
            if (doc.type === 'local') {
                emit([doc.favorite, doc.player, doc.move, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
            }
        }));

        designDocs.push(createDesignDoc('favorite_player', function (doc) {
            if (doc.type === 'local') {
                emit([doc.favorite, doc.player, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
            }
        }));

        designDocs.push(createDesignDoc('favorite_move', function (doc) {
            if (doc.type === 'local') {
                emit([doc.favorite, doc.move, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
            }
        }));

        var list = [];

        for(i in designDocs) {
            list.push(_db.put(designDocs[i]));
        }

        return executePromises(list);
    }
    
    function markInstalled() {
        // console.log("Install finished");
        return db.put({
            _id: '_local/DBInstalled',
            status: 'completed'
        });
    }

    function isDBInstalled() {
        return db.get('_local/DBInstalled');
    }

    function findIndex(array, id) {  
        var low = 0, high = array.length, mid;
        while (low < high) {
            mid = (low + high) >>> 1;
            if(array[mid]._id == id) {
                return mid;
            }else{
                array[mid]._id < id ? low = mid + 1 : high = mid    
            }
        }
        return -1;
    }

    function findIndexR(array, id) {  
        var low = 0, high = array.length, mid;
        while (low < high) {
            mid = (low + high) >>> 1;
            if(array[mid]._id == id) {
                return mid;
            }else{
                array[mid]._id > id ? low = mid + 1 : high = mid    
            }
        }
        return -1;
    }

    function insertArray(array, obj) {
        var i = array.length - 1;
        while (i >= 0) {
           if(obj._id > array[i]._id){
              array.splice(i+1, 0, obj);
              break;
           }
           i--;
        }
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
    
    service.playAnimation = function(list) {
        cordova.exec(win, fail, "MyHybridPlugin", "playClip", list);
    };

    service.playPlay = function(list) {        
        cordova.exec(win, fail, "MyHybridPlugin", "playPlay", list);
    };

    service.playArticle = function(list) {        
        cordova.exec(win, fail, "MyHybridPlugin", "showArticle", list);
    };

    service.play = function(list) {        
        cordova.exec(win, fail, "MyHybridPlugin", "play", list);
    };

    // service.playAnimation = function(clipURL, favorite, showFavBut) {
    //     favorite = favorite? "true": "false";
    //     showFavBut = showFavBut? "true": "false";
    //     cordova.exec(win, fail, "MyHybridPlugin", "playClip", [clipURL, favorite, showFavBut]);
    // };

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
        });   
    };

    service.showProgress = function() {        
        $timeout(function() {
            $cordovaSplashscreen.addProgress();
        }, 10);  
    };

    service.showAlert = function(title, desc, retry) {
        
        NativeService.showMessage(title, desc? desc: "请稍后重试", retry);              
    };

    service.showDownLoader = function() {
        $ionicLoading.show({     
            template: '<span>Downloading...</span><progress max="1" id="progress"></progress>',
            hideOnStateChange: true
        });
    };
    
    service.showLoader = function(duration) {
        $ionicLoading.show({
            template: '<ion-spinner icon="crescent" class="spinner-assertive"></ion-spinner>',
            hideOnStateChange: false,
            duration: duration? duration: 0
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
		// $state.go("tabsController.players");
		$state.go("tabsController.news");
  	}
}])

.controller('StarsCtrl', ['$scope', '$ionicSlideBoxDelegate', '$state', 'ErrorService', 'DBService', function($scope, $ionicSlideBoxDelegate, $state, ErrorService, DBService) {
  	
 	$scope.stars = DBService.list().getStarList();
	$ionicSlideBoxDelegate.update();
	$ionicSlideBoxDelegate.slide(0);						

 	$scope.showMoves = function(playerID, playerName) {
		// $state.go("tabsController.moves", {playerID: playerID, playerName: playerName});
		DBService.getGaleryByPlayer(playerID);
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

.controller('FavorateCtrl', ['$scope', '$state', '$ionicScrollDelegate', '$ionicListDelegate', '$ionicPopover', 'ErrorService', 'DBService', 'NativeService', '$timeout', function($scope, $state, $ionicScrollDelegate, $ionicListDelegate, $ionicPopover, ErrorService, DBService, NativeService, $timeout) {
	
	$scope.listCanSwipe = true;
 	$scope.playingClipIndex = "";
 	$scope.clips = [];

 	$scope.search = {
	 	selected_player: "",
	  	selected_move: "",    
	    by_player: "",
	    by_move: "",
	};

	$scope.data = {  	
    	players: DBService.list().getPlayerList(),
    	moves: DBService.list().getMoveList()
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

	var clipLength = DBService.list().getFavoriteList().length;

	if(clipLength) {
		ErrorService.showLoader();
	}

	$timeout(function(){
		$scope.noMoreItemsAvailable = DBService.pagination().favorite().hasNoMore();
 		$scope.clips = DBService.list().getFavoriteList();		
 		if(clipLength) ErrorService.hideLoader();	
 	}, 300);
}])

.controller('PlayersCtrl', ['$scope', '$state', 'DBService', 'ErrorService', '$timeout', function($scope, $state, DBService, ErrorService, $timeout) {

	// $scope.$on("$ionicView.loaded", function() {
 //    	$timeout(function() {
 //    		$scope.$broadcast('scroll.refreshStart');
 //    	}, 300);    
 //  	});

	$scope.players = DBService.list().getPlayerList();
	// ErrorService.hideSplashScreen();

	// $scope.doRefresh = function() {
	// 	DBService.remoteDB().syncRemote(function() {
	// 		$scope.$broadcast('scroll.refreshComplete');
	// 	});
	// };	
		
	$scope.showMoves = function(playerID, playerName) {
		$state.go("tabsController.tab2Moves", {playerID: playerID, playerName: playerName});
	};

	$scope.myFilter = function (item) { 
	    return item.clip_total > 4; 
	};
}])

.controller('MovesCtrl', ['$scope', '$stateParams', 'moves', 'DBService', function($scope, $stateParams, moves, DBService) {

	$scope.moves = moves;
	$scope.playerName = $stateParams.playerName;

	$scope.showClips = function(moveName, moveID) {
		//$state.go("tabsController.clips", {playerID: $stateParams.playerID, moveName: moveName, moveID: moveID});
		DBService.playClipsByMove($stateParams.playerID, moveID);
	};

}])

.controller('Tab2MovesCtrl', ['$scope', '$stateParams', 'moves', 'DBService', function($scope, $stateParams, moves, DBService) {
	$scope.moves = moves;
	$scope.playerName = $stateParams.playerName;

	$scope.showClips = function(moveName, moveID) {
		//$state.go("tabsController.tab2Clips", {playerID: $stateParams.playerID, moveName: moveName, moveID: moveID});
		DBService.playClipsByMove($stateParams.playerID, moveID);
	};

	// $scope.showClips = function(moveName, moveID) {
	// 	$state.go("tabsController.tab2Clips", {playerID: $stateParams.playerID, moveName: moveName, moveID: moveID});
	// };

}])

.controller('NewsCtrl', ['$scope', '$state', '$stateParams', 'DBService', 'ErrorService', '$timeout', function($scope, $state, $stateParams, DBService, ErrorService, $timeout) {	

	$scope.noMoreItemsAvailable = DBService.pagination().news().hasNoMore();
 	$scope.news = DBService.list().getNewsList();

 	ErrorService.hideSplashScreen();

 	$scope.loadMore = function() { 
		DBService.pagination().news().more(function() {
			$scope.$broadcast('scroll.infiniteScrollComplete');
		});
  	};	

	$scope.showClips = function(index) {
		DBService.readNews($scope.news[index])
		.finally(function(){
			DBService.play().playPost($scope.news[index]);
			// NativeService.playAnimation($scope.news[index].image);			
			// DBService.play().playPost($scope.news[index].image);
		});		
	};

	$scope.doRefresh = function() {
		DBService.remoteDB().syncRemote(function() {
			$scope.$broadcast('scroll.refreshComplete');
		});
	};

	$scope.$on("$ionicView.loaded", function() {
    	$timeout(function() {
    		$scope.$broadcast('scroll.refreshStart');
    	}, 300);    
  	});
}])

.controller('PlaysCtrl', ['$scope', '$state', 'DBService', function($scope, $state, DBService) {

    $scope.cats = DBService.list().getPlaysList();

	$scope.myFilter = function (item) { 
	    return item.quantity > 0; 
	};

	$scope.showPlays = function(id, name) {	
		$state.go("tabsController.play", {catID: id, catName: name});	
	};
}])

.controller('PlayCtrl', ['$scope', '$stateParams', 'DBService', 'plays', function($scope, $stateParams, DBService, plays) {

	$scope.plays = plays;

	$scope.catName = $stateParams.catName;

	$scope.playPlay = function(index) {
		// NativeService.playPlay($scope.plays[index].image);	
		DBService.play().playPlay($scope.plays[index].image);
	};
}])

.controller('SkillsCtrl', ['$scope', '$state', 'DBService', function($scope, $state, DBService) {

    $scope.cats = DBService.list().getSkillsList();

	$scope.myFilter = function (item) { 
	    return item.count > 0; 
	};

	$scope.showSkills = function(id, name) {	
		$state.go("tabsController.skill", {catID: id, catName: name});	
	};
}])

.controller('SkillCtrl', ['$scope', '$stateParams', 'DBService', 'plays', function($scope, $stateParams, DBService, skills) {

	$scope.skills = skills;

	$scope.catName = $stateParams.catName;

	$scope.play = function(index) {		
		// DBService.play().playPost($scope.skills[index].image);
		DBService.play().playArticle($scope.skills[index]);
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

            // scope.$on('$ionicView.beforeLeave', function() {
            //     console.log("$rootScope.hideTabs = false");
            //     $rootScope.hideTabs = false;
            // });
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
        //console.log("Running in Cordova, will bootstrap AngularJS once 'deviceready' event fires.");
        
        document.addEventListener('deviceready', function () {
            //console.log("Deviceready event has fired, bootstrapping AngularJS.");
            startForIOS();
        }, false);
    } else {
        //console.log("Running in browser, bootstrapping AngularJS now.");        
        angular.bootstrap(document.body, ['app']);
    }
});