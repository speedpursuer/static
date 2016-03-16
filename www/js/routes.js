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