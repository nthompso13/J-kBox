///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// YOUTUBE API Already written functions
// https://developers.google.com/youtube/

// This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

// Loads API
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


var player;
var callbackQueue = [];
// useful variable flags to tell the page what is clicked and what not
var noHate = true;
var noLove = true;
var onQueue = true;
var isHelp = false;

// This function creates an <iframe> (and YouTube player)
function onYouTubeIframeAPIReady() {
  // Establishes a new youtube player, for videos
  player = new YT.Player('player', {
	// 16:9 aspect ratio
	playerVars: {
            controls: 0,
			showinfo: 1,
			modestbranding: 0},
    height: '270',
    width: '480',
    // callback for when the player finishes
    // 0: Ended, 1: Playing, 2: Paused
    events: {
	  'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
          }
  });
};

function onPlayerReady(event) {
	// waits for player to be ready, and then for good measure adds some time
	// to make sure the document has loaded as well
	var socket = io.connect('http://' + document.domain + ':' + location.port + '/test');
	setTimeout(function() {
		socket.emit('time_check', '');
		socket.on('return_time', function(time) {
		buildQueue(callbackQueue[0], time)});
	}, 500)
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//  Youtube parser allows you to enter in URLS into the load and they will  
//  still be queued. YoutubeObject rips data from the youtube video, so we 
//  can get title, id, almost anything from the video

// http://stackoverflow.com/questions/3452546/javascript-regex-
// how-to-get-youtube-video-id-from-url
function youtube_parser(url){
	// regex to check if url or if youtube id
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match&&match[7].length==11){
        return match[7];
    }else{
	// if neither, play one of my favorite songs
        return "undefined";
    }
};

