const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
if (havePointerLock) {
	const element = document.body;
	const pointerlockchange = function (event) {
		if (document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element) {
			controls.enabled = true;
			blocker.style.display = 'none';
		}
		else {
			controls.enabled = false;
			blocker.style.display = '-webkit-box';
			blocker.style.display = '-moz-box';
			blocker.style.display = 'box';
			instructions.style.display = '';
		}
	}
	const pointerlockerror = function (event) {
		instructions.style.display = '';
	}
	// hook pointer lock state change events
	document.addEventListener('pointerlockchange', pointerlockchange, false);
	document.addEventListener('mozpointerlockchange', pointerlockchange, false);
	document.addEventListener('webkitpointerlockchange', pointerlockchange, false);
	document.addEventListener('pointerlockerror', pointerlockerror, false);
	document.addEventListener('mozpointerlockerror', pointerlockerror, false);
	document.addEventListener('webkitpointerlockerror', pointerlockerror, false);
	instructions.addEventListener('click', function (event) {
		instructions.style.display = 'none';

		// ask the browser to lock the pointer
		element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
		if (/Firefox/i.test(navigator.userAgent)) {
			fullscreenchange = function (event) {
				if (document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {
					document.removeEventListener('fullscreenchange', fullscreenchange);
					document.removeEventListener('mozfullscreenchange', fullscreenchange);
					element.requestPointerLock();
				}
			}
			document.addEventListener('fullscreenchange', fullscreenchange, false);
			document.addEventListener('mozfullscreenchange', fullscreenchange, false);
			element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
			element.requestFullscreen();
		} else {
			element.requestPointerLock();
		}
	}, false);
} else {
	instructions.innerHTML = "Your browser doesn't seem to support Pointer Lock API";
}

// socket.io
let socket;
let id;

// array of connected clients
let clients = {};

// Variable to store our three.js scene:
let glScene;

// controls variable
let controls;

////////////////////////////////////////////////////////////////////////////////
// Start-Up Sequence:
////////////////////////////////////////////////////////////////////////////////

window.onload = async () => {
	// then initialize socket connection
	initSocketConnection();

	// finally create the threejs scene
	createScene();
};

////////////////////////////////////////////////////////////////////////////////
// Socket.io
////////////////////////////////////////////////////////////////////////////////

// establishes socket connection
function initSocketConnection() {
	socket = io();
	socket.on('connect', () => { });

	//On connection server sends the client his ID and a list of all keys
	socket.on('introduction', (_id, _clientNum, _ids) => {

		// keep a local copy of my ID:
		console.log('My socket ID is: ' + _id);
		id = _id;

		// for each existing user, add them as a client and add tracks to their peer connection
		for (let i = 0; i < _ids.length; i++) {
			if (_ids[i] != id) {
				addClient(_ids[i]);
			}
		}
	});

	// when a new user has entered the server
	socket.on('newUserConnected', (clientCount, _id, _ids) => {
		console.log(clientCount + ' clients connected');

		let alreadyHasUser = false;
		for (let i = 0; i < Object.keys(clients).length; i++) {
			if (Object.keys(clients)[i] == _id) {
				alreadyHasUser = true;
				break;
			}
		}

		if (_id != id && !alreadyHasUser) {
			console.log('A new user connected with the id: ' + _id);
			addClient(_id);
		}

	});

	socket.on('userDisconnected', (clientCount, _id, _ids) => {
		// Update the data from the server

		if (_id != id) {
			console.log('A user disconnected with the id: ' + _id);
			glScene.removeClient(_id);
			delete clients[_id];
		}
	});

	// Update when one of the users moves in space
	socket.on('userPositions', _clientProps => {
		glScene.updateClientPositions(_clientProps);
	});
}

// Adds client object with THREE.js object, DOM video object and and an RTC peer connection for each :
function addClient(_id) {
	console.log("Adding client with id " + _id);
	clients[_id] = {};

	// add client to scene:
	glScene.addClient(_id);
}

////////////////////////////////////////////////////////////////////////////////
// Three.js
////////////////////////////////////////////////////////////////////////////////

function onPlayerMove() {
	// console.log('Sending movement update to server.');
	socket.emit('move', glScene.getThisPlayerData());
}

function createScene() {
	// initialize three.js scene
	console.log("Creating three.js scene...");
	// add controls:
	controls = new THREE.PlayerControls();
	glScene = new Scene(
		_domElement = document.getElementById('gl_context'),
		_width = window.innerWidth,
		_height = window.innerHeight,
		_clearColor = 'lightblue',
		_contols = controls,
		_movementCallback = onPlayerMove);
}