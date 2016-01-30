angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise('/tab/stars');

  $stateProvider

    .state('tabsController', {
      url: '/tab',
      abstract:true,
      templateUrl: 'templates/tabsController.html',
      resolve: {
      init: function($stateParams, DBService) {
          return DBService.init();
        },
        /*
        init: function($stateParams, DBService) {
          return DBService.init();
        },        
        init: function($stateParams, FavoriteService) {
          return FavoriteService.setItems();
        }*/
      },
    })
        
    .state('tabsController.stars', {
      url: '/stars',
      resolve: {
        stars: function($stateParams, DBService, init) {
          return DBService.getStars();
        }
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
        moves: function($stateParams, DBService) {
          return DBService.getMovesByPlayer($stateParams.playerID);
        }
      },
      views: {
        'tab1': {
          controller: 'MovesCtrl',
          templateUrl: 'templates/moves.html',
        }
      }
    })  

    .state('tabsController.clips', {      
      url: '/clips/:playerID, :playerName, :moveName',
      resolve: {
        clips: function($stateParams, DBService) {          
          //return DBService.getClipsByPlayer($stateParams.playerID, $stateParams.moveName);          
          return DBService.getClipsByPlayerInit($stateParams.playerID, $stateParams.moveName);          
          //return DBService.clips($stateParams.playerID, $stateParams.moveName).more();
        }
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
        moves: function($stateParams, DBService) {
          return DBService.getMovesByPlayer($stateParams.playerID);
        }
      },
      views: {
        'tab2': {
          controller: 'Tab2MovesCtrl',
          templateUrl: 'templates/moves.html',
        }
      }
    })  

    .state('tabsController.tab2Clips', {
      url: '/clips2/:playerID, :playerName, :moveName',
      resolve: {
        clips: function($stateParams, DBService) {
          //return DBService.getClipsByPlayer($stateParams.playerID, $stateParams.moveName);          
          return DBService.getClipsByPlayerInit($stateParams.playerID, $stateParams.moveName);
        }
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
      /*
      resolve: {
        clips: function(DBService) {          
          return DBService.getAllClips();          
        }
      },*/
      views: {
        'tab3': {
          controller: 'NewsCtrl',
          templateUrl: 'templates/news.html',
        }
      }
    }) 
  
    .state('tabsController.favorite', {
      url: '/favorite',
      /*
      cache: false,
      resolve: {
        clips: function(DBService) {
          return DBService.getFavorite();         
        }
      },*/
      views: {
        'tab4': {
          controller: 'FavorateCtrl',
          templateUrl: 'templates/favorite.html',
        }
      }
    })
});


/*
 .state('tabsController.play', {
      url: '/play/:fileURL, :clipID',      
      resolve: {
        gif: function($stateParams, ClipService) {
          return ClipService.loadFile($stateParams.fileURL);
        }
      },
      //cache: false,
      onExit: function(ClipService, gif){
        ClipService.destroy(gif);           
      },
      views: {
        'tab1': {
          controller: 'PlayCtrl',
          templateUrl: 'templates/play.html',
        }
      }
    })

  .state('tabsController.tab2play', {
      url: '/play/:fileURL, :clipID',     
      
      resolve: {
        gif: function($stateParams, ClipService) {
          //screen.unlockOrientation();
        return ClipService.loadFile($stateParams.fileURL);
        }
      },
      onExit: function(ClipService, gif){
        ClipService.destroy(gif); 
      },
      views: {
        'tab2': {
          controller: 'PlayCtrl',
          templateUrl: 'templates/play.html',
        }
      }
    })

  .state('tabsController.tab3play', {
      url: '/play/:fileURL, :clipID',
      resolve: {
        gif: function($stateParams, ClipService) {
          return ClipService.loadFile($stateParams.fileURL);
        }
      },
      onExit: function(ClipService, gif){
        ClipService.destroy(gif);     
      },
      views: {
        'tab3': {
          controller: 'PlayCtrl',
          templateUrl: 'templates/play.html',
        }
      }
    })

*/