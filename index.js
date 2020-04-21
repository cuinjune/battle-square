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
const io = require('socket.io').listen(server);

let clients = {};

//Socket setup
io.on('connection', client => {

  console.log('User ' + client.id + ' connected, there are ' + io.engine.clientsCount + ' clients connected');

  //Add a new client indexed by his id
  clients[client.id] = {
    // could these be threejs objects? (e.g. THREE.Object3D)
    initPlayerPositionY: 0,
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

  //Make sure to send the client it's ID / number of Clients / total IDs
  client.emit('introduction', client.id, io.engine.clientsCount, Object.keys(clients));

  //Update everyone that the number of users has changed
  io.sockets.emit('newUserConnected', io.engine.clientsCount, client.id, Object.keys(clients));

  //Handle the disconnection
  client.on('disconnect', () => {
    //Delete this client from the object
    delete clients[client.id];
    io.sockets.emit('userDisconnected', io.engine.clientsCount, client.id, Object.keys(clients));
    console.log('User ' + client.id + ' diconnected, there are ' + io.engine.clientsCount + ' clients connected');
  });

  // also give the client all existing clients positions:
  client.emit('userPositions', clients);

  client.on('move', (data) => {
    if (clients[client.id]) {
      // way to simplify the copying process?
      clients[client.id].initPlayerPositionY = data[0];
      clients[client.id].player.position = data[1];
      clients[client.id].player.rotation = data[2];
      clients[client.id].leftArmPivot.rotation = data[3];
      clients[client.id].rightArmPivot.rotation = data[4];
      clients[client.id].leftLegPivot.rotation = data[5];
      clients[client.id].rightLegPivot.rotation = data[6];
    }
    io.sockets.emit('userPositions', clients);
  });
});
