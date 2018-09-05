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
	constructor(bullet, bulletBBox, bulletBoxHelper)
	{
		this.bullet = bullet;
		this.bulletBBox = bulletBBox;
		this.bulletBoxHelper = bulletBoxHelper;
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
		this.active = false;
	}
}


//GLOBAL VARIABLES
//Resources are not instantiated here because
//we create them each time we start a level

//Game setup variables
var level_set = false, already_started = false, 
	visibleBBoxes = false, //For testing
	end_game = false;

//Grab the window values
var myHeight = window.innerHeight;
var myWidth = window.innerWidth;

//Canvas values
var WIDTH = res_independent(800), 
	HEIGHT = res_independent(540);

var fieldWidth = 400,
	fieldHeight = 221.4,
	playersPlane = 150.0,
	bg_plane = -200.0;

var horizontalBound = fieldWidth * 0.24,
	verticalBound = fieldHeight/2 - 45;

//Basic Three.js stuff:
var canvas, renderer, scene, camera, pointLight, ambientLight;
//UI elements
var scoreboard, end_message, controls_message;
//Camera parameters
var FOV = 50.0,
	ASPECT = WIDTH / HEIGHT,
	NEAR = 100,
	FAR = 10000.0;
//3D objects
var ship, ship_body, cannon, rockets, l_rocket, r_rocket;
//Ship position values
var ship_dir_x = 0, max_ship_tilt = deg_to_rad(20), ship_speed = 1.5;
//Ship bounding box
var shipBBox, shipBoxHelper;
//Cannon values
var cannon_max_rotation = deg_to_rad(30), 
	cannon_speed = 2; //degrees/frame
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
//Enemy values 
var enemy_side = 12,
	enemies_array = null,
	enemy_color = 0x2C75FF,//0x035096,
	enemy_rot_speed = 0.085,
	enemy_down_speed = 0.6;//0.05;
//Enemies pool
var enemies_pool = null,
	enemies_pool_init = false,
	enemies_array = null,
	enemies_number = 6,
	enemies_current_wave = 0,
	enemies_wave_interval = 3000,
	enemies_wave_ready = false,
	enemies_timeout = 0,
	controls_timeout = 0;

//Models and textures
var shipObject = null;
var shipBodyColor = null;
var shipBodyAO = null;
var shipBodyMetal = null;
var shipBodyNormal = null;
var shipBodyMaterial = null;

var shipDetailsColor = null;
var shipDetailsAO = null;
var shipDetailsMetal = null;
var shipDetailsNormal = null;

//Current level
var current_level = null,
	score = 0;

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
		[true, false, false, false, false],
		[false, true, false, false, false],
		[false, false, true, false, false],
		[false, false, false, true, false]
	],
	5);

var lv3 = new Level(
	'Level 3', 
	4, 
	[
		[true, true, true, true, true],
		[false, true, true, false, false],
		[false, true, true, false, false],
		[false, false, true, true, false]
	],
	5);

var lv4 = new Level(
	'Level 4', 
	4, 
	[
		[false, false, true, false, true],
		[false, true, true, false, false],
		[false, true, true, false, false],
		[false, false, true, true, false]
	],
	5);

