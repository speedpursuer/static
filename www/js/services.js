angular.module('app.services', [])


.factory('DBService', ['$q', '$timeout', 'pouchdb', 'ErrorService', 'FileCacheService', function($q, $timeout, pouchdb, ErrorService, FileCacheService) {

    var service = {};    

    var string = {
        dbName: "cliplay",     
        remoteURL: dbString? dbString.split(",")[0]: "http://admin:12341234@localhost:5984/",        
        file: dbString? dbString.split(",")[1]: "db.txt",
        dbAdapter: "websql"
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
            var option = {startkey: [playerID], endkey: [playerID, {}], reduce: true, group: true};
            
            db.query('views/moves', option).then(function (result) {
                          
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

        testMovesByPlayer: function(playerID) {
            var deferred = $q.defer();
            var option = {startkey: [playerID], endkey: [playerID, {}], reduce: true, group: true, limit: 0};
            
            db.query('views/moves', option).finally(function() {
                deferred.resolve("move retrieved");
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

            testClips: function(playerID, moveID) {

                var deferred = $q.defer();

                var options = {descending: true, limit: 1, endkey: [playerID, moveID], startkey: [playerID, moveID, {}], reduce: true, group: true};                
             
                db.query('views/clips', options).then(function (result) {
                    
                    db.query('views/local', {include_docs : true, key: result.rows[0].value})
                    .finally(function () {
                        deferred.resolve("data fetched");
                    });

                }).catch(function (err) {
                    deferred.resolve("data not fetched");
                });

                return deferred.promise;
            }
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

                if(search.noResult) {
                    this.options.limit = 0;
                }else {
                    list.resetFavoriteList();
                }

                this.end.noMore = true;

                this.more(callback);                             
            },   
            testFavorite: function() {
                //this.search()
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
                    //retrieveAllPlayers();
                    //retrieveAllMoves();
                    //verifyView();
                    reIndex().then(refreshAllPlayers).finally(function(){
                        if(callback) callback();        
                    });
                }else{                    
                    if(callback) callback();
                }
            }).catch(function(err) {
                if(callback) callback();
                syncFail();
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
            syncData(deferred, false);
        }).catch(function(e) {
            cleanDB()
            .then(loadDBDump)
            .then(markInstalled)
            .then(function() {
                console.log("DB installed");
                syncData(deferred, true);
            }).catch(function (err){                
                console.log("install err, details = " + err);
                initFail();
                deferred.reject("Err in creating DB" + err);                            
            });
        });

        return deferred.promise;        
    };

    function bootstrap(deferred, callback) {       
        retrieveLists()
        .then(reIndex)
        .then(function() {                   
            deferred.resolve("data prefetched");
            if(callback) callback();
        }).catch(function(err){                    
            initFail();
            deferred.reject("Err in getting init data: " + err);                     
        });
    }

    function bootstrapForInstall(deferred, callback) {       
        retrieveListsForInstall()
        .then(reIndexForInstall)
        .then(loadImgs)
        .then(function() {                 
            deferred.resolve("data prefetched");
            if(callback) callback();
        }).catch(function(err){                    
            initFail();
            deferred.reject("Err in getting init data: " + err);                     
        });
    }

    function syncData(deferred, install) {
        syncFromRemote().then(function(result){
            console.log("syncFromRemote success");
            if(install) {
                bootstrapForInstall(deferred);
            }else{
                bootstrap(deferred);    
            }                                                   
        }).catch(function(){  
            console.log("syncFromRemote fail");
            if(install) {
                bootstrapForInstall(deferred, function(){
                    syncFail();
                })
            }else{
                bootstrap(deferred, function(){
                    syncFail();
                })
            }
        });   
    }

    service.init_ = function() {        

        var deferred = $q.defer();
    
        createDB();
        
        isDBInstalled()
        .then(function() {
            syncFromRemote().then(function(result){                                           
                retrieveLists()
                .then(reIndex)
                .then(function() {                   
                    deferred.resolve("DB Existed");
                }).catch(function(err){                    
                    initFail();
                    deferred.reject("Err in getting init data: " + err);                     
                });
            }).catch(function(){                                   
                retrieveLists()
                .then(reIndex)
                .then(function() {
                    deferred.resolve("DB Existed");
                    syncFail();
                }).catch(function(err){                    
                    initFail();
                    deferred.reject("Err in getting init data: " + err);                     
                });
            });            
        }).catch(function(e) {
            //console.log("Cannot find install flag due to: " + e);

            if(isCordova() && navigator.connection.type === Connection.NONE) {
                //console.log("No network connect");
                installFail();
                deferred.reject("No network connect");                            
            }else{
                //ErrorService.showProgress();
                cleanDB()
                //.then(loadDBDump)
                .then(syncFromRemote)      
                .then(setupView)
                .then(setUpIndex)   
                .then(retrieveListsForInstall)
                .then(reIndexForInstall)
                .then(loadImgs)          
                .then(markInstalled)
                .then(function() {
                    deferred.resolve("DB Created");
                }).catch(function (err){                
                    console.log("install err, details = " + err);
                    installFail();
                    deferred.reject("Err in creating DB" + err);                            
                });      
            }
        });

        return deferred.promise;        
    };

    function setupIndexes() {        
        var list = [];
        list.push(setupView());
        list.push(setUpIndex());
        return executePromises(list);
    }

    function retrieveLists(isInstall) {
        //console.log("Start to retrieveLists");
        var list = [];
        list.push(retrieveAllPlayers());
        list.push(retrieveAllMoves());
        if(!isInstall) list.push(retrieveFavorites());
        return executePromises(list);
    }

    function retrieveListsForInstall(){
        return retrieveLists(true);
    }   

    function loadImgs() {
        console.log("Start to loadPlayerImg");
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
        //console.log("Start to verifyView");
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

    function reIndex(install) {       
        
        var playerID = list.getPlayerList()[0]._id,

            moveID = list.getMoveList()[1]._id,

            promiseList = [];

        promiseList.push(dataFetcher.testMovesByPlayer(playerID));       

        promiseList.push(pagination.clips().testClips(playerID, moveID));

        if(install) {
            var search = {                    
                    noResult: true                  
                },
                search1 = {
                    player: playerID,
                    noResult: true                  
                },
                search2 = {
                    move: moveID,
                    noResult: true
                },
                search3 = {
                    player: playerID,                 
                    move: moveID,
                    noResult: true
                };
            promiseList.push(pagination.favorite().search(search));
            promiseList.push(pagination.favorite().search(search1));
            promiseList.push(pagination.favorite().search(search2));
            promiseList.push(pagination.favorite().search(search3));
        }

        return executePromises(promiseList);
    }

    function reIndexForInstall() {
        console.log("Start to reIndexForInstall");
        return reIndex(true);
    }

    function initFail() {
        ErrorService.showAlert("启动遇到小问题", "请重启再试。", false);         
    }

    function installFail() {
        ErrorService.showAlert("启动遇到小问题", "请检查网络后再试。", false);         
    }

    function syncFail() {
        if(isCordova() && navigator.connection.type === Connection.NONE) {
            ErrorService.showAlert("无法同步最新数据", "请确认互联网连接。", false);            
        }else{
            ErrorService.showAlert("无法同步最新数据", "请稍候再试。", false);
        }        
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

    function refreshAllPlayers() {

        var deferred = $q.defer();

        db.query('views/players', {reduce: true, group: true, group_level: 2}).then(function (result) {            
            
            var keys = [], qtys = [];
            var players = list.playerList;
            
            for(i in result.rows) {
                
                var index = findIndex(players, result.rows[i].key);    

                if(index == -1) {
                    keys.push(result.rows[i].key);
                    qtys.push(result.rows[i].value);                
                } else {
                    if(players[index].clipQty != result.rows[i].value) {
                        players[index].clipQty = result.rows[i].value;
                    }    
                }             
            }

            if (keys.length > 0) {
                db.allDocs({
                    include_docs: true,
                    keys: keys
                }).then(function (result) {
                                    
                    for(i in result.rows) {
                        result.rows[i].doc.clipQty = qtys[i];
                        insertArray(players, result.rows[i].doc);
                    }

                    deferred.resolve("All players refreshed");

                }).catch(function (err) {
                    deferred.reject(err);
                });

            }else {
                deferred.resolve("All players refreshed");
            }

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
        //console.log("Start to cleanDB");
        var deferred = $q.defer();
        db.destroy().then(function() {
            createDB();
            deferred.resolve("DB recreated");
            // $timeout(function(){
            //     deferred.resolve("DB recreated");
            // },10);         
        }).catch(function() {
            deferred.reject("DB destroy err");
        });
        return deferred.promise;
    }

    function createDB() {
        if(db) {
            db = null;
        }
        //console.log("Start to createDB");
        db = pouchdb.create(string.dbName, {size: 40, adapter: string.dbAdapter, auto_compaction: true});
        //deleteDB();
        //db = pouchdb.create(string.dbName, {adapter: string.dbAdapter});        
        //db = pouchdb.create(string.dbName, {size: 40, adapter: string.dbAdapter, auto_compaction: false});
        //db = pouchdb.create(string.dbName, {auto_compaction: true});
        //db.info().then(console.log.bind(console));
    }

    function syncFromRemote() {
        console.log("Start to SyncFromRemote from: " + string.remoteURL + string.dbName);
        if(!db) console.log("DB is null when SyncFromRemote");
        return db.replicate.from(string.remoteURL + string.dbName, {timeout: 10000});
        //return db.replicate.from(string.remoteURL + "cliplay", {timeout: 10000});
    }

    function syncToRemote() {
        //console.log("Start to syncToRemote from: " + string.remoteURL + string.dbName);
        if(!db) console.log("DB is null when syncToRemote");
        return db.replicate.to(string.remoteURL + string.dbName, {timeout: 3000});   
    }

    function loadDBDump() {
        console.log("Start to loadDBDump");
        
        var deferred = $q.defer();      

        if(isCordova()) {            
            // $.get(string.file, function(res) {   
            //     console.log("string.remoteURL + string.dbName: " + string.remoteURL + string.dbName);
            //     deferred.resolve(db.load(res, {
            //         proxy: string.remoteURL + string.dbName
            //     }));
            //     // deferred.resolve(db.load(res));
            // });

            window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + "/" + string.file, 
                function(fileEntry){

                    fileEntry.file(function(file) {
                        var reader = new FileReader();

                        reader.onloadend = function(e) {

                            deferred.resolve(db.load(this.result, {
                                //proxy: string.remoteURL + string.dbName
                            }));                            
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

    function setupView() {
        //console.log("Start to setupView");
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
        //console.log("Start to setupIndex");
    	return db.createIndex({
    		index: {
    			fields: ['type']
    		}
		});
    }
    
    function markInstalled() {
        //console.log("Install finished");
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
                
    // $ionicModal.fromTemplateUrl('templates/modal.html', {
    //     scope: $rootScope,
    //     animation: 'slide-in-up',
    //     backdropClickToClose: false,
    //     hardwareBackButtonClose: false
    // }).then(function(modal) {
    //     $rootScope.modal = modal;
    // });

    // service.showModal = function() {
    //     if(!$rootScope.modal.isShown()){
    //         $rootScope.modal.show();    
    //     }        
    // };

    // service.hideModal = function() {
    //     if($rootScope.modal.isShown()) {
    //         $rootScope.modal.hide();
    //         $rootScope.modal.remove();    
    //     }
    // };

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
}])