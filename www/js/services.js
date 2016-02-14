angular.module('app.services', [])


.factory('DBService', function($q, pouchdb, ErrorService, FileCacheService) {

    (function() {
        //deleteDB();
        //syncTo();        
        //setupView();    
        //testFun();
    }());

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
    
    var db = pouchdb.create(string.dbName, {adapter: string.dbAdapter});

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
            // if(this.moveList.length > 0) {
            //     this.moveList.length = 0;
            //     //this.moveList.push.apply(this.moveList, _list);
            //     copyList(this.moveList, _list);
            // }else {
            //     this.moveList = _list; 
            // }      
            this.moveList.length = 0;            
            copyList(this.moveList, _list);
        },

        getMoveList: function() {
            return this.moveList;
        },
        
        setPlayerList: function(_list) {                                          
            // if(this.playerList.length > 0) {
            //     this.playerList.length = 0;
            //     //this.playerList.push.apply(this.playerList, _list);
            //     copyList(this.playerList, _list);
            // }else {
            //     this.playerList = _list; 
            // }
            this.playerList.length = 0
            copyList(this.playerList, _list);
        },

        getPlayerList: function() {
            return this.playerList;
        },

        setFavoriteList: function(_list) {     
            // if(this.favoriteList.length) {
            //     this.favoriteList = this.favoriteList.concat(_list);
            // }else{
            //     this.favoriteList = _list;           
            // }

            // if(this.favoriteList.length > 0) {
            //     //this.favoriteList.length = 0;
            //     //this.playerList.push.apply(this.playerList, _list);
            //     copyList(this.favoriteList, _list);
            // }else {
            //     this.favoriteList = _list; 
            // }                   
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
            limit: 6,    
            descending: true,
            /*
            paginator: {
                currentList: list.clipList,
                noMore: false
            },*/
            init: function(playerID, moveID) {
                this.options = {descending : this.descending, limit : this.limit, endkey: [playerID, moveID], startkey: [playerID, moveID, {}], reduce: true, group: true};
                //this.paginator.noMore = false;
                //this.paginator.currentList.length = 0;
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
                //return this.getClips();
            },
            
            hasNoMore: function() {
                //return this.paginator;
                return this.end;
            },

            // getPaginator: function() {
            //     return this.paginator;
            // },
            
            getClips: function() {

                var deferred = $q.defer();

                var that = this;

                var _options = that.options;
             
                db.query('views/clips', _options).then(function (result) {

                    if (result && result.rows.length > 0) {

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

                            if(result.length < that.limit) {
                                that.end.noMore = true;
                            }else{
                                that.end.noMore = false;
                            }
                            
                            list.setClipList(result);
                            deferred.resolve("More data fetched");
                        }).catch(function (err) {                
                            deferred.reject(err);                
                        });
                    }else{
                        //that.paginator.noMore = true;    
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
             
                db.query('views/clips', _options).then(function (result) {

                    if (result && result.rows.length > 0) {

                        _options.startkey = result.rows[result.rows.length - 1].key;
                        _options.skip = 1;

                        if(result.rows.length < that.limit) {
                            that.end.noMore = true;
                        }else{
                            that.end.noMore = false;
                        }
                                                        
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
                            
                            //that.paginator.currentList.push.apply(that.paginator.currentList, result);                            
                            // deferred.resolve(result);
                            //copyList(that.paginator.currentList, result);
                            list.setClipList(result);
                            deferred.resolve("More data fetched");
                        }).catch(function (err) {                
                            deferred.reject(err);                
                        });
                    }else{
                        //that.paginator.noMore = true;    
                        that.end.noMore = true;            
                        deferred.resolve("No more data");             
                    }
                }).catch(function (err) {
                    deferred.reject(err);
                });

                return deferred.promise;
            }
        },

        favoritePg: {
            options: {},
            end: {
                noMore: true
            },
            limit: 6,
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
                    //this.options = {descending : this.descending, limit : this.limit, include_docs: true, startkey: [true, search.player, search.move], endkey: [true, search.player, search.move, {}]};                
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
                // this.getFavorite()
                // .catch(function() {
                //     ErrorService.showAlert('无法获取数据');
                // }).finally(function() {
                //     //this.inProgress = false;
                //     if(callback) callback();
                // });
            },            
            more: function(callback) {
                //if(this.inProgress) return;
                //this.inProgress = true;
                this.getFavorite()
                .catch(function() {
                    ErrorService.showAlert('无法获取数据');
                }).finally(function() {
                    //this.inProgress = false;
                    if(callback) callback();
                });
            },
            hasNoMore: function() {
                return this.end;
            },
            needLoad: function() {
                //return list.getFavoriteList().length < this.limit? true: false;
                // if(!this.hasMore() && list.getFavoriteList().length < this.limit) {
                //     this.more();
                // }
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
                        _options.skip = 1;

                        if(result.rows.length < that.limit) {
                            that.end.noMore = true;
                        }else{
                            that.end.noMore = false;
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
                ErrorService.showAlert('无法同步数据', '没有可使用的互联网连接。');
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
        isDBInstalled()
        .then(function() {
            syncFromRemote().then(function(){                                   
                retrieveAllPlayers()
                .then(retrieveAllMoves)
                .then(retrieveFavorites)
                //.then(loadMoveImg)
                .then(function() {
                    deferred.resolve("DB Existed");
                }).catch(function(err){                    
                    initFail();
                    deferred.reject("Err in getting init data: " + err);                     
                });
            }).catch(function(){                        
                retrieveAllPlayers()
                .then(retrieveAllMoves)
                .then(retrieveFavorites)
                .then(function() {
                    deferred.resolve("DB Existed");
                    ErrorService.showAlert(string.network_err.title, string.network_err.desc);
                }).catch(function(err){                    
                    initFail();
                    deferred.reject("Err in getting init data: " + err);                     
                });
            });            
        }).catch(function() {
            syncFromRemote()
            .then(setupView)            
            .then(setUpIndex)                    
            .then(retrieveAllPlayers)
            .then(retrieveAllMoves)
            .then(retrieveFavorites)            
            .then(verifyView)
            .then(loadMoveImg)
            .then(markInstalled)    
            .then(function() {
                deferred.resolve("DB Created");
            }).catch(function (err){                
                console.log(err);
                initFail();
                deferred.reject("Err in creating DB" + err);                            
            });
        });
      
        return deferred.promise;        
    };

    function loadMoveImg() {
        return FileCacheService.cacheFiles(list.moveList);
    }

    function verifyView() {
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
        ErrorService.showAlert("无法完成安装", "没有可使用的互联网连接。", true);         
    }

    function retrieveFavorites() {
        return pagination.favorite().init();
    }

    function retrieveAllMoves() {
        return dataFetcher.getMoves();
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

    service.cacheFiles = function(list){

        var promises = [];

        angular.forEach(list , function(item) {

            var promise = cacheFile(item.image);

            promises.push(promise);

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
})

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

.factory('ErrorService', function($rootScope, $ionicModal, $cordovaSplashscreen, $ionicPopup, $ionicLoading, $timeout, NativeService) {
                
         
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
        if(!$rootScope.modal.isShown()){
            $rootScope.modal.show();    
        }        
    };

    service.hideModal = function() {
        if($rootScope.modal.isShown()) {
            $rootScope.modal.hide();
            $rootScope.modal.remove();    
        }
    };

    service.showSplashScreen = function() {
        $cordovaSplashscreen.show();
    };

    service.hideSplashScreen = function() {
        $timeout(function() {
            $cordovaSplashscreen.hide();
        }, 500);   
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