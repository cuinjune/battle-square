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

// WebRTC Variables:
const { RTCPeerConnection, RTCSessionDescription } = window;
let iceServerList;

// set video width / height / framerate here:
const videoWidth = 80;
const videoHeight = 60;
const videoFrameRate = 15;

// Our local media stream (i.e. webcam and microphone stream)
let localMediaStream = null;

// Constraints for our local audio/video stream
let mediaConstraints = {
	audio: true,
	video: {
		width: videoWidth,
		height: videoHeight,
		frameRate: videoFrameRate,
	},
};

// controls variable
let controls;

////////////////////////////////////////////////////////////////////////////////
// pointer lock
////////////////////////////////////////////////////////////////////////////////

function addPointerLock() {
	controls = new THREE.PlayerControls();
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
// Local media stream setup
////////////////////////////////////////////////////////////////////////////////

// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
async function getMedia(_mediaConstraints) {
	let stream = null;

	try {
		stream = await navigator.mediaDevices.getUserMedia(_mediaConstraints);
	} catch (err) {
		console.log("Failed to get user media!");
		console.warn(err);
	}

	return stream;
}

function addTracksToPeerConnection(_stream, _pc) {
	if (_stream == null) {
		console.log("Local User media stream not yet established!");
	} else {
		_stream.getTracks().forEach((track) => {
			_pc.addTrack(track, _stream);
		});
	}
}

////////////////////////////////////////////////////////////////////////////////
// socket.io
////////////////////////////////////////////////////////////////////////////////

// establishes socket connection
function initSocketConnection() {
	console.log("Initializing socket.io...");
	socket = io();
	socket.on('connect', () => { });

	// on connection, server sends clients, his ID, and a list of all keys
	socket.on('introduction', (_clientProps, _id, _ids, _iceServers) => {
		// keep local copy of ice servers:
		console.log("Received ICE server credentials from server.");
		iceServerList = _iceServers;

		// keep a local copy of my ID:
		console.log('My socket ID is: ' + _id);
		id = _id;

		// for each existing user, add them as a client
		for (let i = 0; i < _ids.length; i++) {
			if (_ids[i] != id) { // add all existing clients except for myself
				addClient(_clientProps[_ids[i]], _ids[i]);
				callUser(_ids[i]);
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

	socket.on("call-made", async (data) => {
		console.log("Receiving call from user " + data.socket);

		// set remote session description to incoming offer
		await clients[data.socket].peerConnection.setRemoteDescription(
			new RTCSessionDescription(data.offer)
		);

		// create answer and set local session description to that answer
		const answer = await clients[data.socket].peerConnection.createAnswer();
		await clients[data.socket].peerConnection.setLocalDescription(
			new RTCSessionDescription(answer)
		);

		// send answer out to caller
		socket.emit("make-answer", {
			answer,
			to: data.socket,
		});
	});

	socket.on("answer-made", async (data) => {
		console.log("Answer made by " + data.socket);

		// set the remote description to be the incoming answer
		await clients[data.socket].peerConnection.setRemoteDescription(
			new RTCSessionDescription(data.answer)
		);

		// what is this for?
		if (!clients[data.socket].isAlreadyCalling) {
			callUser(data.socket);
			clients[data.socket].isAlreadyCalling = true;
		}
	});

	socket.on("iceCandidateFound", (data) => {
		clients[data.socket].peerConnection.addIceCandidate(data.candidate);
	});
}

// add client object
function addClient(_clientProp, _id) {
	console.log("Adding client with id " + _id);
	clients[_id] = {};

	// add peerConnection to the client
	let pc = createPeerConnection(_id);
	clients[_id].peerConnection = pc;

	// boolean for establishing WebRTC connection
	clients[_id].isAlreadyCalling = false;

	// create video element:
	createClientMediaElements(_id);

	// add client to scene:
	glScene.addClient(_clientProp, _id);
}

// remove client object
function removeClient(_id) {
	console.log('A user disconnected with the id: ' + _id);
	glScene.removeClient(_id);
	removeClientVideoElementAndCanvas(_id);
	delete clients[_id];
}

// this function sets up a peer connection and corresponding DOM elements for a specific client
function createPeerConnection(_id) {
	// create a peer connection for  client:
	let peerConnectionConfiguration;
	// if (false) {
	peerConnectionConfiguration = { iceServers: iceServerList };
	// } else {
	// peerConnectionConfiguration = {}; // this should work locally
	// }

	let pc = new RTCPeerConnection(peerConnectionConfiguration);

	// add ontrack listener for peer connection
	pc.ontrack = function ({ streams: [_remoteStream] }) {
		console.log("OnTrack: track added to RTC Peer Connection.");
		console.log(_remoteStream);
		// Split incoming stream into two streams: audio for THREE.PositionalAudio and
		// video for <video> element --> <canvas> --> videoTexture --> videoMaterial for THREE.js
		// https://stackoverflow.com/questions/50984531/threejs-positional-audio-with-webrtc-streams-produces-no-sound

		let videoStream = new MediaStream([_remoteStream.getVideoTracks()[0]]);
		let audioStream = new MediaStream([_remoteStream.getAudioTracks()[0]]);

		// get access to the audio element:
		let audioEl = document.getElementById(_id + "_audio");
		if (audioEl) {
			audioEl.srcObject = audioStream;
		}
		// audio element should start playing as soon as data is loaded

		const remoteVideoElement = document.getElementById(_id + "_video");
		if (remoteVideoElement) {
			remoteVideoElement.srcObject = videoStream;
		} else {
			console.warn("No video element found for ID: " + _id);
		}
	};

	// https://www.twilio.com/docs/stun-turn
	// Here's an example in javascript
	pc.onicecandidate = function (evt) {
		if (evt.candidate) {
			console.log("OnICECandidate: Forwarding ICE candidate to peer.");
			// send the candidate to the other party via your signaling channel
			socket.emit("addIceCandidate", {
				candidate: evt.candidate,
				to: _id,
			});
		}
	};

	addTracksToPeerConnection(localMediaStream, pc);

	return pc;
}

async function callUser(id) {
	if (clients.hasOwnProperty(id)) {
		console.log("Calling user " + id);

		// https://blog.carbonfive.com/2014/10/16/webrtc-made-simple/
		// create offer with session description
		const offer = await clients[id].peerConnection.createOffer();
		await clients[id].peerConnection.setLocalDescription(
			new RTCSessionDescription(offer)
		);

		socket.emit("call-user", {
			offer,
			to: id,
		});
	}
}

// temporarily pause the outgoing stream
function disableOutgoingStream() {
	localMediaStream.getTracks().forEach((track) => {
		track.enabled = false;
	});
}
// enable the outgoing stream
function enableOutgoingStream() {
	localMediaStream.getTracks().forEach((track) => {
		track.enabled = true;
	});
}

////////////////////////////////////////////////////////////////////////////////
// three.js
////////////////////////////////////////////////////////////////////////////////

function createScene() {
	// initialize three.js scene
	console.log("Creating three.js scene...");
	glScene = new Scene(
		_domElement = document.getElementById('gl_context'),
		_width = window.innerWidth,
		_height = window.innerHeight,
		_clearColor = 'skyblue',
		_contols = controls,
		_socket = socket);
}

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// Utilities 🚂

// created <video> element for local mediastream
function createLocalVideoElement() {
	const videoElement = document.createElement("video");
	videoElement.id = "local_video";
	videoElement.autoplay = true;
	videoElement.width = videoWidth;
	videoElement.height = videoHeight;
	// videoElement.style = "visibility: hidden;";

	// there seems to be a weird behavior where a muted video
	// won't autoplay in chrome...  so instead of muting the video, simply make a
	// video only stream for this video element :|
	let videoStream = new MediaStream([localMediaStream.getVideoTracks()[0]]);

	videoElement.srcObject = videoStream;
	document.body.appendChild(videoElement);
}

// created <video> element using client ID
function createClientMediaElements(_id) {
	console.log("Creating <video> element for client with id: " + _id);

	const videoElement = document.createElement("video");
	videoElement.id = _id + "_video";
	videoElement.width = videoWidth;
	videoElement.height = videoHeight;
	videoElement.autoplay = true;
	// videoElement.muted = true; // TODO Positional Audio
	// videoElement.style = "visibility: hidden;";

	document.body.appendChild(videoElement);

	// create audio element for client
	let audioEl = document.createElement("audio");
	audioEl.setAttribute("id", _id + "_audio");
	audioEl.controls = "controls";
	audioEl.volume = 1;
	document.body.appendChild(audioEl);

	audioEl.addEventListener("loadeddata", () => {
		audioEl.play();
	});
}

// remove <video> element and corresponding <canvas> using client ID
function removeClientVideoElementAndCanvas(_id) {
	console.log("Removing <video> element for client with id: " + _id);

	let videoEl = document.getElementById(_id + "_video");
	if (videoEl != null) {
		videoEl.remove();
	}
}

////////////////////////////////////////////////////////////////////////////////
// start-up
////////////////////////////////////////////////////////////////////////////////

async function startButtonClicked() {
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

		// first get user media
		localMediaStream = await getMedia(mediaConstraints);

		createLocalVideoElement();

		// initialize socket connection
		initSocketConnection();

		// finally create the threejs scene
		createScene();
	}
}

async function playerNameInputKeyDown(event) {
	if (event.keyCode === 13) {
		await startButtonClicked();
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