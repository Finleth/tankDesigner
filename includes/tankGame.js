

class TankDesigner{
	constructor(){
		this.tanks = [];
		this.hulks = [];
		this.projectiles = {};
		this.gameTimer = null;
		this.timerInterval = 150;
		this.intervalsPerSecond = 1000 / this.timerInterval;
		this.shiftRatio = this.timerInterval / 1000;
		this.callbacks = {
			load: this.loadComponent,
			turretTurn: this.turnTankTurret,
			bodyTurn: this.turnTankBody,
			fireGun: this.fireTankGun,
			move: this.moveTank,
			activateSensor: this.activateTankSensor,
			convertTo360: this.convertTo360,
			boundsDetector: this.boundsDetector
		};
		for(let callback in this.callbacks){
			this.callbacks[callback] = this.callbacks[callback].bind(this);
		}

	}
	createGameSpace(targetArea){
		this.gamePanel = $("<div>",{
			'class': 'gamePanel'
		})
		this.gameArea = $("<div>",{
			'class': 'gameArea'
		});
		this.gamePanel.appendTo(this.gameArea);
		$(targetArea).append(this.gameArea);
		this.gamePanel.css({
			height: '10000px',
			width: '10000px',
			left: '-5000px',
			top: '-5000px'
		});
		this.createTestProjectile();
	}
	startHeartbeat(){
		if(this.gameTimer){
			this.stopHeartbeat();
		}
		this.gameTimer = setInterval(this.handleHeartbeat.bind(this), this.timerInterval);
	}
	stopHeartbeat(){
		clearInterval(this.gameTimer);
		this.gameTimer = null;
	}
	handleHeartbeat(){
		this.tanks.forEach( tank => {
			tank.handleUpdate();
		});
		this.detectProjectileCollisions();
	}
	getDegreesFromRadians(radians){
		return radians * (180 / Math.PI);
	}
	convertTo360(angle){
		if(angle>=360){
			angle = 0 + angle % 360;
		} else if(angle<0){
			angle = 360 - this.convertTo360(angle*-1);
		}
		return angle;	
	}
	getAngleBetweenPoints(sourcePoint, destinationPoint){
		var theta = Math.atan2(
			(sourcePoint.y - destinationPoint.y ) ,
			(sourcePoint.x - destinationPoint.x )
		);
		return this.getDegreesFromRadians(theta) + 180;	 
	}
	detectAllTanksFromTank(sourceTank){
		const detectedTanks = [];
		this.tanks.forEach( tank => {
			if(sourceTank !== tank){
				let possibleTank = this.detectTankInRange(sourceTank, tank);
				if(possibleTank){
					detectedTanks.push(possibleTank);
				}
			}
		})
		return detectedTanks;
	}
	detectTankInRange(sourceTank, targetTank){
		const tankSensor = sourceTank.components.sensor;
		const sourceTankLocation = sourceTank.getCurrentPosition();
		const targetTankLocation = targetTank.getCurrentPosition();
		const targetTankAngle = this.convertTo360(this.getAngleBetweenPoints(sourceTankLocation,targetTankLocation));
		const baseSensorAngle = sourceTank.getTurretAngle();
		const halfArc = tankSensor.arc/2;
		const sensorAngles = {
			min: baseSensorAngle - halfArc,
			max: baseSensorAngle + halfArc
		}
		if(targetTankAngle >= sensorAngles.min && targetTankAngle <= sensorAngles.max){
			const tankRange = Math.sqrt(
				Math.pow(
					(sourceTankLocation.x - targetTankLocation.x),2
				) 
				+ 
				Math.pow(
					(sourceTankLocation.y - targetTankLocation.y),2
				)
			)
			if(tankRange < tankSensor.distance){
				console.log('detected');
				return {angle: targetTankAngle, range: tankRange, name: targetTank.getName()}
			}
			console.log('out of range, not detected');
		}
		console.log('out of angle, not detected');
		return false;
	}
	addTankToGameSpace(tankDom, worldLocation){
		this.gamePanel.append(tankDom);
		tankDom.css({
			left: worldLocation.x + 'px',
			top: worldLocation.y + 'px'
		});
	}
	makeTank(className, options={}, setup={}){

		//options has to do with tank components, like engine and gun
		//setup has to do with initial values like tank position and speed
		if(typeof className !=='function'){
			console.error(`tank class ${className} does not exist!`);
			return false;
		}
		setup.shiftRatio = this.shiftRatio;
		let tank = new className(this.callbacks, options, setup);
		this.tanks.push(tank);
		var domElement = tank.render();
		
		this.addTankToGameSpace(domElement, {x: setup.currentSpot.x, y: setup.currentSpot.y});

	}
	loadComponent(type, level){
		return tankParts[type][level];
	}
	commandTank(tank=this.tanks[0], action){
		tank[action];
	}
	moveTank(direction, tank){
		console.log('main game moving tank');
	}
	turnTankTurret(angle, tank){
		console.log('turning tank turret');
	}
	turnTankBody(angle, tank){
		console.log('tank body turn');
	}
	fireTankGun(tank){
		console.log('tank gun fire');
		this.createProjectile(tank);
	}
	activateTankSensor(tank){
		console.log('tank sensor activate');
		return this.detectAllTanksFromTank(tank);
	}
	createTestProjectile(){
		return;
		//maybe come back to this
		const projectileOptions = {
			position: {x:0, y:0},
			radians: 0, 
			velocity: 0,
			interval: 1000, 
			range: 0,
			onLoadCallback: (data)=>{
				console.log('done', data[0].style);
			}
		}
		let dummyProjectile = new Projectile(projectileOptions);
		this.gamePanel.append(dummyProjectile);
		dummyProjectile.object.prototype.size = {
			top: 1, 
			right: 1,
			bottom: 1,
			left: 1
		}
		dummyProjectile.object.die();
		//debugger;

	}

