//This class holds the structure that defines a level
class Level 
{
	constructor(name, cycles, row_masks, row_size) 
	{
		if(row_masks.length !== cycles)
			throw 'Number of cycles and number of row_masks don\'t match!';
		for (var i = 0; i < row_masks.length; i++)
			if(row_masks[i].length !== row_size)
				throw 'Number of elements in row mask doesn\'t match row_size!';
		this.name = name;
		this.cycles = cycles;
		this.row_masks = row_masks;
		this.row_size = row_size;
	}
}
//This one wraps the bullet for insertion in the queue
class BulletWrapper
{
	constructor(bullet, timestamp)
	{
		this.bullet = bullet;
		this.timestamp = timestamp;
		this.active = false;
	}
}
//This one wraps the enemy
class EnemyWrapper
{
	constructor(enemyMesh, enemyBBox, enemyBoxHelper)
	{
		this.enemyMesh = enemyMesh;
		this.enemyBBox = enemyBBox;
		this.enemyBoxHelper = enemyBoxHelper;
	}
}


//GLOBAL VARIABLES
//Resources are not instantiated here because
//we create them each time we start a level

//Game setup variables
var level_set = false, already_started = false, 
	visibleBBoxes = true; //For testing 

//Position values
var myHeight = window.innerHeight;
var myWidth = window.innerWidth;

var WIDTH = res_independent(800), 
	HEIGHT = res_independent(540);

var fieldWidth = 400,
	fieldHeight = 221.4,
	playersPlane = 150.0,
	bg_plane = -200.0;

//Basic Three.js stuff:
var canvas, renderer, scene, camera, pointLight;
//Camera parameters
var FOV = 50.0,
	ASPECT = WIDTH / HEIGHT,
	NEAR = 0.1,
	FAR = 10000.0;
//3D objects
var ship, cannon, rockets, l_rocket, r_rocket;
//Ship position values
var ship_dir_x = 0, max_ship_tilt = deg_to_rad(20), ship_speed = 1.5;
//Ship bounding box
var shipBBox, shipBoxHelper;
//Cannon values
var cannon_max_rotation = deg_to_rad(30), 
	cannon_speed = 1; //degrees/frame
//Bullets pool
var bullet_pool = null,
	bullet_pool_init = false,
	bullet_array = null,
	bullets_number = 6,
	bullet_side = 3,
	bullet_color = 0x000000,
	bullet_speed = 4,
	last_fire=0,
	cooldown = 300;
//Enemy values. Enemies are rotating blue diamonds (shoutout to Eva)
var enemy_side = 12,
	enemies_array = null,
	enemy_color = 0x035096,
	enemy_rot_speed = 0.085,
	enemy_down_speed = 0;//0.6;//0.05;
//Enemies pool
var enemies_pool = null,
	enemies_pool_init = false,
	enemies_array = null,
	enemies_number = 6;
//Current level
var current_level = null;

//Levels
var lv1 = new Level(
	'Level 1', 
	4, 
	[
		[false, false, true, false, false],
		[false, true, true, false, false],
		[false, true, true, false, false],
		[false, false, true, true, false]
	],
	5);

var lv2 = new Level(
	'Level 2', 
	4, 
	[
		[false, false, true, false, false],
		[false, true, true, false, false],
		[false, true, true, false, false],
		[false, false, true, true, false]
	],
	5);

var lv3 = new Level(
	'Level 3', 
	4, 
	[
		[false, false, true, false, false],
		[false, true, true, false, false],
		[false, true, true, false, false],
		[false, false, true, true, false]
	],
	5);

var lv4 = new Level(
	'Level 4', 
	4, 
	[
		[false, false, true, false, false],
		[false, true, true, false, false],
		[false, true, true, false, false],
		[false, false, true, true, false]
	],
	5);

var lv5 = new Level(
	'Level 5', 
	10, 
	[
		[false, false, 	true, false,	false, 	true, 	true],
		[false, true, 	true, false,	false, 	false, 	true],
		[false, true, 	true, false,	false, 	false, 	true],
		[false, false, 	true, true,		true, 	true, 	true],
		[false, false, 	true, false, 	false, 	false, 	false],
		[false, true, 	true, true, 	false, 	true, 	true],
		[false, true, 	true, false, 	false, 	true, 	true],
		[false, true, 	true, false, 	false, 	false, 	false],
		[false, true, 	true, false, 	false, 	false, 	false],
		[false, true, 	true, false, 	false, 	false, 	true]
	],
	7);