var lv5 = new Level(
	'Level 5', 
	10, 
	[
		[true, true, 	true, true,		true, 	true, 	true],
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
	enemies_current_wave = 0;
	enemies_wave_ready = false;
	end_game = false;
	score = 0;

	if(already_started)
	{
		canvas.children[0].remove();
		window.clearTimeout(controls_timeout);
		window.clearTimeout(enemies_timeout);
		end_message.style.display = 'none';
		scoreboard.innerHTML = 'Score: ' + score.toString();
	}
	
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
function count_active_enemies()
{
	var active_enemies = 0;
	enemies_array.forEach(enem => {
		if(enem.active)	++active_enemies;
	});
	return active_enemies;
}

function res_independent(value)
{
	//Makes every screen (or scaled window) have the same experience 
	//based on the window's height (so that 4:3 and 16:9 work the same).
	return (value/678.0)*myHeight;
}

function res_independent_horiz(value)
{
	//Makes every screen (or scaled window) have the same experience 
	//based on the window's height (so that 4:3 and 16:9 work the same).
	return (value/1366.0)*myWidth;
}

function deg_to_rad(angle)
{
	return angle * Math.PI/180;
}

function setupMenu()
{
	document.getElementById('subtitle').innerHTML = 'Select a level';

	//Initially hide UI elements
	scoreboard = document.getElementById('score');
	scoreboard.style.display = 'none';
	controls_message = document.getElementById('controls');
	controls_message.style.display = 'none';
	end_message = document.getElementById('end');
	end_message.style.display = 'none';
}

function playerShipMovement()
{
	//Move the ship left
	if (Key.isDown(Key.A))		
	{
		if (ship.position.x > 0 - horizontalBound)
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
		if (ship.position.x < horizontalBound)
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
	shipBBox.setFromObject(shipBoxHelper);
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
					scene.remove(bull.bullet);
					if(visibleBBoxes)
						scene.remove(bull.bulletBoxHelper);
					bull.active = false;
					bullet_pool.add(bull);
				}
				else
				{
					bull.bullet.translateY(bullet_speed);
					bull.bulletBoxHelper.update();
					bull.bulletBBox.setFromObject(bull.bulletBoxHelper);
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
			if(ramiel.active)
			{
				if(ramiel.enemyMesh.position.y < 0 - fieldHeight*0.3)
				{
					scene.remove(ramiel.enemyMesh);
					if(visibleBBoxes)
						scene.remove(ramiel.enemyBoxHelper);
					//scene.remove(ramiel);
					ramiel.active = false;
					enemies_pool.add(ramiel);
				}
				else
				{
					ramiel.enemyMesh.rotation.y += enemy_rot_speed;
					ramiel.enemyMesh.position.y -= enemy_down_speed;
					ramiel.enemyBoxHelper.update();
					ramiel.enemyBBox.setFromObject(ramiel.enemyBoxHelper);
				}
			}
		}
	);
}
function enemiesHitManage()
{
	enemies_array.forEach(
		function hit(ramiel)
		{
			if(ramiel.active && ramiel.enemyBBox.intersectsBox(shipBBox))
			{
				//Do stuff when the ship is hit
				endGame();
			}
		}
	);
}
function enemiesHurtManage()
{
	enemies_array.forEach(
		function hurt(ramiel)
		{
			bullet_array.forEach(
				function shot(bull)
				{
					if(bull.active && ramiel.active && ramiel.enemyBBox.intersectsBox(bull.bulletBBox))
					{
						scoreboard.innerHTML = 'Score: ' + (++score).toString();
						
						scene.remove(bull.bullet);
						if(visibleBBoxes)
							scene.remove(bull.bulletBoxHelper);
						bull.active = false;
						bullet_pool.add(bull);

						scene.remove(ramiel.enemyMesh);
						if(visibleBBoxes)
							scene.remove(ramiel.enemyBoxHelper);
						ramiel.active = false;
						enemies_pool.add(ramiel);
					}					
				}
			);
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
			var bull = bullet_pool.dequeue();
			bull.active = true;
			bull.bullet.position.set(ship.position.x - 15*cannon.rotation.z - 2, ship.position.y + 1.7*ship.scale.y, ship.position.z);

			bull.bullet.rotation.z = cannon.rotation.z;
			scene.add(bull.bullet);
			if(visibleBBoxes)
				scene.add(bull.bulletBoxHelper);
			bull.bulletBoxHelper.update();
		}
	}
}
function enemiesManager()
{
	if(enemies_wave_ready && enemies_current_wave < current_level.cycles)
	{
		enemiesSpawn(enemies_current_wave++);
		enemies_wave_ready = false;
		enemies_timeout = window.setTimeout(enemiesRechargeWave, enemies_wave_interval);
	}
	else if(enemies_current_wave == current_level.row_masks.length && !end_game)
	{
		if(count_active_enemies() == 0)
		{
			goodEnd();
		}
	}
	enemiesAnimManage();
	enemiesHitManage();
	enemiesHurtManage();
}
function enemiesSpawn(wave)
{
	var enemy_offset = horizontalBound*2/(current_level.row_size - 1);
	for(var i = 0; i < current_level.row_masks[wave].length; i++)
	{
		if(current_level.row_masks[wave][i])
		{
			var enem = enemies_pool.dequeue();
			enem.active = true;
			scene.add(enem.enemyMesh);
			if(visibleBBoxes)
				scene.add(enem.enemyBoxHelper);

			enem.enemyMesh.position.set(
				0 - horizontalBound + enemy_offset * i, 
				verticalBound,
				playersPlane
			);

			enem.enemyBoxHelper.update();
		}
	}
}
function enemiesRechargeWave()
{
	enemies_wave_ready = true;
}

//Put here everything that has to happen on every frame
function draw()
{	
	if(level_set)
	{
		//Draw the scene
		renderer.render(scene, camera);

		//Make changes
		if(!end_game)
		{
			playerShipMovement();
			playerCannonMovement();
			fireBullet();	
		}
		bulletAnimManage();
		enemiesManager();
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

		//Doing the same for the UI
		controls_message.style.fontSize = res_independent_horiz(100).toString() + '%';
		scoreboard.style.fontSize = res_independent_horiz(100).toString() + '%';
		end_message.style.fontSize = res_independent_horiz(150).toString() + '%';

		//controls_message.style.left = res_independent_horiz(12).toString() + '%';
		scoreboard.style.left = res_independent_horiz(4).toString() + '%';

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
	pointLight = new THREE.PointLight(0xffffff);
	//pointLight.intensity = 0.7;
	pointLight.intensity = 0.9;
	scene.add(pointLight);
	pointLight.position.set(
		-50, 
		60, 
		playersPlane + 400,
	);
	ambientLight = new THREE.AmbientLight(0xffffff);
	ambientLight.intensity = 0.1;
	scene.add(ambientLight);

	//Load the texture of the background plane
	new THREE.TextureLoader().load('Textures/sp4ce-scaled.jpeg', spaceTextureLoaded);
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

	//Create the space background plane
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
	
	//Load all the spaceship stuff
	var m_loader = new THREE.OBJLoader();

	m_loader.load('Models/spaceship_def.obj', loadedShipModel);
}

function loadedShipModel(loadedModel) {
	shipObject = loadedModel;
	new THREE.TextureLoader().load('Textures/metalgrid3-ogl/metalgrid3_basecolor.png', loadedShipColor);
}

function loadedShipColor(loadedText) {
	shipBodyColor = loadedText;
	new THREE.TextureLoader().load('Textures/metalgrid3-ogl/metalgrid3_AO.png', loadedShipAO);
}

function loadedShipAO(loadedText) {
	shipBodyAO = loadedText;
	new THREE.TextureLoader().load('Textures/metalgrid3-ogl/metalgrid3_metallic.png', loadedShipMetal);
}

function loadedShipMetal(loadedText) {
	shipBodyMetal = loadedText;
	new THREE.TextureLoader().load('Textures/metalgrid3-ogl/metalgrid3_normal-ogl.png', loadedShipNormal);
}

function loadedShipNormal(loadedText) {
	shipBodyNormal = loadedText;

	ship = shipObject;
	ship_body = ship.getObjectByName('ship_body_Cube');

	//2nd set of UVs required for AO
	var geometry = ship_body.geometry;
	geometry.addAttribute( 'uv2', new THREE.BufferAttribute( geometry.attributes.uv.array, 2 ) );
	
	shipBodyMaterial = new THREE.MeshStandardMaterial({
		map : shipBodyColor,
		metalnessMap : shipBodyMetal,
		aoMap : shipBodyAO,
		normalMap : shipBodyNormal
	});
	shipBodyMaterial.flatShading = false;

	ship_body.material = shipBodyMaterial;

	cannon = ship.getObjectByName('Cannon_Cylinder.001', true);
	new THREE.TextureLoader().load('Textures/Titanium-Scuffed-Unity/Titanium-Scuffed_basecolor.png', detailsColorLoaded);
}

function detailsColorLoaded(loadedText) {
	shipDetailsColor = loadedText;
	new THREE.TextureLoader().load('Textures/Titanium-Scuffed-Unity/Titanium-Scuffed_metallic.png', detailsMetalLoaded);
}

/*function detailsAOLoaded(loadedText) {
	shipDetailsAO = loadedText;
	new THREE.TextureLoader().load('Textures/Titanium-Scuffed-Unity/metalgrid2_metallic.png', detailsMetalLoaded);
}*/

function detailsMetalLoaded(loadedText) {
	shipDetailsMetal = loadedText;
	new THREE.TextureLoader().load('Textures/Titanium-Scuffed-Unity/Titanium-Scuffed_normal.png', detailsNormalLoaded);
}

function detailsNormalLoaded(loadedText) {
	shipDetailsNormal = loadedText;

	var detailsMaterial = new THREE.MeshStandardMaterial({
		map : shipDetailsColor,
		metalnessMap : shipDetailsMetal,
		//aoMap : shipDetailsAO,
		normalMap : shipDetailsNormal
	});

	detailsMaterial.flatShading = false;

	//2nd set of UVs required for AO
	var geometry = cannon.geometry;
	geometry.addAttribute( 'uv2', new THREE.BufferAttribute( geometry.attributes.uv.array, 2 ) );

	cannon.material = detailsMaterial;
	ship.add(cannon);
	rockets = new THREE.Object3D();
	
	l_rocket = ship.getObjectByName('Left_rocket_Cone', true);
	r_rocket = ship.getObjectByName('Right_rocket_Cone.001', true);

	rockets.add(l_rocket);
	rockets.add(r_rocket);
	ship.add(rockets);
	ship.receiveShadow = true;
	
	//2nd set of UVs required for AO
	var geometry1 = r_rocket.geometry;
	geometry1.addAttribute( 'uv2', new THREE.BufferAttribute( geometry.attributes.uv.array, 2 ) );

	//2nd set of UVs required for AO
	var geometry2 = l_rocket.geometry;
	geometry2.addAttribute( 'uv2', new THREE.BufferAttribute( geometry.attributes.uv.array, 2 ) );

	r_rocket.material = detailsMaterial;
	l_rocket.material = detailsMaterial;
					
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

	enemies_number = count_enemies(current_level);
	initializeEnemiesPool();

	//Set up UI
	scoreboard.style.display = 'inline';
	controls_message.style.display = 'inline';
	controls_timeout = window.setTimeout(vanishControls, 5500);

	enemies_timeout = window.setTimeout(enemiesRechargeWave, 5000);
	level_set = true;
	if(!already_started)
		draw();
	already_started = true;
}

function vanishControls()
{
	controls_message.style.display = 'none';
}

function endGame()
{
	end_game = true;
	scene.remove(ship);
	controls_message.style.display = 'none';
	window.clearTimeout(controls_timeout);
	window.clearTimeout(enemies_timeout);
	end_message.innerHTML = 'See you, star cowboy...';
	end_message.style.display = 'inline';
	//end_message.style.left = res_independent_horiz(33).toString() + '%';

}
function goodEnd()
{
	end_game = true;
	controls_message.style.display = 'none';
	window.clearTimeout(controls_timeout);
	window.clearTimeout(enemies_timeout);
	end_message.innerHTML = 'You\'re gonna carry that weight...';
	//end_message.style.left = res_independent_horiz(24).toString() + '%';
	end_message.style.display = 'inline';
}

function initializeBulletPool()
{
	if(!bullet_pool_init)
	{
		bullet_pool = new buckets.Queue();
		bullet_array = new Array(bullets_number);
		for(var i = 0; i < bullets_number; i++)
		{
			var new_bullet = new THREE.Mesh(
				new THREE.CubeGeometry(bullet_side, bullet_side, bullet_side),
				new THREE.MeshPhongMaterial({color: bullet_color})
			);
			var new_box_helper = new THREE.BoxHelper(new_bullet, 0x00ff00);
			var new_bbox = new THREE.Box3();
			new_bbox.setFromObject(new_box_helper);

			new_bullet = new BulletWrapper(new_bullet, new_bbox, new_box_helper);
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

function initializeEnemiesPool()
{
	if(!enemies_pool_init)
	{
		enemies_pool = new buckets.Queue();
		enemies_array = new Array(bullets_number);
		for(var i = 0; i < enemies_number; i++)
		{
			var new_enemy = new THREE.Mesh(
				new THREE.OctahedronGeometry(radius=enemy_side),
				new THREE.MeshPhongMaterial({
					color: enemy_color, 
					//reflectivity: 100,	
					specular: enemy_color,
					shininess: 100,})
			);
			var new_box_helper = new THREE.BoxHelper(new_enemy, 0x00ff00);
			var new_bbox = new THREE.Box3();
			new_bbox.setFromObject(new_box_helper);

			new_enemy = new EnemyWrapper(new_enemy, new_bbox, new_box_helper);
			enemies_pool.add(new_enemy);
			enemies_array[i] = new_enemy;
		}
	}
	else
	{
		while(enemies_pool.size() > 0)
		{
			enemies_pool.dequeue();
		}

		enemies_array.forEach(
			function makeAvailable(current_enem) 
			{
				enemies_pool.enqueue(current_enem);
				current_enem.active = false;
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
}
$(document).ready(
	function() {
		setupMenu();
	}
);