	createProjectile(sourceTank){
		const firePoint = sourceTank.getFirePoint();
		//(radians, velocity, interval, range)
		//position, radians, velocity, interval, range, onLoadCallback
		const projectileOptions = {
			position: firePoint,
			radians: sourceTank.getTurretAngleAsRadians(), 
			velocity: sourceTank.components.gun.velocity,
			interval: this.timerInterval/10, 
			range: sourceTank.components.gun.range,
			onLoadCallback: null,
			originator: sourceTank
		}
		let projectile = new Projectile(projectileOptions);
		this.gamePanel.append(projectile.element );
		this.projectiles[projectile.object.timer]=projectile.object;
	}
	detectProjectileCollisions(){
		var collidedPairs = [];
		for(let bulletIndex in this.projectiles){
			this.tanks.forEach( tank => {
				if(this.projectiles[bulletIndex] && tank===this.projectiles[bulletIndex].originator){
					return;
				}
				if(!(tank.values.bounds.right < this.projectiles[bulletIndex].position.x
							||
				   tank.values.bounds.left  > this.projectiles[bulletIndex].position.x + this.projectiles[bulletIndex].size.width
				   			||
				   tank.values.bounds.top   > this.projectiles[bulletIndex].position.y + this.projectiles[bulletIndex].size.height
				            ||
				   tank.values.bounds.bottom < this.projectiles[bulletIndex].position.y
				)){
				   collidedPairs.push({tank: tank, bullet:this.projectiles[bulletIndex]});
				}
			})
		}
		collidedPairs.forEach(pair=>{
			this.handleCollision(pair.tank, pair.bullet);
		});
	}
	removeBullet(bulletID){
		delete this.projectiles[bulletID];
	}
	handleCollision(tank, bullet){
		console.log(tank.getName() + ' was hit by bullet ', bullet.timer);
		tank.die();
		let tankIndex = this.tanks.indexOf(tank);
		this.hulks.push(this.tanks.splice(tankIndex,1)[0]);
		let bulletID = bullet.timer;
		bullet.die();
		this.removeBullet(bulletID);
	}
	boundsDetector(tank, desiredX, desiredY){
		debugger;
		var tankValues = {
			test: 0
		}
	}

}
const tankParts = {
	engine:{
		0: {
			speed: 20, //pixels per second
			power: 10,  //how many units of power does it provide for upgrades
			turnSpeed: 10,  //degrees per second,
			spaceNeeded: 10
		}
	},
	sensor: {
		0: {
			arc: 45,
			distance: 500, //detection range in pixels,
			powerUsage: 2, //power usage in units
			spaceNeeded: 1
		}
	},
	body: { 
		0: {
			size: {
				height: '20px',
				width: '40px'
			},
			equipmentSpace: 10, //units of space in body
			armor: 0  //units of armor (damage reduduction)
		}
	},
	turret: {
		0: {
			size: {
				height: '10px',
				width: '10px'
			},
			equipmentSpace: 3,  //units of space in the turret
			turnSpeed: 33 //33 degrees per second
		}
	},
	gun: {
		0: {
			range: 200, //range in pixels
			reload: 5, //time in seconds
			damage: 20, //hitpoints damage
			spaceNeeded: 2,
			velocity: 140
		}
	}
}