//Levels array
var levels = [lv1, lv2, lv3, lv4, lv5];

//Helper methods
function starting_values()
{
	level_set = false;
	//Basic Three.js stuff:
	scene = null, 
	camera = null,
	pointLight = null;
	//3D objects
	ship = null;
	cannon = null;
	rockets = null;
	l_rocket = null;
	r_rocket = null;
	//Ship position values
	ship_dir_x = 0;
	bullet_pool = null;
	enemies_pool = null;

	if(already_started)
		canvas.children[0].remove();
}
function normalize_rot_Y(object)
{
	if(object.rotation.y > 0)
	{
		if(Math.abs(object.rotation.y) < deg_to_rad(0.1))
			object.rotation.y = 0;
		else if(Math.abs(object.rotation.y) < deg_to_rad(0.6))
			object.rotateY(deg_to_rad(-0.1));
		else
			object.rotateY(deg_to_rad(-0.5));
	}
	else if(object.rotation.y < 0)
	{
		if(Math.abs(object.rotation.y) < deg_to_rad(0.1))
			object.rotation.y = 0;
		else if(Math.abs(ship.rotation.y) < deg_to_rad(0.6))
			object.rotateY(deg_to_rad(0.1));
		else
			object.rotateY(deg_to_rad(0.5));
	}
}
function count_enemies(level)
{
	var enemies = 0; 
	level.row_masks.forEach(row => {
		row.forEach(slot => {
			if(slot) enemies +=1;
		});
	});
	return enemies;
}

function res_independent(value)
{
	//Makes every screen (or scaled window) have the same experience 
	//based on the window's height (so that 4:3 and 16:9 work the same).
	return (value/678.0)*myHeight;
}
function deg_to_rad(angle)
{
	return angle * Math.PI/180;
}

function setupMenu()
{
	document.getElementById('subtitle').innerHTML = 'Select a level';
}

function playerShipMovement()
{
	//Move the ship left
	if (Key.isDown(Key.A))		
	{
		if (ship.position.x > 0 - fieldWidth * 0.24)
		{	
			normalize_rot_Y(ship);
			ship_dir_x = - ship_speed;
		}
		//If we can't move left, we tilt the ship a bit left
		else
		{
			ship_dir_x = 0;
			if(Math.abs(ship.rotation.y) < max_ship_tilt)
				ship.rotateY(deg_to_rad(- 0.5));
		}
	}
	//Move right
	else if (Key.isDown(Key.D))
	{
		if (ship.position.x < fieldWidth * 0.24)
		{
			normalize_rot_Y(ship);
			ship_dir_x = ship_speed;
		}
		//If we're on the right edge, tilt the ship right a bit
		else
		{
			ship_dir_x = 0;
			if(Math.abs(ship.rotation.y) < max_ship_tilt)
				ship.rotateY(deg_to_rad(0.5));
		}
	}
	//Don't move the ship
	else
	{
		normalize_rot_Y(ship);
		ship_dir_x = 0;
	}
	ship.position.x += ship_dir_x;
	shipBoxHelper.update();
}
function playerCannonMovement()
{
	//Move the ship left
	if (Key.isDown(Key.RIGHT_ARROW))		
	{
		if(cannon.rotation.z > - cannon_max_rotation)
			cannon.rotateZ(deg_to_rad(-cannon_speed));
	}
	if (Key.isDown(Key.LEFT_ARROW))		
	{
		if(cannon.rotation.z < cannon_max_rotation)
			cannon.rotateZ(deg_to_rad(cannon_speed));
	}
}

