////////////////////////////////////////////////////////////////////////////////
// global variables
////////////////////////////////////////////////////////////////////////////////

// socket.io
let socket;
let id; //my socket id

// array of connected clients
let clients = {};

// variable to store our three.js scene:
let glScene;

// controls variable
let controls;

////////////////////////////////////////////////////////////////////////////////
// pointer lock
////////////////////////////////////////////////////////////////////////////////

function addPointerLock() {
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
}

////////////////////////////////////////////////////////////////////////////////
// socket.io
////////////////////////////////////////////////////////////////////////////////

// establishes socket connection
function initSocketConnection() {
	socket = io();
	socket.on('connect', () => { });

	// on connection, server sends clients, his ID, and a list of all keys
	socket.on('introduction', (_clientProps, _id, _ids) => {
		// keep a local copy of my ID:
		console.log('My socket ID is: ' + _id);
		id = _id;

		// for each existing user, add them as a client
		for (let i = 0; i < _ids.length; i++) {
			if (_ids[i] != id) { // add all existing clients except for myself
				addClient(_clientProps[_ids[i]], _ids[i]);
			}
		}
	});

	// when a new user has entered the server
	socket.on('newUserConnected', (_clientProp, clientCount, _id) => {
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
			addClient(_clientProp, _id); //add the new client with its id
		}
	});

	socket.on('userDisconnected', (_id) => {
		if (_id != id) {
			removeClient(_id);
		}
	});

	// update when one of the users moves in space
	socket.on('userMoves', _clientProps => {
		glScene.updateClientMoves(_clientProps);
	});
}

// add client object
function addClient(_clientProp, _id) {
	console.log("Adding client with id " + _id);
	clients[_id] = {};
	glScene.addClient(_clientProp, _id);
}

// remove client object
function removeClient(_id) {
	console.log('A user disconnected with the id: ' + _id);
	glScene.removeClient(_id);
	delete clients[_id];
}

////////////////////////////////////////////////////////////////////////////////
// three.js
////////////////////////////////////////////////////////////////////////////////

function createScene() {
	// initialize three.js scene
	console.log("Creating three.js scene...");
	// add controls:
	controls = new THREE.PlayerControls();
	glScene = new Scene(
		_domElement = document.getElementById('gl_context'),
		_width = window.innerWidth,
		_height = window.innerHeight,
		_clearColor = 'skyblue',
		_contols = controls,
		_socket = socket);
}

////////////////////////////////////////////////////////////////////////////////
// start-up
////////////////////////////////////////////////////////////////////////////////

function startButtonClicked() {
	const playerName = document.getElementById("formArea_input").value;
	if (!playerName) {
		alert("Please enter the player name");
	}
	else {
		// hide the start screen
		document.getElementById('startScreen').style.display = 'none';

		// add pointer lock
		addPointerLock();

		// seed random function with the player name
		Math.seedrandom(playerName);

		// initialize socket connection
		initSocketConnection();

		// finally create the threejs scene
		createScene();
	}
}

function playerNameInputKeyDown(event) {
	if (event.keyCode === 13) {
		startButtonClicked();
		event.preventDefault();
		return false;
	}
	else {
		return true;
	}
}

window.onload = async () => {

	//start button listener
	document.getElementById("formArea_button").addEventListener("click", startButtonClicked, false);
};