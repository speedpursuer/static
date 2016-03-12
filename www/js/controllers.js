angular.module('app.controllers', [])

.controller('RootCtrl', ['$scope', '$state', '$timeout', function($scope, $state, $timeout) {
	
	(function() {
		cacheViews();
	}());	  

	$scope.retry = function() {
  		cacheViews();  	
  	};

  	function cacheViews() {		
		$state.go("tabsController.players");
  	}
}])

.controller('StarsCtrl', ['$scope', '$ionicSlideBoxDelegate', '$state', 'ErrorService', 'DBService', function($scope, $ionicSlideBoxDelegate, $state, ErrorService, DBService) {
  	
 	$scope.stars = DBService.list().getStarList();
	$ionicSlideBoxDelegate.update();
	$ionicSlideBoxDelegate.slide(0);						

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

	$scope.$on("$ionicView.loaded", function() {
    	$timeout(function() {
    		$scope.$broadcast('scroll.refreshStart');
    	}, 300);    
  	});

	$scope.players = DBService.list().getPlayerList();
	ErrorService.hideSplashScreen();

	$scope.doRefresh = function() {
		DBService.remoteDB().syncRemote(function() {
			$scope.$broadcast('scroll.refreshComplete');
		});
	};	
		
	$scope.showMoves = function(playerID, playerName) {
		$state.go("tabsController.tab2Moves", {playerID: playerID, playerName: playerName});
	};

	$scope.myFilter = function (item) { 
	    return item.clip_total > 0; 
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

}])