// https://github.com/wspringer/angular-pouchdb

/*
 The MIT License

 Copyright (c) 2013-2014 Wilfred Springer, http://nxt.flotsam.nl/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */


(function() {
  var concat, exists, indexOf, pouchdb, slice, sortedIndex;

  pouchdb = angular.module('pouchdb', ['ng']);

  slice = Array.prototype.slice;

  concat = Array.prototype.concat;

  sortedIndex = function(array, value, callback) {
    var high, low, mid;
    low = 0;
    high = array != null ? array.length : low;
    callback = callback || identity;
    value = callback(value);
    while (low < high) {
      mid = (low + high) >>> 1;
      if (callback(array[mid]) < value) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  };

  indexOf = function(array, cond) {
    var pos;
    pos = 0;
    while (pos < array.length && !cond(array[pos])) {
      pos = pos + 1;
    }
    if (pos < array.length) {
      return pos;
    } else {
      return -1;
    }
  };

  exists = function(array, cond) {
    return indexOf(array, cond) >= 0;
  };

  pouchdb.provider('pouchdb', function() {
    return {
      withAllDbsEnabled: function() {
        return PouchDB.enableAllDbs = true;
      },
      $get: function($q, $rootScope, $timeout) {
        var qify;
        qify = function(fn) {
          return function() {
            var args, callback, deferred;
            deferred = $q.defer();
            callback = function(err, res) {
              return $timeout(function() {
                if (err) {
                  return deferred.reject(err);
                } else {
                  return deferred.resolve(res);
                }
              });
            };
            args = arguments != null ? slice.call(arguments) : [];
            args.push(callback);
            fn.apply(this, args);
            return deferred.promise;
          };
        };
        return {
          create: function(name, options) {
            var db;
            db = new PouchDB(name, options);
            return {
              id: db.id,
              put: qify(db.put.bind(db)),
              post: qify(db.post.bind(db)),
              get: qify(db.get.bind(db)),
              remove: qify(db.remove.bind(db)),
              bulkDocs: qify(db.bulkDocs.bind(db)),
              allDocs: qify(db.allDocs.bind(db)),
              changes: function(options) {
                var clone;
                clone = angular.copy(options);
                clone.onChange = function(change) {
                  return $rootScope.$apply(function() {
                    //return options.onChange(change);
                  });
                };
                return db.changes(clone);
              },
              putAttachment: qify(db.putAttachment.bind(db)),
              getAttachment: qify(db.getAttachment.bind(db)),
              removeAttachment: qify(db.removeAttachment.bind(db)),
              query: qify(db.query.bind(db)),
              info: qify(db.info.bind(db)),
              compact: qify(db.compact.bind(db)),
              revsDiff: qify(db.revsDiff.bind(db)),
              replicate: {
                to: db.replicate.to.bind(db),
                from: qify(db.replicate.from.bind(db)),
                sync: db.replicate.sync.bind(db)
              },
              destroy: qify(db.destroy.bind(db)),
              // createIndex: qify(db.createIndex.bind(db)),
              // find: qify(db.find.bind(db)),
              on: qify(db.on.bind(db)),
              viewCleanup: qify(db.viewCleanup.bind(db)),
              load: qify(db.load.bind(db)),
            };
          }
        };
      }
    };
  });

  pouchdb.directive('pouchRepeat', function($parse, $animate) {
    return {
      transclude: 'element',
      priority: 10,
      compile: function(elem, attrs, transclude) {
        return function($scope, $element, $attr) {
          var add, blocks, collection, cursor, fld, getters, modify, parent, remove, sort, top, vectorOf, _ref;
          parent = $element.parent();
          top = angular.element(document.createElement('div'));
          parent.append(top);
          _ref = /^\s*([a-zA-Z0-9]+)\s*in\s*([a-zA-Z0-9]+)\s*(?:order by\s*([a-zA-Z0-9\.,]+))?$/.exec($attr.pouchRepeat).splice(1), cursor = _ref[0], collection = _ref[1], sort = _ref[2];
          blocks = [];
          vectorOf = sort != null ? (getters = (function() {
            var _i, _len, _ref1, _results;
            _ref1 = sort.split(',');
            _results = [];
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
              fld = _ref1[_i];
              _results.push($parse(fld));
            }
            return _results;
          })(), function(doc) {
            var getter, _i, _len, _results;
            _results = [];
            for (_i = 0, _len = getters.length; _i < _len; _i++) {
              getter = getters[_i];
              _results.push(getter(doc));
            }
            return _results;
          }) : null;
          add = function(doc) {
            var childScope;
            childScope = $scope.$new();
            childScope[cursor] = doc;
            return transclude(childScope, function(clone) {
              var block, index, last, preceding;
              block = {
                doc: doc,
                clone: clone,
                scope: childScope,
                vector: vectorOf != null ? vectorOf(doc) : null
              };
              last = blocks[blocks.length - 1];
              if (vectorOf != null) {
                index = sortedIndex(blocks, block, function(block) {
                  return block.vector;
                });
                preceding = index > 0 ? blocks[index - 1] : null;
                $animate.enter(clone, parent, preceding != null ? preceding.clone : top);
                return blocks.splice(index, 0, block);
              } else {
                blocks.push(block);
                if (last != null) {
                  return $animate.enter(clone, parent, last.clone);
                } else {
                  return $animate.enter(clone, parent, top);
                }
              }
            });
          };
          modify = function(doc) {
            var block, idx, newidx;
            idx = indexOf(blocks, function(block) {
              return block.doc._id === doc._id;
            });
            block = blocks[idx];
            block.scope[cursor] = doc;
            if (vectorOf != null) {
              block.vector = vectorOf(doc);
              blocks.splice(idx, 1);
              newidx = sortedIndex(blocks, block, function(block) {
                return block.vector;
              });
              blocks.splice(newidx, 0, block);
              return $animate.move(block.clone, parent, newidx > 0 ? blocks[newidx - 1].clone : top);
            }
          };
          remove = function(id) {
            var block, idx;
            idx = indexOf(blocks, function(block) {
              return block.doc._id === id;
            });
            block = blocks[idx];
            if (block != null) {
              return $animate.leave(block.clone, function() {
                return block.scope.$destroy();
              });
            }
          };
          return $scope.$watch(collection, function() {
            var process;
            process = function(result) {
              var row, _i, _len, _ref1, _results;
              _ref1 = result.rows;
              _results = [];
              for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                row = _ref1[_i];
                _results.push(add(row.doc));
              }
              return _results;
            };
            $scope[collection].allDocs({
              include_docs: true
            }).then(process);
            $scope[collection].info().then(function(info) {
              return $scope[collection].changes({
                include_docs: true,
                continuous: true,
                since: info.update_seq,
                onChange: function(update) {
                  if (update.deleted) {
                    return remove(update.doc._id);
                  } else {
                    if (exists(blocks, function(block) {
                        return block.doc._id === update.doc._id;
                      })) {
                      return modify(update.doc);
                    } else {
                      return add(update.doc);
                    }
                  }
                }
              });
            });
          });
        };
      }
    };
  });

}).call(this);
