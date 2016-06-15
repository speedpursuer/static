angular.module('app.controllers', [])

.controller('RootCtrl', ['$scope', '$state', '$timeout', '$ionicHistory', function($scope, $state, $timeout, $ionicHistory) {
	
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
  	
  	if(ionic.Platform.isAndroid()) {
  		$ionicHistory.nextViewOptions({
        	disableAnimate: true,
        	disableBack: true
	    });
  	}  	
}])

.controller('StarsCtrl', ['$scope', '$ionicSlideBoxDelegate', '$state', 'ErrorService', 'DBService', function($scope, $ionicSlideBoxDelegate, $state, ErrorService, DBService) {
  	
 	$scope.stars = DBService.list().getStarList();
	$ionicSlideBoxDelegate.update();
	$ionicSlideBoxDelegate.slide(0);						

 	$scope.showMoves = function(playerID, playerName) {
		// $state.go("tabsController.moves", {playerID: playerID, playerName: playerName});
		DBService.getGaleryByPlayer(playerID, playerName);
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
		DBService.playClipsByMove($stateParams.playerID, moveID, moveName);
	};

}])

.controller('Tab2MovesCtrl', ['$scope', '$stateParams', 'moves', 'DBService', function($scope, $stateParams, moves, DBService) {
	$scope.moves = moves;
	$scope.playerName = $stateParams.playerName;

	$scope.showClips = function(moveName, moveID) {
		//$state.go("tabsController.tab2Clips", {playerID: $stateParams.playerID, moveName: moveName, moveID: moveID});
		DBService.playClipsByMove($stateParams.playerID, moveID, moveName);
	};

	// $scope.showClips = function(moveName, moveID) {
	// 	$state.go("tabsController.tab2Clips", {playerID: $stateParams.playerID, moveName: moveName, moveID: moveID});
	// };

}])

.controller('NewsCtrl', ['$scope', '$state', '$stateParams', 'DBService', 'ErrorService', '$timeout', function($scope, $state, $stateParams, DBService, ErrorService, $timeout) {	

	$scope.noMoreItemsAvailable = DBService.pagination().news().hasNoMore();
 	$scope.news = DBService.list().getNewsList();

 	ErrorService.hideSplashScreen();

 	var firstTime = true;

 	$scope.loadMore = function() { 
		DBService.pagination().news().more(function() {
			$scope.$broadcast('scroll.infiniteScrollComplete');
		});
  	};	

	$scope.showClips = function(index) {
		// DBService.readNews($scope.news[index])
		// .finally(function(){
		// 	DBService.play().playPost($scope.news[index]);			
		// });
		DBService.playNews($scope.news[index]);		
	};

	$scope.doRefresh = function() {
		DBService.remoteDB().syncRemote(function() {
			$scope.$broadcast('scroll.refreshComplete');
			if(firstTime) {
				DBService.checkPush();
				firstTime = false;
			}
		});
	};

	$scope.cleanCache = function() {
		ErrorService.showAlert("删除已下载短片", "释放磁盘空间", true);
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

	$scope.playPlay = function(item) {
		// NativeService.playPlay($scope.plays[index].image);	
		// DBService.play().playPlay($scope.plays[index].image);
		DBService.play().playPlay(item.image);
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

	$scope.play = function(item) {		
		// DBService.play().playPost($scope.skills[index].image);
		// DBService.play().playArticle($scope.skills[index]);
		DBService.play().playArticle(item);
	};
}])