// http://stackoverflow.com/questions/5155029/getting-title-and-
// description-of-embedded-youtube-video
function getYoutubeObject(id, callback){
	// strips information using youtube id
	var youTubeURL = ('http://gdata.youtube.com/feeds/api/videos/'+id+'?v=2&alt=json');
    $.ajax({
        'url': youTubeURL,
        'dataType': "json",
        'success': function(data) {
            callback(data);
        }
    });
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// These are all functions written to control the video player
// All self-generated

var queue = [];
var trending = [];
var skipSong = true;
var clearTime = false;
var firstSong = true;

function onPlayerStateChange(event) {
	// Establishes the socket to the port we want
	var socket = io.connect('http://' + document.domain + ':' 
	                         + location.port + '/test');
	unplaying = -1;
	ended = 0;
	playing = 1;
	paused = 2;
	// if ended, either tell everyone to skip or build the empty queue
	if (event.data === ended) {
		$("#time_meter").css({display: 'none'});
		if (queue.length > 0) {
			$("#time").css({width: String(0)+"%"});
		}
		else {
			buildQueue(queue)
		}
	}
	// makes sure that clicking on the player does not pause the player
	else if (event.data === paused) {
		player.playVideo();
	}
	// for central art, is not functioning at the moment
	else if (event.data === playing) {
		$("#player").css({ display:''});
		$("#monkey_player").css({ display:'none'});
		$("#time_meter").css({display:''});
		if (queue.length ===0) {
			player.clearVideo();
		}
	}
	else if (event.data === unplaying) {
		$("#player").css({ display:'none'});
		$("#monkey_player").css({ display:''});
	}
	// makes sure that the player has been built
	stateOfPlayer()
};

// Checks to see if a new song needs to be played
function stateOfPlayer(){
	// This is to protect against Javascript running in parallel
	if ((typeof(player)== "undefined") || (!player.getPlayerState)) {
		setTimeout(stateOfPlayer, 200);
		return;
	}
	// If unstarted, start it, pop it from queue, redraw that queue
	if (player.getPlayerState() < 0){
		if (onQueue) {
			drawQueue();
		}
		else {
			drawTrending();
		}
	}
};

// Queues up the videos to be played
var playYoutube = function(data, time) {
	// check to make sure there is something there
	if (data=== undefined) {
		return;
	}
	// Uncollapse the player
	$("#player").css({ height:'270px', width:'480px'});
	// video to be played
	var youtubeId = data.id;
	// load and then play that video
	player.stopVideo();
	player.loadVideoById({videoId:data.id, startSeconds:time});
	player.playVideo();
	clearTime = false
};


// deletes text upon submition
var deleteText = function(id) {
	document.getElementById(id).value = "";
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Queue Constructor, builds it, loads it, the whole kit and kaboodle
// Everything you could ever want, and more!

function buildQueue(new_queue, time) {
	// this is similar to canvas.delete(ALL)
	$( "#queueLog" ).empty();
	// only draw if queue is clicked
	if (new_queue.length === 0) {
		if (onQueue) {
			drawQueue();
		}
		else {
			drawTrending();
		}
	}
	else {
		// collapse the decal
		$("#monkey_player").css({ display:''});
		for (var i=0; i<new_queue.length; i++) {
			// adds songs to the queue, for initilization, but does not draww
			addToQueue(new_queue[i]);
		}
		// draw that queue!
		if (onQueue) {
			drawQueue();
		}
		else {
			drawTrending();
		}
		playYoutube(queue[0], time)	
	}
};


function buildTrending(new_trending) {
	// passes in the trending list from server and adds it to a new list
	// constantly updating
	if (new_trending.length > 0) {
		trending = [];
		for (var i=0; i<new_trending.length; i++) {
			addToTrending(new_trending[i]);
		}
	}
	// if trend clicked draw it
	if (!onQueue) {
		drawTrending();
	}
};


function drawTrending(){
	// this function is extremely similar to the draw queue function
	// this is similar to canvas.delete(ALL)
	$('#queueLog').empty();
	if (trending.length===0) {	
		$('#queueLog').append('&nbsp;No Music in Trending');
		}
	else {
		for (var i=0; i<trending.length; i++){
			console.log(trending)
			var object = trending[i];
			console.log(object);
			// pulls in the song object, and gets the title and id
			title = object.title;
			console.log(title);
			id = object.songId;
			console.log(id);
			// adding the image to the queue
			var thumbnail = $('<img>');
			// the src is just the url for any youtube thumbnail
			thumbnail.attr('src', "http://img.youtube.com/vi/"+id+"/1.jpg");
			// for css beautification
			thumbnail.attr('class','queueImage');
			// this adds the title
			var item = $('<div>');
			var itemText = $('<div>');
			itemText.text(title);
			itemText.attr('class','queueText');
			// add the text and the thumnail to the div 
			item.append(itemText);
			item.prepend(thumbnail);
			// for css beautification
			item.attr('class','queueElem');
			$('#queueLog').append(item);
		}
	}
};


function addToTrending(object) {
	trending.push(object);
};

function addToQueue(object) {
	queue.push(object);
};

function drawChat(msg) {
	    // Regex pulls the name and data from what is being sent
		var regex = msg.data.match(/([^:]+)(.+)?/);
		// for security measures
		if (regex.length<3) {
			var newline=$("<div>").text(msg.data);
		}
		// else add in the name, bolded, and text
		else {
			// for friends to have cool colors
			var bram = ["bram", "Bram"];
			var nate = ["nate", "Nate"];
			var ash  = ['ash', "Ash"];
			var stef = ['stef', 'Stef']
			var name = regex[1];
			var msg = regex[2];
			var newline = $('<div>');
			var nameSpan = $('<span>').text(name).addClass('name');
			if (bram.indexOf(name)>-1) nameSpan.addClass('bram');
			else if (nate.indexOf(name)>-1) nameSpan.addClass('nate');
			else if (ash.indexOf(name)>-1) nameSpan.addClass('ash');
			else if (stef.indexOf(name)>-1) nameSpan.addClass('stef');
			// add that message
			var msgSpan = $('<span>').text(msg);
			newline.append(nameSpan).append(msgSpan);
		}
		// chat rolls from top down
        $('#chatLog').prepend(newline);
}

function drawQueue(){
	// this is similar to canvas.delete(ALL)
	$('#queueLog').empty();
	if (queue.length<=1) {	
		// collapses the player
		// lets the user know there are no songs in the queue
		$('#queueLog').append('&nbsp;No Music in Queue');
		if (queue.length === 0) {
				$("#player").css({ display:'none'});
				$("#monkey_player").css({ display:''});
				$("#time_meter").css({display: 'none'});
				$("#decal").css({ display:''});
		}
	}
	else {
		for (var i=1; i<queue.length; i++){
			var object = queue[i];
			// pulls in the song object, and gets the title and id
			title = object.title;
			id = object.id;
			// adding the image to the queue
			var thumbnail = $('<img>');
			// the src is just the url for any youtube thumbnail
			thumbnail.attr('src', "http://img.youtube.com/vi/"+id+"/1.jpg");
			// for css beautification
			thumbnail.attr('class','queueImage');
			// this adds the title
			var item = $('<div>');
			var itemText = $('<div>');
			itemText.text(title);
			itemText.attr('class','queueText');
			// add the text and the thumnail to the div 
			item.append(itemText);
			item.prepend(thumbnail);
			// for css beautification
			item.attr('class','queueElem');
			$('#queueLog').append(item);
		}
	}
};

function drawInstructions() {
	// most of this is all CSS data, all you need to know is that
	// the istructions create a white overlay that lays on top 
	// for five seconds then fades out
	isHelp = true;
	var instructions = $('<div>');
	instructions.css({
		position: 'absolute',
		top: '0',
		padding:'0',
		fontSize: '40px',
		margin: '0',
		bottom: '0',
		height: '100%',
		width: '100%',
		background: 'rgba(255,255,255,.95)'
	});
	var chat = $('<div>');
	chat.text('Type Messages to Use Chat');
	chat.css({
		position: 'absolute',
		width: '300px',
		left: '1%',
		bottom: '130px',
		textAlign: 'center'
	});
	var welcome_message = $('<div>');
	welcome_message.text('Welcome To Jük Box! The Collaborative Youtube Experience');
	welcome_message.css({
		zIndex: '1',
		width: '400px',
		marginRight: 'auto',
		marginLeft: 'auto',
		bottom: '130px',
		textAlign: 'center'
	});
	var music = $('<div>');
	music.text('Upload Youtube URLS Here');
	music.css({
		position: 'absolute',
		width: '300px',
		right: '1.2%',
		bottom: '130px',
		textAlign: 'center'
	});
	instructions.append(welcome_message);
	instructions.append(chat);
	instructions.append(music);
	$('body').append(instructions);
	setTimeout(function(){
		instructions.fadeOut(500,function(){$(this).remove()});
		isHelp = false;
	}, 5000)
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// This code is based off of the code given by the following url. 
// https://github.com/miguelgrinberg/Flask-SocketIO/blob/master/example/app.py
// Cannot cite exactly what I used, as it is mostly scaffolding for the 
// functions that I wrote


$(document).ready(function(){
    // establish the socket
    var socket = io.connect('http://' + document.domain + ':' + location.port + '/test');

	////////////////////////////////////////////
	// REACTIONS TO THE SERVER GENERATED EVENTS
	////////////////////////////////////////////
	
	/////////////////
	// CHAT UPDATES
	////////////////
	// receives the chat messages from the server and logs them
	// drawChat pulls all of the saved data and draws it for 
	// persistent chat
    socket.on('chat_log', function(msg) {
		drawChat(msg);
    });
	
	// pulls all of the previous messages onto the server
	socket.on('initialize_chat', function(data) {
		for (var i in data) {
			drawChat(data[i]);
		}
	});
	
	/////////////////
	// SONG UPDATES
	////////////////
	
	socket.on('skip_song', function(data) {
		// pops it from the list, stops the song, reloads the votes
		// and then redraws everything while playing the next song
		queue.shift();
		player.stopVideo();
		if (queue===0) {
			player.clearVideo();
		}
		$("#time").css({width: "0%"})
		noHate = true;
		noLove = true;
		// allows for loading
		$('#downVote').toggleClass('hatedtextbutton', false);
		$('#upVote').toggleClass('lovedtextbutton', false);
		setTimeout(function() {
				playYoutube(data[0], 0);
			}, 400);
		if (onQueue) {
			drawQueue();
		}
		else {
			drawTrending();
		}
});
	
	socket.on('draw_votes', function(data) {
		// pulls in all of the votes from everyone on the server 
		// and draws it on the meter
		// if no votes, just put meter in the center
		upVotes = data['upVotes'];
		downVotes = data['downVotes'];
		votes = upVotes + downVotes;
		if (votes === 0) {
			$("#upVotesBar").css({width: "50%"});
			$("#downVotesBar").css({width: "50%"});
		}
		else {
			upVote_percent = upVotes/votes*100;
			$("#upVotesBar").css({width: String(upVote_percent)+"%"});
			$("#downVotesBar").css({width: String(100-upVote_percent)+"%"});
		}
	})
	
	socket.on('reset_votes', function(data) {
		noLove = true;
		noHate = true;
	})
	
	socket.on('check_votes', function(data) {
		// for if someone disconnects, tells server that this is what
		// you voted
		if (!noLove) {
			socket.emit('add_upVote', {data: 1});
		}
		else if (!noHate) {
			socket.emit('add_downVote', {data: 1});
		}
	})
	// pulls time from the server
	socket.on('draw_time', function(data) {
		duration = data['duration'];
		songTime = data['songTime'];
		percent = songTime/duration*100;
		$("#time").css({width: String(percent)+"%"})
	})
	
	/////////////////
	// QUEUE UPDATES
	////////////////
    socket.on('initialize_queue', function(data) {
		//builds up the queue, and tells the player where to start the song
		$('#queue_button').toggleClass('clickedtextbutton');
		callbackQueue.push(data.queue); 
		callbackQueue.push(data.songTime);	
    });

	socket.on('new_to_queue', function(data) {
		// if nothing in the queue, add something to it and change the time
		// time is changed to update when new song was played
		if (queue.length === 0) {
			addToQueue(data);
			playYoutube(data, 0);
		}
		else {
			// otherwise just add the song and redraw the queue
			addToQueue(data);
			if (onQueue) {
				drawQueue();
			}
			else {
				drawTrending();
			}
			
		}   
    });
	socket.on('new_trend', function(data) {
		console.log(data);
		buildTrending(data);
	});
	
	////////////////////////////////////////////
	// CLIENT GENERATED EVENTS
	////////////////////////////////////////////
	
	/////////////////
	// CHAT UPDATES
	////////////////
	$('form#chatform').submit(function(event) {
		var name = $('#chat_name').val();
		// dont allow for non message spamming
		if ($('#chat_data').val()==="") {
			return false;
		}
		// if no name, make it annonymous
		name = name ? name : "Anonymous";
		// send data to the server of name and msg data
		socket.emit('chat_event', {data: name+': '+$('#chat_data').val()});
		// clears the text box
		deleteText('chat_data');
		return false;
	    });
	
	/////////////////
	// SONG UPDATES
	////////////////
    $('form#music').submit(function(event) {
		var id = $('#music_data').val();
		// if nothing return false
		if (id == '') return false;
		// If not length of id, must be url
		id = id.length != 11 ? youtube_parser(id) : id;
		if (id == 'undefined') {
			deleteText('music_data');
			alert("Invalid Youtube URL");
			return false;
		}
		for (var i=0; i<queue.length; i++) {
			if ( id === queue[i].id) {
				deleteText('music_data');
				return false;
			}
		}
		// Rips the title and id from the youtube object, sends it as dict
		getYoutubeObject(id, function(json){
			socket.emit('load_music', {
				id: id,
				title: json.entry.title.$t,
				duration: json.entry.media$group.yt$duration.seconds
			});
		});
		// clears the textbox
        deleteText('music_data');
        return false;
    });
	$('#queue_button').click(function(event) {
		if (!onQueue) {
			$('#trending').toggleClass('clickedtextbutton');
			$('#queue_button').toggleClass('clickedtextbutton');
		}
		onQueue = true;
		drawQueue();
		return false;
	});
	$('#trending').click(function(event) {
		if (onQueue) {
			$('#trending').toggleClass('clickedtextbutton');
			$('#queue_button').toggleClass('clickedtextbutton');
		}
		onQueue = false;
		drawTrending();
		return false;
	});
	$('#instructions').click(function(event) {
		if (!isHelp) {
			drawInstructions();
			$('#instructions').css({border: '1px solid black'})
		}
		return false;
	});
	// allows for each person to decide whether or not you mute
	$('#mute').click(function(event) {
		if (player.getVolume() > 0) {
			player.setVolume(0);
			var muteButton = document.getElementById('mute');
			//changes button value to unmute
			muteButton.value = 'UnMute'
		}
		else {
			// reset the volume
			player.setVolume(100);
			var muteButton = document.getElementById('mute');
			muteButton.value = 'Mute';
		}
	    return false;
	});
	$('#upVote').click(function(event) {
		if (queue.length > 0) {
			if (noLove) {
				noLove = false;
				socket.emit('add_upVote', {data: 1});
				if (!noHate) {
					noHate = true;
					socket.emit('add_downVote', {data: 0});
					$('#downVote').toggleClass('hatedtextbutton');
				}
			}
			else {
				noLove = true;
				socket.emit('add_upVote', {data: 0});
			}
			$('#upVote').toggleClass('lovedtextbutton');
		}
		return false;
	});
	$('#downVote').click(function(event) {
		if (queue.length > 0) {
			if (noHate) {
				noHate = false;
				socket.emit('add_downVote', {data: 1});
				if (!noLove) {
					noLove = true;
					socket.emit('add_upVote', {data: 0});
					$('#upVote').toggleClass('lovedtextbutton');
				}
			}
			else {
				noHate = true;
				socket.emit('add_downVote', {data: 0});
			}
			$('#downVote').toggleClass('hatedtextbutton');
		}
		return false;
	});
});


