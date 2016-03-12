angular.module('app.services', [])


.factory('DBService', ['$q', '$timeout', 'pouchdb', 'ErrorService', 'FileCacheService', function($q, $timeout, pouchdb, ErrorService, FileCacheService) {

    var service = {};    

    var string = {
        dbName: "cliplay_uat",
        remoteURL: "http://121.40.197.226:4984/",
        // remoteURL: "http://app_viewer:Cliplay1234@121.40.197.226:4984/",
        // dbName: dbString? "cliplay_uat": "cliplay_dev",
        // remoteURL: dbString? dbString.split(",")[0]: "http://admin:12341234@localhost:5984/",
        file: dbString? dbString.split(",")[1]: "db.txt",
        dbAdapter: "websql",
        installFail: false
    }
    
    var db = null;

    var isPad = (typeof device !== 'undefined' && device.model.indexOf("iPad") !== -1)? true: false;

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
        starList: [],

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

            db.get(playerID).then(function(result){

                var moves = result.clip_moves;

                var keys = [];

                for(i in moves) {
                    if(parseInt(moves[i]) > 0) keys.push(i);
                }
                
                db.allDocs({
                    include_docs: true,
                    keys: keys
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
            }).catch(function(){

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
                    refreshAllPlayers().finally(function(){
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

        //dataTransfer.transfer(); return;
        createDB();
        //generateDump(); return;
        
        isDBInstalled()
        .then(function() {        
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
        list.push(retrieveAllMoves());
        if(!isInstall) list.push(retrieveFavorites());
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

    function retrieveAllMoves() {
        //console.log("ready for retrieveAllMoves");
        return dataFetcher.getMoves();
    }

    function retrieveAllPlayers() {
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

            for(i in result) {                
                if (result[i].star) {
                    list.starList.push(result[i]);
                }               
            }

            list.setPlayerList(result);

            // console.log("finished retrieveAllPlayers");

            deferred.resolve("All players retrieved");

        }).catch(function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
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
        db = pouchdb.create(string.dbName, {size: 40, adapter: string.dbAdapter, auto_compaction: false});
        //deleteDB();        
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
}])