const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').createServer(app);
const PORT = 3000;

// Handle data in a nice way
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const publicPath = path.resolve(`${__dirname}/public`);
const socketioPath = path.resolve(`${__dirname}/node_modules/socket.io-client/dist`);

// Set your static server
app.use(express.static(publicPath));
app.use(express.static(socketioPath));

// Views
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

// Start listening
const server = app.listen(PORT);
console.log('Server is running localhost on port: ' + PORT);

// Socket.io
const io = require('socket.io')({
  // "transports": ["xhr-polling"],
  // "polling duration": 0
}).listen(server);

let clients = {};

//Socket setup
io.on('connection', client => {

  console.log('User ' + client.id + ' connected, there are ' + io.engine.clientsCount + ' clients connected');

  //Add a new client indexed by his id
  clients[client.id] = { // better to use three.js types instead?
    bodySize: [0, 0, 0],
    headSize: [0, 0, 0],
    armSize: [0, 0, 0],
    legSize: [0, 0, 0],
    color: [0, 0, 0],
    player: {
      position: [0, 0, 0],
      rotation: [0, 0, 0]
    },
    leftArmPivot: {
      rotation: [0, 0, 0]
    },
    rightArmPivot: {
      rotation: [0, 0, 0]
    },
    leftLegPivot: {
      rotation: [0, 0, 0]
    },
    rightLegPivot: {
      rotation: [0, 0, 0]
    }
  }

  // SENDERS (client.emit(): sending to sender-client only, io.sockets.emit(): send to all connected clients)

  // make sure to send clients, his ID, and a list of all keys
  client.emit('introduction', clients, client.id, Object.keys(clients));

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
      clients[client.id].player.rotation = data[1];
      clients[client.id].leftArmPivot.rotation = data[2];
      clients[client.id].rightArmPivot.rotation = data[3];
      clients[client.id].leftLegPivot.rotation = data[4];
      clients[client.id].rightLegPivot.rotation = data[5];
    }
    client.emit('userMoves', clients); // send back to the sender
  });

  // handle the disconnection
  client.on('disconnect', () => {
    // delete this client from the object
    delete clients[client.id];
    io.sockets.emit('userDisconnected', client.id);
    console.log('User ' + client.id + ' diconnected, there are ' + io.engine.clientsCount + ' clients connected');
  });

});