class BaseTank{
	constructor(callbacks, options={}, setup={}){
		this.loader = callbacks.load;
		this.callbacks = callbacks;
		this.world = {};
		this.actionQueue = [];
		const defaults = {
			name: 'randomTank'+((Math.random()*100000000) >> 0),
			engine: 0,
			sensor: 0,
			gun: 0,
			body: 0,
			turret: 0
		}
		const initialValues = {
			turretAngle: 0,
			destinationTurretAngle: 0,
			tankAngle: 0,
			destinationTankAngle: 0,
			speed: 0,
			direction: 1,
			shiftRatio: 1,
			turretTurnDelta: 0,
			tankTurnDelta: 0,
			currentSpot: {x: 0, y: 0}
		}
		this.components = {};
		this.convertTo360 = this.callbacks.convertTo360;
		this.options = {}; //configuration for tank components
		this.values = {};  //current settings for tank, such as location and angles
		for(let key in defaults){
			this.options[key] = options[key] || defaults[key];
		}
		for(let key in initialValues){
			this.values[key] = setup[key] || initialValues[key];
		}
		this.loadComponents();
		this.handleUpdate = this.handleFirstUpdate;
	}
	loadComponents(){
		const componentsToLoad = ['engine','sensor','gun', 'turret', 'body'];
		componentsToLoad.forEach(
			componentType => {
				this.components[componentType] = this.loader(componentType, this.options[componentType])
		});
	}

	handleFirstUpdate(){
		this.values.currentSpot = this.domElements.body.position();
		this.values.width= this.domElements.body.width();
		this.values.height= this.domElements.body.height();
		this.handleUpdate = this.handleSuccessiveUpdate;
		this.values.radianConvert = Math.PI / 180;
		this.calculateNewDelta();
		this.values.bounds = { //duplicating values here a bit
			top: this.values.currentSpot.top,
			right: this.values.currentSpot.left + this.values.width,
			bottom: this.values.currentSpot.top + this.values.height,
			left: this.values.currentSpot.left
		}
	}
	handleSuccessiveUpdate(){
		
		this.values.currentSpot.left += this.values.delta.x;
		this.values.currentSpot.top += this.values.delta.y;

 		this.values.turretAngle = this.convertTo360(this.values.turretAngle);
 		this.values.tankAngle = this.convertTo360(this.values.tankAngle);
 		if(this.values.destinationTankAngle !== this.values.tankAngle){
 			var difference = Math.abs(this.values.tankAngle - this.values.destinationTankAngle);
 			if(difference < Math.abs(this.values.tankTurnDelta)){
 				this.values.tankAngle = this.values.destinationTankAngle;
 			} else {
 				this.values.tankAngle += this.values.tankTurnDelta;
 			}
 		}


 		if(this.values.destinationTurretAngle !== this.values.turretAngle){
  			var difference = Math.abs(this.values.turretAngle - this.values.destinationTurretAngle);
 			if(difference < Math.abs(this.values.turretTurnDelta)){
 				this.values.turretAngle = this.values.destinationTurretAngle;
 			} else {
 				this.values.turretAngle += this.values.turretTurnDelta;
 			}
 		}

  		this.domElements.body.css({
 			left: this.values.currentSpot.left + 'px',
 			top: this.values.currentSpot.top + 'px',
 			transform: `rotateZ(${this.values.tankAngle}deg)`
 		});
 		this.domElements.turret.css({transform: 'translate(-50%, -50%) rotateZ('+this.values.turretAngle+'deg)'})

 		//console.log('tank '+this.options.name + ' update');
	}
	render(){
		const turret = $("<div>",{
			'class': 'tank turret'
		});
		const body = $("<div>",{
			'class': 'tank body',
			css:{
				height: this.components.body.size.height,
				width: this.components.body.size.width
			}
		});
		const barrel = $("<div>",{
			'class': 'barrel'
		});
		const firePoint = $("<div>",{
			'class': 'firingPoint'
		});
		
		barrel.append(firePoint);
		turret.append(barrel);
		body.append(turret);
		this.domElements = {
			body: body,
			turret: turret,
			firePoint: firePoint
		} 
		return body;
	}

