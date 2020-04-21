class Scene {
	constructor(
		_domElement = document.getElementById('gl_context'),
		_width = window.innerWidth,
		_height = window.innerHeight,
		_clearColor = 'skyblue',
		_controls,
		_movementCallback) {

		this.controls = _controls;
		this.movementCallback = _movementCallback;
		this.shouldSend = false; //way to not use this?

		//THREE scene
		this.scene = new THREE.Scene();

		//Utility
		this.width = _width;
		this.height = _height;

		//Add Player
		this.addSelf();

		// add lights
		this.addLights();

		//THREE Camera
		this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
		this.scene.add(this.camera);

		//THREE WebGL renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setClearColor(new THREE.Color(_clearColor));
		this.renderer.setSize(this.width, this.height);

		//Push the canvas to the DOM
		_domElement.append(this.renderer.domElement);

		// Helpers
		this.scene.add(new THREE.GridHelper(50, 50));

		// create ground
		const geometry = new THREE.PlaneGeometry(50, 50, 1);
		const material = new THREE.MeshLambertMaterial({ color: 0xffffbb });
		const plane = new THREE.Mesh(geometry, material);
		plane.rotation.x = THREE.Math.degToRad(-90);
		this.scene.add(plane);

		// Start the loop
		this.update();
	}


	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Lighting

	addLights() {
		const light = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
		light.position.set(5, 10, 5);
		this.scene.add(light);
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Clients

	getPlayerData() {
		const data = {};

		// create player
		const bodyWidth = 0.25;
		const bodyHeight = 0.4;
		const bodyDepth = 0.15;

		const bodyWidthHalf = bodyWidth * 0.5;
		const bodyHeightHalf = bodyHeight * 0.5;

		const headWidth = bodyWidth * 0.5;
		const headHeight = headWidth;
		const headDepth = bodyDepth * 0.7;
		const headHeightHalf = headHeight * 0.5;

		const armWidth = bodyWidth * 0.3;
		const armHeight = bodyHeight * 0.9;
		const armDepth = bodyDepth * 0.5;

		const armWidthHalf = armWidth * 0.5;
		const armHeightHalf = armHeight * 0.5;
		const armRotationOffset = armHeightHalf * 0.8;

		const legWidth = bodyWidth * 0.4;
		const legHeight = bodyHeight * 1.1;
		const legDepth = bodyDepth * 0.5;

		const legWidthHalf = legWidth * 0.5;
		const legHeightHalf = legHeight * 0.5;
		const legRotationOffset = legHeightHalf * 0.8;

		const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x9797CE });

		// body
		const body = new THREE.Mesh(new THREE.CubeGeometry(bodyWidth, bodyHeight, bodyDepth), playerMaterial);

		// head
		const head = new THREE.Mesh(new THREE.CubeGeometry(headWidth, headHeight, headDepth), playerMaterial);
		head.position.y = bodyHeightHalf + headHeightHalf;
		body.add(head);

		// arms
		const armGeometry = new THREE.CubeGeometry(armWidth, armHeight, armDepth);
		armGeometry.rotateX(THREE.Math.degToRad(90));

		// left arm
		const leftArm = new THREE.Mesh(armGeometry, playerMaterial);
		leftArm.position.set(-bodyWidthHalf - armWidthHalf, armRotationOffset, 0);
		leftArm.rotation.x = THREE.Math.degToRad(90);
		data.leftArmPivot = new THREE.Object3D();
		data.leftArmPivot.position.y = armRotationOffset;
		data.leftArmPivot.add(leftArm);
		body.add(data.leftArmPivot);

		// right arm
		const rightArm = new THREE.Mesh(armGeometry, playerMaterial);
		rightArm.position.set(bodyWidthHalf + armWidthHalf, armRotationOffset, 0);
		rightArm.rotation.x = THREE.Math.degToRad(90);
		data.rightArmPivot = new THREE.Object3D();
		data.rightArmPivot.position.y = armRotationOffset;
		data.rightArmPivot.add(rightArm);
		body.add(data.rightArmPivot);

		// legs
		const legGeometry = new THREE.CubeGeometry(legWidth, legHeight, legDepth);
		legGeometry.rotateX(THREE.Math.degToRad(90));

		// left leg
		const leftLeg = new THREE.Mesh(legGeometry, playerMaterial);
		leftLeg.position.set(-bodyWidthHalf + legWidthHalf, legRotationOffset, 0);
		leftLeg.rotation.x = THREE.Math.degToRad(90);
		data.leftLegPivot = new THREE.Object3D();
		data.leftLegPivot.position.y = -legRotationOffset;
		data.leftLegPivot.add(leftLeg);
		body.add(data.leftLegPivot);

		// right leg
		const rightLeg = new THREE.Mesh(legGeometry, playerMaterial);
		rightLeg.position.set(bodyWidthHalf - legWidthHalf, legRotationOffset, 0);
		rightLeg.rotation.x = THREE.Math.degToRad(90);
		data.rightLegPivot = new THREE.Object3D();
		data.rightLegPivot.position.y = -legRotationOffset;
		data.rightLegPivot.add(rightLeg);
		body.add(data.rightLegPivot);

		// add the player to the scene
		data.player = new THREE.Group();
		this.initPlayerPositionY = bodyHeightHalf + legHeight;
		data.player.position.y = this.initPlayerPositionY;
		data.player.add(body);
		return data;
	}

	addSelf() {
		this.data = this.getPlayerData();

		// add player to scene
		this.scene.add(this.data.player);
	}

	// add a client meshes
	addClient(_id) {
		const data = this.getPlayerData();

		// add player to scene
		this.scene.add(data.player);
		clients[_id].data = data;
	}

	removeClient(_id) {
		// remove player from scene
		this.scene.remove(clients[_id].data.player);
	}

	// overloaded function can deal with new info or not
	updateClientPositions(_clientProps) {
		for (let _id in _clientProps) {
			if (_id != id) {
				// way to simplify the copying process?
				clients[_id].data.player.position.set(_clientProps[_id].player.position[0], _clientProps[_id].player.position[1], _clientProps[_id].player.position[2]);
				clients[_id].data.player.rotation.set(_clientProps[_id].player.rotation[0], _clientProps[_id].player.rotation[1], _clientProps[_id].player.rotation[2]);
				clients[_id].data.leftArmPivot.rotation.set(_clientProps[_id].leftArmPivot.rotation[0], _clientProps[_id].leftArmPivot.rotation[1], _clientProps[_id].leftArmPivot.rotation[2]);
				clients[_id].data.rightArmPivot.rotation.set(_clientProps[_id].rightArmPivot.rotation[0], _clientProps[_id].rightArmPivot.rotation[1], _clientProps[_id].rightArmPivot.rotation[2]);
				clients[_id].data.leftLegPivot.rotation.set(_clientProps[_id].leftLegPivot.rotation[0], _clientProps[_id].leftLegPivot.rotation[1], _clientProps[_id].leftLegPivot.rotation[2]);
				clients[_id].data.rightLegPivot.rotation.set(_clientProps[_id].rightLegPivot.rotation[0], _clientProps[_id].rightLegPivot.rotation[1], _clientProps[_id].rightLegPivot.rotation[2]);
			}
		}
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Interaction 🤾‍♀️
	getThisPlayerData() {
		return [
			[this.data.player.position.x, this.data.player.position.y, this.data.player.position.z],
			[this.data.player.rotation.x, this.data.player.rotation.y, this.data.player.rotation.z],
			[this.data.leftArmPivot.rotation.x, this.data.leftArmPivot.rotation.y, this.data.leftArmPivot.rotation.z],
			[this.data.rightArmPivot.rotation.x, this.data.rightArmPivot.rotation.y, this.data.rightArmPivot.rotation.z],
			[this.data.leftLegPivot.rotation.x, this.data.leftLegPivot.rotation.y, this.data.leftLegPivot.rotation.z],
			[this.data.rightLegPivot.rotation.x, this.data.rightLegPivot.rotation.y, this.data.rightLegPivot.rotation.z]
		];
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Rendering 🎥
	triangle(time, freq) { //triangle waveform generator
		const maxCount = 1000 / freq;
		const phasor = time % maxCount / maxCount;
		return Math.min(phasor, phasor * -1 + 1) * 4 - 1;
	}

	updatePlayer(time) {
		const armMoveAngleRange = 80, legMoveAngleRange = 80, armLegMoveSpeed = 2;
		const jumpSpeed = 0.2, jumpHeight = 1, punchSpeed = 1, punchAngle = 110;
		if (this.controls.position.x || this.controls.position.z) {
			this.data.player.translateX(this.controls.position.x);
			this.data.player.translateZ(this.controls.position.z);
			const animationValue = this.triangle(time, armLegMoveSpeed);
			this.data.leftArmPivot.rotation.x = THREE.Math.degToRad(animationValue * armMoveAngleRange + 180);
			this.data.rightArmPivot.rotation.x = THREE.Math.degToRad(animationValue * -armMoveAngleRange + 180);
			this.data.leftLegPivot.rotation.x = THREE.Math.degToRad(animationValue * -legMoveAngleRange + 180);
			this.data.rightLegPivot.rotation.x = THREE.Math.degToRad(animationValue * legMoveAngleRange + 180);
		}
		else {
			this.data.leftArmPivot.rotation.x = Math.PI;
			this.data.rightArmPivot.rotation.x = Math.PI;
			this.data.leftLegPivot.rotation.x = Math.PI;
			this.data.rightLegPivot.rotation.x = Math.PI;
		}
		if (this.controls.rotation.y) {
			this.data.player.rotateY(this.controls.rotation.y);
		}
		if (this.controls.shouldJump) {
			if (this.controls.jumpStartTime == 0) {
				this.controls.jumpStartTime = time;
			}
			const elapsedTime = time - this.controls.jumpStartTime;
			const deg = elapsedTime * jumpSpeed;
			this.data.player.position.y = this.initPlayerPositionY + Math.sin(THREE.Math.degToRad(deg)) * jumpHeight;
			if (deg >= 180) {
				this.data.player.position.y = this.initPlayerPositionY;
				this.controls.shouldJump = false;
			}
		}
		if (this.controls.shouldLeftPunch) {
			if (this.controls.leftPunchStartTime == 0) {
				this.controls.leftPunchStartTime = time;
			}
			const elapsedTime = time - this.controls.leftPunchStartTime;
			const deg = elapsedTime * punchSpeed;
			const value = Math.sin(THREE.Math.degToRad(deg)); // 0 -> 1 -> 0
			this.data.leftArmPivot.rotation.x = THREE.Math.degToRad(180 + value * punchAngle);
			if (deg >= 180) {
				this.data.leftArmPivot.rotation.x = THREE.Math.degToRad(180);
				this.controls.shouldLeftPunch = false;
			}
		}
		if (this.controls.shouldRightPunch) {
			if (this.controls.rightPunchStartTime == 0) {
				this.controls.rightPunchStartTime = time;
			}
			const elapsedTime = time - this.controls.rightPunchStartTime;
			const deg = elapsedTime * punchSpeed;
			const value = Math.sin(THREE.Math.degToRad(deg)); // 0 -> 1 -> 0
			this.data.rightArmPivot.rotation.x = THREE.Math.degToRad(180 + value * punchAngle);
			if (deg >= 180) {
				this.data.rightArmPivot.rotation.x = THREE.Math.degToRad(180);
				this.controls.shouldRightPunch = false;
			}
		}
	}

	updateCamera() {
		// offset from camera to player
		const mousePositionY = this.controls.rotation.x + 0.5; //normalized to 0 ~ 1
		const relativeCameraOffset = new THREE.Vector3(0, mousePositionY * 1.5 - 0.5, 0.75);

		// update player world matrix for perfect camera follow
		this.data.player.updateMatrixWorld();

		// apply offset to player matrix
		const cameraOffset = relativeCameraOffset.applyMatrix4(this.data.player.matrixWorld);

		// smooth camera position to target position
		this.camera.position.lerp(cameraOffset, 0.2);
		this.camera.lookAt(this.data.player.position);
	}

	update(time) {
		// update player
		this.updatePlayer(time);

		// update camera
		this.updateCamera();

		// send movement to server to update clients data
		if (this.shouldSend) {
			this.movementCallback();
		}
		else {
			this.shouldSend = true;
		}
		this.renderer.render(this.scene, this.camera);
		
		requestAnimationFrame((time) => this.update(time));
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Event Handlers

	onWindowResize(e) {
		this.width = window.innerWidth;
		this.height = Math.floor(window.innerHeight - (window.innerHeight * 0.3));
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(this.width, this.height);
	}
}