### Nate Thompson
### 15-112 Term_Project Juk Box
### nthompso __ L __ Spring 2014
#asdfsdfasdf

import time
from threading import Thread
from flask import Flask, render_template, session, request
from flask.ext.socketio import SocketIO, emit, join_room, leave_room
from operator import itemgetter
import json

app = Flask(__name__)
app.debug = True
app.config['SECRET_KEY'] = 'secret!'
app.config['HOST'] = '0.0.0.0'

socketio = SocketIO(app)
# Establishes the connection to the webpage
@app.route('/')
def hello_world():
    return render_template('index.html')
    
###############################################################################
########################## webSocketIO Code ###################################
###############################################################################

# All of the code in this section is based off the scaffolding provided by the 
# following address: https://github.com/miguelgrinberg/Flask-SocketIO/blob/mas
# ter/example/app.py. Most of it has been heavily modified to meet my needs

# sets up socket with 'chat' in .js file
#receives text data, then broadcasts it to all parties connected to the server
@socketio.on('chat_event', namespace='/test')
def chat_message(message):
    nate.addToChat(message)
    emit('chat_log', {'data': message['data']}, broadcast=True)

# sets up socket with 'load_music' in .js   
@socketio.on('load_music', namespace='/test')
def loadMusic(message):
    data = message
    # Checking to see if video
    if "title" in data:
        nate.addSongToTrending(data)
        nate.addSongToQueue(data)
    socketio.emit('new_to_queue',
                            data, namespace='/test')
    socketio.emit('new_trend', nate.trending, namespace='/test')

def background_thread():
	# this background thread runs constantly, and will update both time, and if song is
	# still playing, it then resets the votes when a song is skipped
    while True:
        time.sleep(1)
        if (len(nate.queue) > 0):
            data = nate.queue[0]
            nate.stillPlaying = True
            duration = int(data['duration'])
            start_time = time.time()
            while ((time.time()-start_time)<duration) and nate.stillPlaying:
                time.sleep(.5)
                nate.timeInSong = (time.time()-start_time)
                socketio.emit('draw_time', {'songTime': nate.timeInSong, 'duration': duration}, namespace='/test')
            nate.removeSongFromQueue()
            nate.upVotes = 0
            nate.downVotes = 0
            socketio.emit('skip_song', nate.queue, namespace='/test')
            socketio.emit('draw_votes', {'upVotes': nate.upVotes, 'downVotes': nate.downVotes}, namespace='/test')

@socketio.on('add_upVote', namespace='/test')
def addAVote(message):
    val = message['data']
    if (val):
        nate.upVotes += 1
    else:
        nate.upVotes -= 1
    emit('draw_votes', {'upVotes': nate.upVotes, 'downVotes': nate.downVotes}, broadcast=True)
        
@socketio.on('add_downVote', namespace='/test')
def addADownVote(message):
    val = message['data']
    if (val):
        nate.downVotes += 1
        percentDown = (float(nate.downVotes)/nate.peopleInRoom)*100
		# if 50% of users hate the song, skip it
        if percentDown >= 50:
            nate.stillPlaying = False
        else:
            emit('draw_votes', {'upVotes': nate.upVotes, 'downVotes': nate.downVotes}, broadcast=True)
    else:
        nate.downVotes -= 1
        emit('draw_votes', {'upVotes': nate.upVotes, 'downVotes': nate.downVotes}, broadcast=True)
        
#initializes the queue, and the chat, as well as the votes
#also updates the time  
@socketio.on('connect', namespace='/test')
def test_connect():
    songTime = nate.timeInSong
    nate.peopleInRoom += 1
    emit('initialize_queue',
        {'queue':nate.queue, 'songTime':songTime}, namespace='/test')
    emit('initialize_chat',
        nate.chat, namespace='/test')
    emit('new_trend', nate.trending, namespace='/test')
    # emit('chat_log', {'data': 'Users: %s' % (nate.peopleInRoom)}, broadcast=True)
    emit('draw_votes', {'upVotes': nate.upVotes, 'downVotes': nate.downVotes}, broadcast=True)
    
@socketio.on('time_check', namespace='/test')
def checkTime(message):
    time = nate.timeInSong
    emit('return_time', time)
    
# lets everyone know you have left  
@socketio.on('disconnect', namespace='/test')
def test_disconnect():
    nate.peopleInRoom -= 1
    nate.upVotes = 0
    nate.downVotes = 0
    emit('check_votes', '', broadcast=True)
    # emit('chat_log', {'data': 'Users: %s' % (nate.peopleInRoom)}, broadcast=True)
    emit('draw_votes', {'upVotes': nate.upVotes, 'downVotes': nate.downVotes}, broadcast=True)
    print('Client disconnected')

        

###############################################################################
###############################################################################
###############################################################################

class Queue(object):
    def __init__(self):
        # holds onto all of the song information in the room
        self.queue = []
        #not implemented yet
        self.upVotes = 0
        self.downVotes = 0
        self.peopleInRoom = 0
        #sets the time
        self.time = time.time()
        self.serverStart = time.time()
        self.trending = []
        self.timeInSong = 0
        self.stillPlaying = True
        self.chat = []
    
    def addSongToQueue(self, data):
        self.queue.append(data)
    
    def addToChat(self, data):
        self.chat.append(data)
    
    def addSongToTrending(self, data):
        uploadTime = time.time() - self.serverStart
        songId = data['id']
        title = data['title']
        duration = data['duration']
        for trend in xrange(len(self.trending)):
		# updat the trending if the song is already in it
            if self.trending[trend]['songId'] == songId:
                self.trending[trend]['lastUpload'] = uploadTime
                self.trending[trend]['uploaded'] += 1
                self.trending[trend]['sortValue'] = (self.trending[trend]['uploaded'])/(uploadTime)
                self.sortTrending()
                return None
		#  if not add it
        self.trending.append({'title': title, 'songId':songId,'duration': duration,
                              'uploaded': 1, 'lastUpload': uploadTime, 'sortValue': (1/uploadTime)})
        self.sortTrending()
    
    def sortTrending(self):
	# sorted first by uploaded, then by lastUpload
        self.trending = sorted(self.trending, key=itemgetter('uploaded', 'lastUpload'), reverse=True)
            
    def isSongInQueue(self, tubeId):
        return [tubeId in self.queue]
    
    def removeSongFromQueue(self):
        if (len(self.queue) > 0):
            self.queue.pop(0)


if __name__ == '__main__':
    nate = Queue()
    Thread(target=background_thread).start()
    socketio.run(app, host="0.0.0.0")


