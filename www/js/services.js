angular.module('app.services', [])


.factory('DBService', ['$q', '$timeout', 'pouchdb', 'ErrorService', 'FileCacheService', function($q, $timeout, pouchdb, ErrorService, FileCacheService) {

    var service = {};    

    var string = {
        dbName: "cliplay_new",     
        remoteURL: dbString? dbString.split(",")[0]: "http://admin:12341234@localhost:5984/",
        file: dbString? dbString.split(",")[1]: "db.txt",
        dbAdapter: "websql",
        installFail: false
    }
    
    var db = null;

    var isPad = (typeof device !== 'undefined' && device.model.indexOf("iPad") !== -1)? true: false;

    //db.info().then(console.log.bind(console));
    //deleteDB();

    var dataTransfer = {

        players: [],
        moves: [],
        clips: [],
        db_new: {},      

        getDateID: function() {
            var currentdate = new Date();
            var datetime = "" + 
                           currentdate.getFullYear() + 
                           (currentdate.getMonth() + 1) + 
                           currentdate.getDate() + 
                           currentdate.getHours() +
                           currentdate.getMinutes() + 
                           currentdate.getSeconds();
            return datetime;
        },    

        countByPlayer: function(playerID, pList) {            
            var that = this;

            return $q(function(resolve, reject) {
                that.db_new.allDocs({startkey: "clip_" + playerID, endkey: "clip_" + playerID + "\uffff"})
                .then(function(result) {                 
                    pList[playerID] = {total: result.rows.length};
                    resolve("ok");
                });
            });                
        },

        countByPlayerMove: function(playerID, moveID, pList) {        

            var that = this;

            return $q(function(resolve, reject) {
                that.db_new.allDocs({startkey: "clip_" + playerID + "_" + moveID, endkey: "clip_" + playerID + "_" + moveID + "\uffff"})
                .then(function(result) {                   
                    pList[playerID][moveID] = result.rows.length;                        
                    resolve("ok");
                });
            });                
        },

        cleanDB: function(_db, dbName) {      
            var deferred = $q.defer();
            _db.destroy().then(function() {
                _db = pouchdb.create(dbName, {adapter: string.dbAdapter, auto_compaction: false});                
                deferred.resolve("DB recreated");                     
            }).catch(function() {
                deferred.reject("DB destroy err");
            });
            return deferred.promise;
        },

        transfer: function() {
            db = pouchdb.create("cliplay", {adapter: string.dbAdapter, auto_compaction: false});                
            this.db_new = pouchdb.create("cliplay_new", {adapter: string.dbAdapter, auto_compaction: false});

            var that = this;

            that.cleanDB(db, "cliplay")
            .then(function() {
                that.cleanDB(that.db_new, "cliplay_new").then(function(){
                    loadDBDump().then(function() {
                        setUpIndex().then(function(){                
                            
                            var list = [];                            

                            list.push(that.getList("player", dataTransfer.players));

                            list.push(that.getList("move", dataTransfer.moves));

                            list.push(that.getList("clip", dataTransfer.clips));

                            executePromises(list).then(function() {
                                console.log("player = " + dataTransfer.players['player10'].name);
                                console.log("move = " + dataTransfer.moves.length);
                                console.log("clip = " + dataTransfer.clips.length);

                                var moves = dataTransfer.moves;
                                var players = dataTransfer.players;
                                var clips = dataTransfer.clips;
                                

                                var moveList = [], playerList = [], clipList = [], pList = {};

                                for(i in moves) {
                                    var el = moves[i];

                                    var item = {
                                        _id: "move_" + el._id.toLowerCase(),
                                        desc: el.desc,
                                        image: el.image,
                                        move_name: el.move_name
                                    };

                                    moveList.push(item);
                                }

                                var id = parseInt(that.getDateID());

                                for(i in clips) {                                
                                                                    
                                    var el = clips[i];

                                    var playerName = "";
                                    var moveName = "";

                                    try{
                                        playerName = players[el.player].name_en.replace(/ /g,"_");
                                        moveName = moves[el.move]._id;                                  
                                    }
                                    catch(err){
                                        console.log(err + " happens in: " + el._id);
                                    }
                                
                                    var prefix = "player_" + playerName.toLowerCase() + "_move_" + moveName.toLowerCase() + "_" + id;

                                    var item = {
                                        _id: "clip_" + prefix,
                                        desc: el.desc,
                                        image: el.image,
                                        name: el.name,
                                        local: "local_" + prefix,
                                    };

                                    clipList.push(item);

                                    id++;
                                }

                                that.db_new.bulkDocs(moveList.concat(clipList)).then(function (result) {

                                    var list = [];                       
                                    
                                    for(i in players) {
                                    
                                        var el = players[i];

                                        var id = "player_" + el.name_en.replace(/ /g,"_").toLowerCase();                                       

                                        console.log(id);                                   

                                        list.push(that.countByPlayer(id, pList));                                        

                                        for(i in moves) {
                                            var id_move = "move_" + moves[i]._id.toLowerCase();

                                            list.push(that.countByPlayerMove(id, id_move, pList));                                                    
                                        }                                                                                
                                    }

                                    executePromises(list).then(function(){                                 

                                        for(i in players) {

                                            var el = players[i];

                                            var id = "player_" + el.name_en.replace(/ /g,"_").toLowerCase();  

                                            var playerCount = pList[id];

                                            var moveList = {};

                                            var total = 0;

                                            for(b in playerCount) {
                                                if(b == "total") {
                                                    total = playerCount[b];
                                                }else{
                                                    moveList[b] = playerCount[b];
                                                }
                                            }

                                            var item = {
                                                _id: id,
                                                desc: el.desc,
                                                image: el.image,
                                                name: el.name,
                                                name_en: el.name_en,
                                                star: el.star,
                                                avatar: el.avatar,
                                                clip_total: total,
                                                clip_moves: moveList
                                            };

                                            playerList.push(item);
                                        }
                                        
                                        that.db_new.bulkDocs(playerList).then(function (result) {
                                            that.db_new.replicate.to("http://admin:12341234@localhost:5984/cliplay_new", {timeout: 3000})
                                            .then(function(result){
                                                console.log(result);
                                            }).catch(function(e){
                                                console.log(e);
                                            });
                                        }).catch(function (err) {
                                            console.log(err);
                                        });                                      

                                    }).catch(function(e){
                                        console.log(e);
                                    });

                                }).catch(function (err) {
                                    console.log(err);
                                });                                                        
                            });
                        }).catch(function(e) {
                            console.log(e);
                        });             
                    });
                });
            })
        },

        getList: function(type, list) {
            return $q(function(resolve, reject) {
                db.find({
                    selector: {type: type}
                }).then(function(result) {
                    if(type=="player") {
                        
                        var list = result.docs;

                        var returnList = [];

                        for(i in list) {
                            var id = list[i]._id;
                            returnList[id] = list[i];
                        }

                        dataTransfer.players = returnList;

                    }else if(type=="move"){

                        var list = result.docs;

                        var returnList = [];

                        for(i in list) {
                            var id = list[i]._id;
                            returnList[id] = list[i];
                        }

                        dataTransfer.moves = returnList;
                    }else {
                        dataTransfer.clips = result.docs;
                    }                    
                    resolve("");
                }).catch(function() {
                    reject("");
                })
            });
        }        
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

        getMoves_: function() {
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
            console.log("start to getStars");
            return $q(function(resolve, reject) {
                db.query('star').then(function(result){
                    result = result.rows.map(function(row) {                   
                        return {
                            _id: row.id,
                            name: row.value.name,                      
                            image: row.value.image,                       
                        };
                    });
                    console.log("finished to getStars");
                    resolve(result);
                }).catch(function(e) {
                    reject(e);
                });            
            });
            //return db.query('views/star', {startkey: true, include_docs: true});
        },

        getStars_: function() {
            return db.find({
                selector: {type: 'player', star: true}
            });        
        },

        getMoves: function() {

            console.log("start to getMoves");
            var deferred = $q.defer();

            db.allDocs({
                include_docs: true,
                startkey: "move",
                endkey: "move\uffff"            
            }).then(function (result) {
                                    
                result = result.rows.map(function(row) {
                    //row.doc.clipQty = row.doc.clip_total
                    return row.doc;
                });

                list.setMoveList(result);

                console.log("getMoves finised");

                deferred.resolve("All moves retrieved");

            }).catch(function (err) {
                deferred.reject(err);
            });

            return deferred.promise;
        },

        getMoves_: function() {

            console.log("start to getMoves");
            var deferred = $q.defer();

            db.query('allMoves').then(function(result){
                console.log("finished to getMoves");

                result = result.rows.map(function(row) {                   
                    return {
                        _id: row.id,
                        move_name: row.value.name,                        
                        image: row.value.image,                        
                    };
                });

                list.setMoveList(result);
                deferred.resolve("Moves retrieved");
            }).catch(function(e){
                console.log(e);
                deferred.reject("Moves not retrieved");
            });

            return deferred.promise;
        },

        getMoves__: function() {

            console.log("start to getMoves");
            var deferred = $q.defer();

            db.find({
                selector: {type: 'move'},
                fields: ['_id', 'move_name', 'image']
            }).then(function(result){
                console.log("finished to getMoves");
                list.setMoveList(result.docs);
                deferred.resolve("Moves retrieved");
            }).catch(function(){
                deferred.reject("Moves not retrieved");
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

        getMovesByPlayer_: function(playerID) {
            var deferred = $q.defer();
            var option = {startkey: [playerID], endkey: [playerID, {}], reduce: true, group: true};
            
            db.query('moves', option).then(function (result) {
                          
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
            console.log("start to testMovesByPlayer");
            var deferred = $q.defer();
            var option = {startkey: [playerID], endkey: [playerID, {}], reduce: true, group: true, limit: 0};
            
            db.query('moves', option).finally(function() {
                console.log("finished to testMovesByPlayer");
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
                //this.options = {descending : this.descending, limit : this.limit, endkey: [playerID, moveID], startkey: [playerID, moveID, {}], reduce: true, group: true};                                
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

                        result = result.rows.map(function(row) {
                            //row.doc.clipQty = row.doc.clip_total
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
                        
                        list.setClipList(result);
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

            getClips_: function() {

                var deferred = $q.defer();

                var that = this;

                var _options = that.options;
             
                db.query('clips', _options).then(function (result) {

                    if (result && result.rows.length > 0) {

                        _options.startkey = result.rows[result.rows.length - 1].key;
                        //_options.skip = 1;                                              
                                                        
                        var keys = [];
                        
                        for(i in result.rows) {
                            keys.push(result.rows[i].value);
                        }

                        db.query('local', {include_docs : true, keys: keys}).then(function (result) {
                                                           
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

                console.log("start to testClips");

                var deferred = $q.defer();

                var options = {descending: true, limit: 1, endkey: [playerID, moveID], startkey: [playerID, moveID, {}], reduce: true, group: true};                
             
                db.query('clips', options).then(function (result) {
                    
                    db.query('local', {key: result.rows[0].value, limit: 0})
                    .finally(function () {
                        console.log("finished to testClips");
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

                this.options = {descending : this.descending, limit : this.limit, include_docs: true};                

                if(search.player && search.move) {
                    this.view = "favorite_player_move";                   
                    //this.options = {descending : this.descending, limit : this.limit, include_docs: true, endkey: [true, search.player, search.move], startkey: [true, search.player, search.move, {}]};                
                    this.options.startkey = [true, search.player, search.move, {}];
                    this.options.endkey = [true, search.player, search.move];
                }else if(search.player) {
                    this.view = "favorite_player";
                    //this.options = {descending : this.descending, limit : this.limit, include_docs: true, endkey: [true, search.player], startkey: [true, search.player, {}]};                
                    this.options.startkey = [true, search.player, {}];
                    this.options.endkey = [true, search.player];
                }else if(search.move) {
                    this.view = "favorite_move";
                    //this.options = {descending : this.descending, limit : this.limit, include_docs: true, endkey: [true, search.move], startkey: [true, search.move, {}]};
                    this.options.startkey = [true, search.move, {}];
                    this.options.endkey = [true, search.move];
                }else {
                    this.view = "favorite";
                    //this.options = {descending : this.descending, limit : this.limit, include_docs: true, endkey: [true], startkey: [true, {}]};    
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
                    //retrieveAllPlayers();
                    //retrieveAllMoves();
                    //verifyView();
                    reBootstrap().finally(function(){
                        console.log("finished refresh");
                        if(callback) callback();        
                    });
                    // reIndex().then(refreshAllPlayers).finally(function(){
                    //     console.log("finished refresh");
                    //     if(callback) callback();        
                    // });
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
        //console.log("start to init");
        var deferred = $q.defer();

        //dataTransfer.transfer(); return;

        createDB();
        //generateDump(); return;
        
        isDBInstalled()
        .then(function() {        
            syncData(deferred, false);
        }).catch(function(e) {
            ErrorService.showProgress();          
            cleanDB()
            .then(loadDBDump)
            .then(markInstalled)
            .then(function() {
                //console.log("DB installed");                
                syncData(deferred, true);
            }).catch(function (err){                
                console.log("install err, details = " + err);
                string.installFail = true;
                initFail();
                deferred.reject("Err in creating DB" + err);                            
            });
        });

        return deferred.promise;        
    };

    function syncData_(deferred, install) {
        console.log("start to syncData");
        syncFromRemote().then(function(result){
            console.log("finished to syncFromRemote");
            if(install) {
                bootstrapForInstall(deferred);
            }else{
                bootstrap(deferred);    
            }                                                   
        }).catch(function(){  
            //console.log("syncFromRemote fail");
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

    function syncData(deferred, install) {
        if(install) {
            bootstrapForInstall(deferred);
        }else{
            bootstrap(deferred);    
        } 
    }

    function bootstrap(deferred, callback) {       
        retrieveLists()
        //.then(reIndex)
        //.then(buildIndexes)
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
        //.then(buildIndexesForInstall)
        .then(loadImgs)
        .then(function() {                 
            deferred.resolve("data prefetched");
            if(callback) callback();
        }).catch(function(err){                    
            initFail();
            deferred.reject("Err in getting init data: " + err);                     
        });
    }

    function reBootstrap() {
        var list = [];
        list.push(refreshAllPlayers());
        list.push(buildIndexes());
        return executePromises(list);
    }

    // service.init_ = function() {        

    //     var deferred = $q.defer();
    
    //     createDB();
        
    //     isDBInstalled()
    //     .then(function() {
    //         syncFromRemote().then(function(result){                                           
    //             retrieveLists()
    //             .then(reIndex)
    //             .then(function() {                   
    //                 deferred.resolve("DB Existed");
    //             }).catch(function(err){                    
    //                 initFail();
    //                 deferred.reject("Err in getting init data: " + err);                     
    //             });
    //         }).catch(function(){                                   
    //             retrieveLists()
    //             .then(reIndex)
    //             .then(function() {
    //                 deferred.resolve("DB Existed");
    //                 syncFail();
    //             }).catch(function(err){                    
    //                 initFail();
    //                 deferred.reject("Err in getting init data: " + err);                     
    //             });
    //         });            
    //     }).catch(function(e) {
    //         //console.log("Cannot find install flag due to: " + e);

    //         if(!hasNetwork()) {
    //             //console.log("No network connect");
    //             installFail();
    //             deferred.reject("No network connect");                            
    //         }else{
    //             //ErrorService.showProgress();
    //             cleanDB()
    //             //.then(loadDBDump)
    //             .then(syncFromRemote)      
    //             .then(setupView)
    //             //.then(setUpIndex)   
    //             .then(retrieveListsForInstall)
    //             //.then(reIndexForInstall)
    //             .then(verifyView)
    //             .then(loadImgs)          
    //             .then(markInstalled)
    //             .then(function() {
    //                 deferred.resolve("DB Created");
    //             }).catch(function (err){                
    //                 console.log("install err, details = " + err);
    //                 installFail();
    //                 deferred.reject("Err in creating DB" + err);                            
    //             });      
    //         }
    //     });

    //     return deferred.promise;        
    // };

    function setupIndexes() {        
        var list = [];
        list.push(setupView());
        list.push(setUpIndex());
        return executePromises(list);
    }

    function retrieveLists(isInstall) {
        console.log("Start to retrieveLists");
        var list = [];
        list.push(retrieveAllPlayers());
        list.push(retrieveAllMoves());
        //if(!isInstall) list.push(retrieveFavorites());
        return executePromises(list);
    }

    function retrieveListsForInstall(){
        return retrieveLists(true);
    }   

    function loadImgs() {
        console.log("Start to loadImgs");
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
    
    // function verifyView() {        
    //     console.log("Start to verifyView");
    //     var deferred = $q.defer();      

    //     var playerID = list.getPlayerList()[0]._id;    

    //     dataFetcher.getMovesByPlayer(playerID).then(function(result){
    //         var moveID = result[0]._id;
    //         pagination.clips().init(playerID, moveID).then(function(result) {
    //             // var search = {
    //             //     player: playerID,
    //             //     move: moveID
    //             // };
    //             // pagination.favorite().init(search).then(function(result) {
    //             //     //console.log("Index verified");
    //             //     deferred.resolve("Index verified");
    //             // }).catch(function(err) {
    //             //     deferred.reject(err);
    //             // });    
    //             console.log("finished to verifyView");   
    //             deferred.resolve("Index verified");                 
    //         }).catch(function(err) {
    //             deferred.reject(err);
    //         });
    //     }).catch(function(err) {
    //         deferred.reject(err);
    //     });
    //     return deferred.promise;        
    // }

    function buildIndexes(install) {
        console.log("start to buildIndexes");
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

    // function reIndex(install) {

    //     console.log("start to reIndex");       
        
    //     var playerID = list.getPlayerList()[0]._id,

    //         moveID = list.getMoveList()[1]._id,

    //         promiseList = [];

    //     promiseList.push(dataFetcher.testMovesByPlayer(playerID));       

    //     promiseList.push(pagination.clips().testClips(playerID, moveID));

    //     if(install) {
    //         var search = {                    
    //                 noResult: true                  
    //             },
    //             search1 = {
    //                 player: playerID,
    //                 noResult: true                  
    //             },
    //             search2 = {
    //                 move: moveID,
    //                 noResult: true
    //             },
    //             search3 = {
    //                 player: playerID,                 
    //                 move: moveID,
    //                 noResult: true
    //             };
    //         promiseList.push(pagination.favorite().search(search));
    //         promiseList.push(pagination.favorite().search(search1));
    //         promiseList.push(pagination.favorite().search(search2));
    //         promiseList.push(pagination.favorite().search(search3));
    //     }

    //     return executePromises(promiseList);
    // }

    // function reIndexForInstall() {
    //     //console.log("Start to reIndexForInstall");
    //     return reIndex(true);
    // }

    function initFail() {
        ErrorService.showAlert("启动遇到小问题", "请重启再试。", false);         
    }

    function installFail() {
        ErrorService.showAlert("启动遇到小问题", "请检查网络后再试。", false);         
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
        //return (isCordova() && navigator.connection.type !== Connection.NONE);
    }

    function generateDump() {
        cleanDB()
        .then(syncFromRemote)      
        .then(setupView)
        //.then(setUpIndex)
        .then(buildIndexes)
        //.then(retrieveListsForInstall)
        //.then(reIndexForInstall)
        .then(function(){
            syncToRemote("cliplay_dump_2_26");
        });        
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
        console.log("ready for retrieveAllPlayers");
        var deferred = $q.defer();

        db.allDocs({
            include_docs: true,
            startkey: "player",
            endkey: "player\uffff"            
        }).then(function (result) {
                                
            result = result.rows.map(function(row) {
                row.doc.clipQty = row.doc.clip_total
                return row.doc;
            });

            for(i in result) {                
                if (result[i].star == true) {
                    list.starList.push(result[i]);
                }
            }

            list.setPlayerList(result);

            console.log("retrieveAllPlayers finised all");

            deferred.resolve("All players retrieved");

        }).catch(function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function retrieveAllPlayers_() {
        console.log("ready for retrieveAllPlayers");
        var deferred = $q.defer();

        db.query('players', {reduce: true, group: true, group_level: 2}).then(function (result) {            

            console.log("retrieveAllPlayers finised view");
            
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
                    if (result.rows[i].doc.star == true) {
                        list.starList.push(result.rows[i].doc);
                    }
                }     

                result = result.rows.map(function(row) {
                    return row.doc;
                });

                list.setPlayerList(result);

                console.log("retrieveAllPlayers finised all");

                deferred.resolve("All players retrieved");

            }).catch(function (err) {
                deferred.reject(err);
            });

        }).catch(function (err) {
            console.log(err);
            deferred.reject(err);
        });

        return deferred.promise;
    }

    function refreshAllPlayers() {

        console.log("start to refreshAllPlayers");

        var deferred = $q.defer();

        db.query('players', {reduce: true, group: true, group_level: 2}).then(function (result) {            
            
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
        db = pouchdb.create(string.dbName, {size: 40, adapter: string.dbAdapter, auto_compaction: false});
        //deleteDB();
        //db = pouchdb.create(string.dbName, {adapter: string.dbAdapter});        
        //db = pouchdb.create(string.dbName, {size: 40, adapter: string.dbAdapter, auto_compaction: false});
        //db = pouchdb.create(string.dbName, {auto_compaction: true});
        //db.info().then(console.log.bind(console));
    }

    function syncFromRemote() {
        //console.log("Start to SyncFromRemote from: " + string.remoteURL + string.dbName);        
        return db.replicate.from(string.remoteURL + string.dbName, {timeout: 10000});
    }

    function syncToRemote(dbName) {
        //console.log("Start to syncToRemote from: " + string.remoteURL + string.dbName);
        return db.replicate.to("http://admin:12341234@localhost:5984/" + dbName, {timeout: 3000});   
    }

    function loadDBDump() {
        console.log("Start to loadDBDump");
        
        var deferred = $q.defer();      

        if(isCordova()) {           

            window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + "/" + string.file, 
                function(fileEntry){

                    fileEntry.file(function(file) {
                        var reader = new FileReader();

                        reader.onloadend = function(e) {
                            var option = (!string.installFail && hasNetwork()) ? {proxy: string.remoteURL + string.dbName}: {};
                            deferred.resolve(db.load(this.result, option));                            
                            // deferred.resolve(db.load(this.result));                            
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

    function setupView() {
        //console.log("Start to setupView");
        var designDocs = [];

        designDocs.push(createDesignDoc('players', function (doc) {
            var player, clip;
            if (doc.move_name && doc.clip_player) {
                for (clip in doc.clip_player) {
                    player = doc.clip_player[clip];                                
                    emit(player, clip);
                }
            }
        },"_count"));

        designDocs.push(createDesignDoc('moves', function (doc) {
            var player, clip;
            if (doc.move_name && doc.clip_player && doc.image) {
                for (clip in doc.clip_player) {
                    player = doc.clip_player[clip];                                
                    emit([player, doc.move_name, doc.image, doc.desc, doc._id]);
                }
            }
        },"_count"));

        designDocs.push(createDesignDoc('clips', function (doc) {
            var player, clip;
            if (doc.move_name && doc.clip_player) {
                for (clip in doc.clip_player) {
                    player = doc.clip_player[clip];
                    emit([player, doc._id, clip], clip);
                }
            }
        }));

        designDocs.push(createDesignDoc('local', function (doc) {
            if (doc.type === 'clip') {
                emit(doc._id, {_id : doc.local, desc: doc.desc, name: doc.name, image: doc.image, local: doc.local});
            }
        }));

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

        designDocs.push(createDesignDoc('star', function (doc) {
            if (doc.type === 'player' && doc.star && doc.star == true) {                            
                emit(doc._id, {image: doc.image, name: doc.name});
            }
        }));

        designDocs.push(createDesignDoc('allMoves', function (doc) {
            if (doc.type === 'move') {                
                emit(doc._id, {image: doc.image, name: doc.move_name});
            }
        }));

        var list = [];

        for(i in designDocs) {
            list.push(db.put(designDocs[i]));
        }

        return executePromises(list);
    }  

  //   function setupView_() {
  //       //console.log("Start to setupView");
  //       var ddoc = {
  //           _id: '_design/views',
  //           views: {
  //               players: {
  //                   map: function(doc) {
  //                       var player, clip;
  //                       if (doc.move_name && doc.clip_player) {
  //                           for (clip in doc.clip_player) {
  //                               player = doc.clip_player[clip];                                
  //                               emit(player, clip);
  //                               //emit([player, clip], 1);
  //                           }
  //                       }
  //                   }.toString(),
  //                   reduce: "_count"                
  //               },
  //               moves: {
  //                   map: function(doc) {
  //                       var player, clip;
  //                       if (doc.move_name && doc.clip_player && doc.image) {
  //                           for (clip in doc.clip_player) {
  //                               player = doc.clip_player[clip];                                
  //                               // emit([player, doc.move_name, doc.image, doc.desc, doc._id], 1);
  //                               emit([player, doc.move_name, doc.image, doc.desc, doc._id]);
  //                               //emit([player, doc.move_name, doc.image, doc._id]);
  //                           }
  //                       }
  //                   }.toString(),
  //                   reduce: "_count"
  //                   // reduce: function(key, values, rereduce) {
  //                   //     return sum(values);
  //                   // }.toString()
  //               },
  //               clips: {
  //                   map: function(doc) {
  //                       var player, clip;
  //                       if (doc.move_name && doc.clip_player) {
  //                           for (clip in doc.clip_player) {
  //                               player = doc.clip_player[clip];
  //                               emit([player, doc._id, clip], clip);
  //                           }
  //                       }
  //                   }.toString()                     
  //               },
  //               local: {
  //                   map: function(doc) {      
  //                       if (doc.type === 'clip') {
  //                           emit(doc._id, {_id : doc.local, desc: doc.desc, name: doc.name, image: doc.image, local: doc.local});
  //                       }
  //                   }.toString()
  //               },
  //               favorite: {
  //                   map: function(doc) { 
  //                       if (doc.type === 'local') {
  //                           emit([doc.favorite, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
  //                       }
  //                   }.toString()
  //               },
  //               favorite_player_move: {
  //                   map: function(doc) { 
  //                       if (doc.type === 'local') {
  //                           emit([doc.favorite, doc.player, doc.move, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
  //                       }
  //                   }.toString()
  //               },
  //               favorite_player: {
  //                   map: function(doc) { 
  //                       if (doc.type === 'local') {
  //                           emit([doc.favorite, doc.player, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
  //                       }
  //                   }.toString()
  //               },
  //               favorite_move: {
  //                   map: function(doc) { 
  //                       if (doc.type === 'local') {
  //                           emit([doc.favorite, doc.move, doc.timestamp], {_id : doc.clip, thumb: doc.thumb, timestamp: doc.timestamp});
  //                       }
  //                   }.toString()
  //               },
  //               star: {
  //                   map: function(doc) { 
  //                       if (doc.type === 'player') {
  //                           //emit(doc.star, doc._id, doc.image, doc.name);
  //                           emit(doc.star, {_id: doc._id, image: doc.image, name: doc.name});
  //                           //emit(doc.star, [doc._id, doc.name, doc.image]);
  //                       }
  //                   }.toString()  
  //               },
  //               allMoves: {
  //                   map: function(doc) { 
  //                       if (doc.type === 'move') {
  //                           //emit(doc._id, doc.image, doc.move_name);
  //                           //emit(doc._id);
  //                           emit(doc._id, {image: doc.image, name: doc.move_name});
  //                       }
  //                   }.toString()  
  //               }
  //           }   
  //       };
  //       return db.put(ddoc);
  //   }    

    function setUpIndex() {
        console.log("Start to setupIndex");
    	return db.createIndex({
    		index: {
    			fields: ['type']
    		}
		});
    }
    
    function markInstalled() {
        console.log("Install finished");
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