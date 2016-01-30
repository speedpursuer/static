//Design
//Player
{
   "_id": "player1",
   "type": "player",
   "name": "Michael Jordan",
   "desc": "The great of all time",   
   "image": "http://celebedition.com/wp-content/uploads/2015/02/rs_634x1141-140613051823-634.Michael-Jordan-JR-61314.jpg",
   "moves": ["move1", "move2", "move3"]
}

//Move
{
	"_id": "move1",
	"type": "move",
	"title": "fadeaway",
	"desc": "a good way to prevent block when making throw",
	"clips": {
		"player1": "clip1",
		 	"playerID": "player1",
		 	"clipID": "clip1" 	
		],
		[
		 	"playerID": "player1",
		 	"clipID": "clip1"
		],
	}		
}

//clip
{
	"_id": "clip1",
	"type": "clip",	
	"title": "Fadeaway",
	"desc": "desc",
	"image": "images/1.gif",
	"thumb": "images/1.jpg"
}

//Player_Move_Clip
{		
	"_id": "move1_clip1",
	"playerID": "player1",
	
	"_id": "player1_clip1",
	"MoveID": "move1",
	
	"_id": "player1_move1_clip1",
	"playerID": "player1",
	"MoveID": "move1",
	"clipID": "clip1",
}

//Data
{
   "_id": "player1",
   "name": "Michael Jordan",
   "desc": "The great of all time",
   "type": "player",
   "image": "http://celebedition.com/wp-content/uploads/2015/02/rs_634x1141-140613051823-634.Michael-Jordan-JR-61314.jpg"
}


{
   "_id": "player2",
    "type": "player",
   "name": "Kobe Bryant",
   "desc": "The best player since MJ",
   "image": "http://pic3.nipic.com/20090624/2888748_001522632_2.jpg"
}

{
   "_id": "player3",
    "type": "player",
   "name": "Allen Iverson",
   "desc": "The fastest SG",
   "image": "http://pic22.nipic.com/20120708/10386452_154418470165_2.jpg"
}

{
   "_id": "player4",
       "type": "player",
   "name": "Lebron James",
   "desc": "The greatest SF",
   "image": "http://www.jznews.com.cn/pic/0/10/86/92/10869223_910058.jpg"
}


{
   "_id": "clip1",
   "type": "clip",
   "playerID": "player1",
   "name": "Fadeaway",
   "desc": "desc",
   "image": "images/1.gif",
   "thumb": "images/1.jpg"
}

{
   "_id": "clip2",
   "type": "clip",
   "playerID": "player1",
   "name": "Crossover",
   "desc": "desc",
   "image": "images/2.gif",
   "thumb": "images/2.jpg"
}




var moveList = [
        {_id: 1, playerID: "player1", name: 'Fadeaway', desc: 'desc', image: 'images/1.gif', thumb: "images/1.jpg"},
        {_id: 2, playerID: "player1", name: 'Crossover', desc: 'desc', image: 'images/2.gif', thumb: "images/2.jpg"},
        {_id: 3, playerID: "player1", name: 'Double-crossover', desc: 'desc', image: 'images/3.gif', thumb: "images/3.jpg"},
        {_id: 4, playerID: "player1", name: 'Layup', desc: 'desc', image: 'images/4.gif', thumb: "images/4.jpg"},
        {_id: 5, playerID: "player1", name: 'Fadeaway', desc: 'desc', image: 'images/5.gif', thumb: "images/5.jpg"},
        {_id: 7, playerID: "player3", name: 'Layup', desc: 'desc', image: 'images/7.gif', thumb: "images/7.jpg"},
        {_id: 8, playerID: "player2", name: 'Reverse-Dunk', desc: 'desc', image: 'images/8.gif', thumb: "images/8.jpg"},
        {_id: 9, playerID: "player1", name: 'Stay in air', desc: 'desc', image: 'images/9.gif', thumb: "images/9.jpg"},
    ];