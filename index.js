const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').createServer(app);
const PORT = process.env.PORT || 3000;

// handle data in a nice way
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const publicPath = path.resolve(`${__dirname}/public`);
const socketioPath = path.resolve(`${__dirname}/node_modules/socket.io-client/dist`);

// set your static server
app.use(express.static(publicPath));
app.use(express.static(socketioPath));

// views
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

// start listening
const server = app.listen(PORT);
console.log('Server is running localhost on port: ' + PORT);

// socket.io
const io = require('socket.io')({
  // "transports": ["xhr-polling"],
  // "polling duration": 0
}).listen(server);

// Network Traversal
// Could also use network traversal service here (Twilio, for example):
let iceServers = [
  { url: "stun:stun.l.google.com:19302" },
  { url: "stun:stun1.l.google.com:19302" },
  { url: "stun:stun2.l.google.com:19302" },
  { url: "stun:stun3.l.google.com:19302" },
  { url: "stun:stun4.l.google.com:19302" },
];

let clients = {};

// socket setup
io.on('connection', client => {
  console.log('User ' + client.id + ' connected, there are ' + io.engine.clientsCount + ' clients connected');

  // add a new client indexed by his id
  clients[client.id] = {
    bodySize: [0, 0, 0],
    headSize: [0, 0, 0],
    armSize: [0, 0, 0],
    legSize: [0, 0, 0],
    color: [0, 0, 0],
    player: {
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 0]
    },
    leftArmPivot: {
      quaternion: [0, 0, 0, 0]
    },
    rightArmPivot: {
      quaternion: [0, 0, 0, 0]
    },
    leftLegPivot: {
      quaternion: [0, 0, 0, 0]
    },
    rightLegPivot: {
      quaternion: [0, 0, 0, 0]
    }
  }

  // SENDERS (client.emit(): sending to sender-client only, io.sockets.emit(): send to all connected clients)

  // make sure to send clients, his ID, and a list of all keys
  client.emit('introduction', clients, client.id, Object.keys(clients), iceServers);

  // RECEIVERS
  client.on('look', (data) => {
    if (clients[client.id]) {
      clients[client.id].bodySize = data[0];
      clients[client.id].headSize = data[1];
      clients[client.id].armSize = data[2];
      clients[client.id].legSize = data[3];
      clients[client.id].color = data[4];
      // update everyone that the number of users has changed
      io.sockets.emit('newUserConnected', clients[client.id], io.engine.clientsCount, client.id);
    }
  });

  client.on('move', (data) => {
    if (clients[client.id]) {
      clients[client.id].player.position = data[0];
      clients[client.id].player.quaternion = data[1];
      clients[client.id].leftArmPivot.quaternion = data[2];
      clients[client.id].rightArmPivot.quaternion = data[3];
      clients[client.id].leftLegPivot.quaternion = data[4];
      clients[client.id].rightLegPivot.quaternion = data[5];
    }
    client.emit('userMoves', clients); // send back to the sender
  });

  // handle the disconnection
  client.on('disconnect', () => {
    delete clients[client.id];
    io.sockets.emit('userDisconnected', client.id);
    console.log('User ' + client.id + ' diconnected, there are ' + io.engine.clientsCount + ' clients connected');
  });

  // from simple chat app:
  // WEBRTC Communications
  client.on("call-user", (data) => {
    console.log(
      "Server forwarding call from " + client.id + " to " + data.to
    );
    client.to(data.to).emit("call-made", {
      offer: data.offer,
      socket: client.id,
    });
  });

  client.on("make-answer", (data) => {
    client.to(data.to).emit("answer-made", {
      socket: client.id,
      answer: data.answer,
    });
  });

  // ICE Setup
  client.on("addIceCandidate", (data) => {
    client.to(data.to).emit("iceCandidateFound", {
      socket: client.id,
      candidate: data.candidate,
    });
  });
});