function bulletAnimManage()
{
	bullet_array.forEach(
		function checkPos(bull)
		{
			if(bull.active)
			{
				if(Math.abs(bull.bullet.position.y) > fieldHeight*0.5 ||
					Math.abs(bull.bullet.position.x) > fieldWidth*0.35)
				{
					bull.bullet.position
					scene.remove(bull.bullet);
					bull.active = false;
					bullet_pool.add(bull);
				}
				else
				{
					bull.bullet.translateY(bullet_speed);
				}
			}
		}
	);
}
function enemiesAnimManage()
{
	enemies_array.forEach(
		function rotateAndMove(ramiel)
		{
			ramiel.enemyMesh.rotation.y += enemy_rot_speed;
			ramiel.enemyMesh.position.y -= enemy_down_speed;
			ramiel.enemyBoxHelper.update();
			ramiel.enemyBBox.setFromObject(ramiel.enemyBoxHelper);
		}
	);
}
/*
function enemiesHurtManage()
{

}*/
function enemiesHitManage()
{
	enemies_array.forEach(
		function hit(ramiel)
		{
			if(ramiel.enemyBBox.intersectsBox(shipBBox))
			{
				//Do stuff when the ship is hit
				console.log("haha you got hit");
			}
		}
	);
}
function fireBullet()
{
	var now = Date.now();
	if (Key.isDown(Key.UP_ARROW) && cooldown < now - last_fire)		
	{
		last_fire = now;
		if(bullet_pool.size() > 0)
		{
			//console.log('Shoot!');
			var bull = bullet_pool.dequeue();
			bull.active = true;
			bull.bullet.position.set(ship.position.x - 15*cannon.rotation.z - 2, ship.position.y + 1.7*ship.scale.y, ship.position.z - 12);
			//bull.bullet.position.y += ship.scale.y/2;
			bull.bullet.rotation.z = cannon.rotation.z;
			scene.add(bull.bullet);
		}
	}
}

//TODO:
//bullet shooting (use priorityqueue with timestamp as a key)
//if there is time:
//purge and redo repo
//get a clue about how to deal with enemies/player getting hit
//set up enemy spawning/real level setup
//text on screen with controls
//memory cleanup when changing level (it seems to not unload 
//the models for some reason)
//not sure: ship moves slower on chrome than on firefox

//Put here everything that has to happen on every frame
function draw()
{	
	if(level_set)
	{
		//Draw the scene
		renderer.render(scene, camera);

		//Make changes
		playerShipMovement();
		playerCannonMovement();
		bulletAnimManage();
		fireBullet();
		enemiesAnimManage();
		enemiesHitManage();
	}	
	//Loop call this function
	requestAnimationFrame(draw);
}

function createScene(level)
{	
	//Things to do only the first time a level is selected
	if(!already_started)
	{
		canvas = document.getElementById('gameCanvas');

		//This one sets the size of the actual canvas (the portion of the web page where the 3D scene is displayed)
		canvas.style.height = HEIGHT.toString() + 'px'; //Reminder that CSS parameters are string
		canvas.style.width = WIDTH.toString() + 'px';
	}
	current_level = level;

	renderer = new THREE.WebGLRenderer({antialias:true});
	renderer.setSize(WIDTH, HEIGHT);
	canvas.appendChild(renderer.domElement);

	scene = new THREE.Scene();

	//Camera setup
	camera = new THREE.PerspectiveCamera(
		FOV,
		ASPECT,
		NEAR,
		FAR);	
	camera.position.z = 320;
	camera.lookAt(scene.position);
	scene.position.set(0, 0, 0);
	scene.add(camera);

	//Lighting setup
	pointLight = new THREE.DirectionalLight(0xffffff);
	pointLight.intensity = 0.9;
	scene.add(pointLight);
	pointLight.position.set(
		-50, 
		50, 
		200
	);

	//Load the texture of the background plane
	new THREE.TextureLoader().load('Textures/sp4ce.jpeg', spaceTextureLoaded);
}

function spaceTextureLoaded (bg_map) {	
	//Setting the size of the background plane 
	var bg_Width = fieldWidth*4,
		bg_Height = fieldHeight*4,
		bg_Quality = 10.0;
	
	bg_map.wrapS = THREE.RepeatWrapping;
	bg_map.wrapT = THREE.RepeatWrapping;
	bg_map.repeat.set( 1, 1 );

	var bg_material = new THREE.MeshPhongMaterial( { map: bg_map, side: THREE.FrontSide } );

	// create the space background plane
	var background = new THREE.Mesh(
		new THREE.PlaneGeometry(
			width = bg_Width,
			height = bg_Height,
			widthSegments = bg_Quality,
			heightSegments = bg_Quality),
		bg_material);
	scene.add(background);
	background.position.x = 0;
	background.position.y = 0;
	background.position.z = bg_plane;
	
	//Place the spaceship
	var m_loader = new THREE.OBJLoader();

	m_loader.load('Models/spaceship.obj', loadedShipModel);
}