	turretTurn(angle){
		angle = this.convertTo360(angle);

		this.callbacks.turretTurn(angle, this);
		this.values.turretTurnDelta = this.values.shiftRatio * this.components.turret.turnSpeed * this.determinaAngleDirection(this.values.turretAngle, angle);
		this.values.destinationTurretAngle = angle;

	}
	calculateNewDelta(){
		this.values.delta = { x: null, y: null};
		var radians = this.values.tankAngle * this.values.radianConvert;
		this.values.delta.y = (this.values.speed* this.values.shiftRatio * this.values.direction) * Math.sin(radians);
		this.values.delta.x = (this.values.speed* this.values.shiftRatio * this.values.direction) * Math.cos(radians);
	}
	bodyTurn(angle){
		this.callbacks.bodyTurn(angle, this);
		angle = this.convertTo360(angle);
		this.values.tankTurnDelta = this.values.shiftRatio * this.components.engine.turnSpeed * this.determinaAngleDirection(this.values.tankAngle, angle);
		this.values.destinationTankAngle = angle;
		this.calculateNewDelta();
	}
	fireCannon(){
		this.callbacks.fireGun(this);
	}
	activateSensor(){
		return this.callbacks.activateSensor(this);
	}
	move(direction){
		switch(direction){
			case 'stop': 
				this.values.speed = 0;
				this.calculateNewDelta();
				return; 
			case 'forward':
			case 'backward':
				this.callbacks.move(direction,this);
				this.values.destinationTankAngle = this.values.tankAngle; //if we move, stop our turn
				break;
			default: 
				console.error('invalid direction');
				return;
		}
		console.log(this);
		this.values.speed = this.components.engine.speed;
		this.values.direction = direction==='forward' ? 1 : -1;
		this.calculateNewDelta();
	}
	getCurrentPosition(){
		return {
			x: this.values.currentSpot.left + this.domElements.body.width()/2,
			y: this.values.currentSpot.top + this.domElements.body.height()/2,
		}
	}
	getTurretAngle(){
		return this.convertTo360(this.values.tankAngle + this.values.turretAngle);
	}
	getTurretAngleAsRadians(){
		return this.getTurretAngle() * Math.PI / 180;
	}
	getName(){
		return this.options.name;
	}
	getFirePoint(){
		var element = this.domElements.firePoint;
		debugger;
		const totalOffset = {
			x: 0,
			y: 0
		}
		while(!element.hasClass('gamePanel')){
			let position = element.position();
			totalOffset.x += position.left;
			totalOffset.y += position.top;
			element = element.parent();
		}
		//let point = this.domElements.firePoint.offset();
		return totalOffset;
	}
	die(){
		this.domElements.turret.remove();
		this.domElements.body.remove();
		this.handleUpdate = function(){};
	}
}

function pinpointSpot(x,y){
	var pinPoint = $("<div>",{
		'class': 'pinPoint',
		css:{
			left: x+'px',
			top: y+'px'
		}
	});
	$(".gamePanel").append(pinPoint);

}
class Projectile{
	constructor(options){
		let {position, radians, velocity, interval, range, onLoadCallback, originator} = options;
		let intervalsPerSecond = 1000 / interval;
		this.originator = originator;
		velocity = velocity / intervalsPerSecond;
		this.timer = null;
		this.domElement = null;
		this.position = {
			x: position.x,
			y: position.y
		};
		this.totalRange = 0;
		this.startTime = (new Date()).getTime();
		this.interval = interval;

		this.vector = {
			xDelta: Math.cos(radians) * velocity,
			yDelta: Math.sin(radians) * velocity,
			radianAngle: radians,
			velocity: velocity,
			finalRange: range
		}
		this.createDomElement(onLoadCallback);
		this.startHeartbeat();
		return {element: this.domElement, object: this};
	}
	createDomElement(callback=null){
		this.domElement = $("<div>",{
			'class':'bullet',
			css:{
				left: this.position.x+'px',
				top: this.position.y+'px'
			}
		});
	}
	die(){
		this.stopHeartbeat();
		this.domElement.remove();
	}
	startHeartbeat(){
		if(this.timer){
			this.stopHeartbeat();
		}
		this.timer = setInterval(this.handleHeartbeat.bind(this), this.interval);
	}
	stopHeartbeat(){
		clearInterval(this.timer);
		this.timer = null;
	}
	handleHeartbeat(){
		this.position.x += this.vector.xDelta;
		this.position.y += this.vector.yDelta;
		this.totalRange += this.vector.velocity;
		if(this.totalRange> this.vector.finalRange){
			this.die();
		}
		this.domElement.css({
			left: this.position.x+'px',
			top: this.position.y+'px'
		})
	}
}
Projectile.prototype.size = {
	height: 1,
	width: 1
}
class DanTank extends BaseTank{
	constructor(callback, options,setup){
		super(callback, options,setup);
	}
}

