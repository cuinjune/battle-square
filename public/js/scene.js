class Scene {
	constructor(_domElement, _width, _height, _clearColor, _controls, _socket) {
		// player control
		this.controls = _controls;

		// socket to communicate with the server
		this.socket = _socket;

		// utility
		this.width = _width;
		this.height = _height;

		// scene
		this.scene = new THREE.Scene();

		// camera
		this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
		this.scene.add(this.camera);

		// renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setClearColor(new THREE.Color(_clearColor));
		this.renderer.setSize(this.width, this.height);

		// push the canvas to the DOM
		_domElement.append(this.renderer.domElement);

		// add event listeners
		window.addEventListener("resize", () => {
			this.width = window.innerWidth;
			this.height = window.innerHeight;
			this.renderer.setSize(this.width, this.height);
			this.camera.aspect = this.width / this.height;
			this.camera.updateProjectionMatrix();
		});

		// add lights
		const light = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
		light.position.set(5, 10, 5);
		this.scene.add(light);

		// add ground
		this.scene.add(new THREE.GridHelper(50, 50));
		const geometry = new THREE.PlaneGeometry(50, 50, 1);
		const material = new THREE.MeshLambertMaterial({ color: 0xffffbb });
		const plane = new THREE.Mesh(geometry, material);
		plane.rotation.x = THREE.Math.degToRad(-90);
		this.scene.add(plane);

		// add player
		this.addSelf();

		// send look to server to update clients data
		this.socket.emit('look', this.getPlayerLook());

		// Start the loop
		this.update(0);
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Clients

	addPlayer(obj) {
		// bodySize
		const bodyWidth = obj.bodySize.x;
		const bodyHeight = obj.bodySize.y;
		const bodyDepth = obj.bodySize.z;
		const bodyWidthHalf = bodyWidth * 0.5;
		const bodyHeightHalf = bodyHeight * 0.5;

		// headSize
		const headWidth = obj.headSize.x;
		const headHeight = obj.headSize.y;
		const headDepth = obj.headSize.z;
		const headHeightHalf = headHeight * 0.5;

		// armSize
		const armWidth = obj.armSize.x;
		const armHeight = obj.armSize.y;
		const armDepth = obj.armSize.z;
		const armWidthHalf = armWidth * 0.5;
		const armHeightHalf = armHeight * 0.5;
		const armRotationOffset = armHeightHalf * 0.8;

		// legSize
		const legWidth = obj.legSize.x;
		const legHeight = obj.legSize.y;
		const legDepth = obj.legSize.z;
		const legWidthHalf = legWidth * 0.5;
		const legHeightHalf = legHeight * 0.5;
		const legRotationOffset = legHeightHalf * 0.8;

		// color
		const playerMaterial = new THREE.MeshLambertMaterial({ color: obj.color.getHex() }); //0x9797CE

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
		obj.leftArmPivot = new THREE.Object3D();
		obj.leftArmPivot.position.y = armRotationOffset;
		obj.leftArmPivot.add(leftArm);
		body.add(obj.leftArmPivot);

		// right arm
		const rightArm = new THREE.Mesh(armGeometry, playerMaterial);
		rightArm.position.set(bodyWidthHalf + armWidthHalf, armRotationOffset, 0);
		rightArm.rotation.x = THREE.Math.degToRad(90);
		obj.rightArmPivot = new THREE.Object3D();
		obj.rightArmPivot.position.y = armRotationOffset;
		obj.rightArmPivot.add(rightArm);
		body.add(obj.rightArmPivot);

		// legs
		const legGeometry = new THREE.CubeGeometry(legWidth, legHeight, legDepth);
		legGeometry.rotateX(THREE.Math.degToRad(90));

		// left leg
		const leftLeg = new THREE.Mesh(legGeometry, playerMaterial);
		leftLeg.position.set(-bodyWidthHalf + legWidthHalf, legRotationOffset, 0);
		leftLeg.rotation.x = THREE.Math.degToRad(90);
		obj.leftLegPivot = new THREE.Object3D();
		obj.leftLegPivot.position.y = -legRotationOffset;
		obj.leftLegPivot.add(leftLeg);
		body.add(obj.leftLegPivot);

		// right leg
		const rightLeg = new THREE.Mesh(legGeometry, playerMaterial);
		rightLeg.position.set(bodyWidthHalf - legWidthHalf, legRotationOffset, 0);
		rightLeg.rotation.x = THREE.Math.degToRad(90);
		obj.rightLegPivot = new THREE.Object3D();
		obj.rightLegPivot.position.y = -legRotationOffset;
		obj.rightLegPivot.add(rightLeg);
		body.add(obj.rightLegPivot);

		// add the player to the scene
		obj.player = new THREE.Group();
		obj.initPlayerPositionY = bodyHeightHalf + legHeight;
		obj.player.position.y = obj.initPlayerPositionY;
		obj.player.add(body);

		// add player to scene
		this.scene.add(obj.player);
	}

	getRandomRange(from, to) {
		return Math.random() * (to - from) + from;
	}

	addSelf() {
		// bodySize
		const bodyWidth = 0.25 + this.getRandomRange(-0.05, 0.05);
		const bodyHeight = 0.4 + this.getRandomRange(-0.05, 0.05);
		const bodyDepth = 0.15 + this.getRandomRange(-0.05, 0.05);

		// headSize
		const headWidth = bodyWidth * 0.5 + this.getRandomRange(-0.05, 0.05);
		const headHeight = headWidth + this.getRandomRange(-0.05, 0.05);
		const headDepth = bodyDepth * 0.7 + this.getRandomRange(-0.05, 0.05);

		// armSize
		const armWidth = bodyWidth * 0.3 + this.getRandomRange(-0.05, 0.05);
		const armHeight = bodyHeight * 0.9 + this.getRandomRange(-0.05, 0.05);
		const armDepth = bodyDepth * 0.5 + this.getRandomRange(-0.05, 0.05);

		// legSize
		const legWidth = bodyWidth * 0.4 + this.getRandomRange(-0.05, 0.05);
		const legHeight = bodyHeight * 1.1 + this.getRandomRange(-0.05, 0.05);
		const legDepth = bodyDepth * 0.5 + this.getRandomRange(-0.05, 0.05);

		// color
		const colorR = this.getRandomRange(0.5, 1);
		const colorG = this.getRandomRange(0.5, 1);
		const colorB = this.getRandomRange(0.5, 1);

		// add player
		this.bodySize = new THREE.Vector3(bodyWidth, bodyHeight, bodyDepth)
		this.headSize = new THREE.Vector3(headWidth, headHeight, headDepth)
		this.armSize = new THREE.Vector3(armWidth, armHeight, armDepth)
		this.legSize = new THREE.Vector3(legWidth, legHeight, legDepth)
		this.color = new THREE.Color(colorR, colorG, colorB)
		this.addPlayer(this);
	}

	addClient(_clientProp, _id) {
		const obj = {
			bodySize: new THREE.Vector3().fromArray(_clientProp.bodySize),
			headSize: new THREE.Vector3().fromArray(_clientProp.headSize),
			armSize: new THREE.Vector3().fromArray(_clientProp.armSize),
			legSize: new THREE.Vector3().fromArray(_clientProp.legSize),
			color: new THREE.Color().fromArray(_clientProp.color)
		};
		this.addPlayer(obj);
		clients[_id].player = obj.player;
		clients[_id].leftArmPivot = obj.leftArmPivot;
		clients[_id].rightArmPivot = obj.rightArmPivot;
		clients[_id].leftLegPivot = obj.leftLegPivot;
		clients[_id].rightLegPivot = obj.rightLegPivot;
	}

	removeClient(_id) {
		// remove player from scene
		if (clients[_id]) {
			this.scene.remove(clients[_id].player);
		}
	}

	updateClientMoves(_clientProps) {
		for (let _id in _clientProps) {
			if (_id != id && clients[_id]) {
				const lerpAmount = 0.5;
				const playerPosition = new THREE.Vector3().fromArray(_clientProps[_id].player.position);
				const playerQuaternion = new THREE.Quaternion().fromArray(_clientProps[_id].player.quaternion);
				const leftArmPivotQuaternion = new THREE.Quaternion().fromArray(_clientProps[_id].leftArmPivot.quaternion);
				const rightArmPivotQuaternion = new THREE.Quaternion().fromArray(_clientProps[_id].rightArmPivot.quaternion);
				const leftLegPivotQuaternion = new THREE.Quaternion().fromArray(_clientProps[_id].leftLegPivot.quaternion);
				const rightLegPivotQuaternion = new THREE.Quaternion().fromArray(_clientProps[_id].rightLegPivot.quaternion);
				clients[_id].player.position.lerp(playerPosition, lerpAmount);
				clients[_id].player.quaternion.slerp(playerQuaternion, lerpAmount);
				clients[_id].leftArmPivot.quaternion.slerp(leftArmPivotQuaternion, lerpAmount);
				clients[_id].rightArmPivot.quaternion.slerp(rightArmPivotQuaternion, lerpAmount);
				clients[_id].leftLegPivot.quaternion.slerp(leftLegPivotQuaternion, lerpAmount);
				clients[_id].rightLegPivot.quaternion.slerp(rightLegPivotQuaternion, lerpAmount);
			}
		}
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Interaction

	// data to send to the server
	getPlayerLook() {
		return [
			[this.bodySize.x, this.bodySize.y, this.bodySize.z],
			[this.headSize.x, this.headSize.y, this.headSize.z],
			[this.armSize.x, this.armSize.y, this.armSize.z],
			[this.legSize.x, this.legSize.y, this.legSize.z],
			[this.color.r, this.color.g, this.color.b]
		];
	}

	getPlayerMove() {
		return [
			[this.player.position.x, this.player.position.y, this.player.position.z],
			[this.player.quaternion.x, this.player.quaternion.y, this.player.quaternion.z, this.player.quaternion.w],
			[this.leftArmPivot.quaternion.x, this.leftArmPivot.quaternion.y, this.leftArmPivot.quaternion.z, this.leftArmPivot.quaternion.w],
			[this.rightArmPivot.quaternion.x, this.rightArmPivot.quaternion.y, this.rightArmPivot.quaternion.z, this.rightArmPivot.quaternion.w],
			[this.leftLegPivot.quaternion.x, this.leftLegPivot.quaternion.y, this.leftLegPivot.quaternion.z, this.leftLegPivot.quaternion.w],
			[this.rightLegPivot.quaternion.x, this.rightLegPivot.quaternion.y, this.rightLegPivot.quaternion.z, this.rightLegPivot.quaternion.w]
		];
	}

	//////////////////////////////////////////////////////////////////////
	//////////////////////////////////////////////////////////////////////
	// Rendering

	triangle(time, freq) { //triangle waveform generator
		const maxCount = 1000 / freq;
		const phasor = time % maxCount / maxCount;
		return Math.min(phasor, phasor * -1 + 1) * 4 - 1;
	}

	updatePlayer(time) {
		const armMoveAngleRange = 80, legMoveAngleRange = 80, armLegMoveSpeed = 2;
		const jumpSpeed = 0.2, jumpHeight = 1, punchSpeed = 1, punchAngle = 110;
		if (this.controls.position.x || this.controls.position.z) {
			this.player.translateX(this.controls.position.x);
			this.player.translateZ(this.controls.position.z);
			const animationValue = this.triangle(time, armLegMoveSpeed);
			this.leftArmPivot.rotation.x = THREE.Math.degToRad(animationValue * armMoveAngleRange + 180);
			this.rightArmPivot.rotation.x = THREE.Math.degToRad(animationValue * -armMoveAngleRange + 180);
			this.leftLegPivot.rotation.x = THREE.Math.degToRad(animationValue * -legMoveAngleRange + 180);
			this.rightLegPivot.rotation.x = THREE.Math.degToRad(animationValue * legMoveAngleRange + 180);
		}
		else {
			this.leftArmPivot.rotation.x = Math.PI;
			this.rightArmPivot.rotation.x = Math.PI;
			this.leftLegPivot.rotation.x = Math.PI;
			this.rightLegPivot.rotation.x = Math.PI;
		}
		if (this.controls.rotation.y) {
			this.player.rotateY(this.controls.rotation.y);
		}
		if (this.controls.shouldJump) {
			if (this.controls.jumpStartTime == 0) {
				this.controls.jumpStartTime = time;
			}
			const elapsedTime = time - this.controls.jumpStartTime;
			const deg = elapsedTime * jumpSpeed;
			this.player.position.y = this.initPlayerPositionY + Math.sin(THREE.Math.degToRad(deg)) * jumpHeight;
			if (deg >= 180) {
				this.player.position.y = this.initPlayerPositionY;
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
			this.leftArmPivot.rotation.x = THREE.Math.degToRad(180 + value * punchAngle);
			if (deg >= 180) {
				this.leftArmPivot.rotation.x = THREE.Math.degToRad(180);
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
			this.rightArmPivot.rotation.x = THREE.Math.degToRad(180 + value * punchAngle);
			if (deg >= 180) {
				this.rightArmPivot.rotation.x = THREE.Math.degToRad(180);
				this.controls.shouldRightPunch = false;
			}
		}
	}

	updateCamera() {
		// offset from camera to player
		const mousePositionY = this.controls.rotation.x + 0.5; //normalized to 0 ~ 1
		const relativeCameraOffset = new THREE.Vector3(0, mousePositionY * 1.5 - 0.5, 0.75);

		// update player world matrix for perfect camera follow
		this.player.updateMatrixWorld();

		// apply offset to player matrix
		const cameraOffset = relativeCameraOffset.applyMatrix4(this.player.matrixWorld);

		// smooth camera position to target position
		this.camera.position.lerp(cameraOffset, 0.2);
		this.camera.lookAt(this.player.position);
	}

	update(time) {
		// update player
		this.updatePlayer(time);

		// update camera
		this.updateCamera();

		// send movement to server to update clients data (calls back updateClientMoves)
		this.socket.emit('move', this.getPlayerMove());

		// render
		this.renderer.render(this.scene, this.camera);

		// call update again
		requestAnimationFrame((time) => this.update(time));
	}
}