function loadedShipModel(ship_object) {
	new THREE.TextureLoader().load('Textures/ship_body_texture.png', function loadedShipTexture(ship_body_texture) {
		var ship_body_material = new THREE.MeshPhongMaterial({
			map : ship_body_texture,
		});

		ship = ship_object;
		var ship_body = ship.getObjectByName('ship_body_Cube');//.children[0];
		ship_body.material = ship_body_material;

		cannon =  ship.getObjectByName('Cannon_Cylinder.001', true);// ship.children[1];
		new THREE.TextureLoader().load('Textures/cannon_texture.png', function cannonTextureLoaded(cannon_texture) {
			cannon.material = new THREE.MeshPhongMaterial({
				map : cannon_texture,
			});
			ship.add(cannon);
			rockets = new THREE.Object3D();
			
			l_rocket = ship.getObjectByName('Left_rocket_Cone', true);
			r_rocket = ship.getObjectByName('Right_rocket_Cone.001', true);

			rockets.add(l_rocket);
			rockets.add(r_rocket);
			ship.add(rockets);
			ship.receiveShadow = true;
			new THREE.TextureLoader().load('Textures/rocket_texture.png', function rocketTextureLoaded(rocket_texture) {
				var rocket_material = new THREE.MeshPhongMaterial({
					map : rocket_texture,
				});
				r_rocket.material = rocket_material;
				l_rocket.material = rocket_material;
								
				scene.add(ship);
				ship.rotation.set(0, 0, 0);
				ship.position.set(0, -fieldHeight/2 + 50, playersPlane);
				ship.scale.set(9,9,9);

				//Initialize ship bounding box
				shipBoxHelper = new THREE.BoxHelper(ship, 0x00ff00);
				shipBBox = new THREE.Box3();
				shipBBox.setFromObject(shipBoxHelper);

				//For testing
				if(visibleBBoxes)
					scene.add(shipBoxHelper);

				shipBoxHelper.update();

				initializeBulletPool();

				//We now need to set up all the enemies.
				//Now I'm only creating one for testing collisions and putting him right into the action, later I'll have to invent some kind of pooling logic and a spawning mechanism to deal with the hordes.
				enemies_number = count_enemies(current_level);

				enemies_array = new Array();

				var enemesh = new THREE.Mesh(
					new THREE.OctahedronGeometry(radius=enemy_side),
					new THREE.MeshPhongMaterial({
						color: enemy_color, 
						//reflectivity: 100,	
						specular: enemy_color,
						shininess: 100,})
				);
				var eneBoxHelper = new THREE.BoxHelper(enemesh, 0x00ff00);
				//eneBBox.geometry.computeBoundingBox();

				var eneBBox = new THREE.Box3();
				eneBBox.setFromObject(eneBoxHelper);

				var enemy = new EnemyWrapper(enemesh, eneBBox, eneBoxHelper);
				enemies_array.push(enemy);

				scene.add(enemy.enemyMesh);
				scene.add(enemy.enemyBoxHelper);

				enemy.enemyMesh.position.z = ship.position.z;
				enemy.enemyMesh.position.y = fieldHeight/2 - 45;

				enemy.enemyBoxHelper.update();

				level_set = true;
				if(!already_started)
					draw();
				already_started = true;
			});
		});
	});
}

function initializeBulletPool()
{
	if(!bullet_pool_init)
	{
		bullet_pool = new buckets.PriorityQueue({
			compareFunction: function(a, b) { return a.timestamp - b.timestamp;}});
		bullet_array = new Array(bullets_number);
		for(var i = 0; i < bullets_number; i++)
		{
			var new_bullet = new THREE.Mesh(
				new THREE.CubeGeometry(bullet_side, bullet_side, bullet_side),
				new THREE.MeshPhongMaterial({color: bullet_color})
			);
			new_bullet = new BulletWrapper(new_bullet, Date.now());
			bullet_pool.add(new_bullet);
			bullet_array[i] = new_bullet;
		}
	}
	else
	{
		while(bullet_pool.size() > 0)
		{
			bullet_pool.dequeue();
		}

		bullet_array.forEach(
			function makeAvailable(current_bull) 
			{
				bullet_pool.enqueue(current_bull);
				current_bull.active = false;
			});
	}
}

function setupLevel(level)
{
	//Set the level name as title
	document.getElementById('subtitle').innerHTML = level.name;
	
	//Set up the scene for the selected level
	starting_values();
	createScene(level);

	//draw() will get called inside createScene
}
$(document).ready(
	function() {
		setupMenu();
	}
);