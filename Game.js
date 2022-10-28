import * as THREE from './libs/three137/three.module.js';
import { GLTFLoader } from './libs/three137/GLTFLoader.js';
import { RGBELoader } from './libs/three137/RGBELoader.js';
import { NPCHandler } from './NPCHandler.js';
import { LoadingBar } from './libs/LoadingBar.js';
import { Pathfinding } from './libs/pathfinding/Pathfinding.js';
import { User } from './User.js';
import { Controller } from './Controller.js';

class Game{user
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
		this.clock = new THREE.Clock();

        this.loadingBar = new LoadingBar();
        this.loadingBar.visible = false;

		this.assetsPath = './assets/';
        
		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 500 );

		this.camera.position.set( -35.0790457675857, 6, 29);
        this.camera.lookAt(-35.0790457675857, 1.7, 19.05524579889955);
		
		let col = 0x201510;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( col );
		this.scene.fog = new THREE.Fog( col, 0, 60 );

		const ambient = new THREE.HemisphereLight(0xffffff, col, 0.3);
		this.scene.add(ambient);
		//PontLight(color, intensity:Float, distance: Number, decay: float)
		const bulb = new THREE.PointLight(0xff0000, 0.8, 30);
		const bulb1 = new THREE.PointLight(0x70A3F6, 0.9, 15);
		const bulb2 = new THREE.PointLight(0xff0000, 0.9, 60);
		bulb.position.set(-32.006979227906804, 1.7, 21.98556287621723);
		bulb1.position.set(-30.594563519447313, 1.7, -38.47949025553107);
		bulb2.position.set(11, 1.4, -34);
		this.scene.add(bulb);
		this.scene.add(bulb1);
		this.scene.add(bulb2);

        const light = new THREE.DirectionalLight();
        light.position.set( 4, 20, 20 );
		light.target.position.set(-2, 0, 0);
		light.castShadow = true;
		//Set up shadow properties for the light
		light.shadow.mapSize.width = 1024; 
		light.shadow.mapSize.height = 512; 
		light.shadow.camera.near = 0.5; 
		light.shadow.camera.far = 50;
		const d = 30; 
		light.shadow.camera.left = -d;
		light.shadow.camera.bottom = -d*0.25;
		light.shadow.camera.right = light.shadow.camera.top = d;
		this.scene.add(light);
		this.light = light;
	
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.shadowMap.enabled = true;
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
        this.setEnvironment();
		
		this.load();
		
		window.addEventListener( 'resize', this.resize.bind(this) );
	}

	initPathfinding(navmesh){
		// vector3 from console
		this.waypoints = [
		new THREE.Vector3(-6, 0.55, 1),
		new THREE.Vector3(-13, 0.55, 29),
		new THREE.Vector3(13, 0.55, -35),
		new THREE.Vector3(-17, 0.55, 9),
		new THREE.Vector3(27, 0.55, -19),
		new THREE.Vector3(3, 0.55, -13),
		new THREE.Vector3(0, 0.55, -23),
		new THREE.Vector3(6, 0.55, 23)
		];
		this.pathfinder = new Pathfinding();
        this.pathfinder.setZoneData('factory', Pathfinding.createZone(navmesh.geometry, 0.02));
		if (this.npcHandler.gltf !== undefined) this.npcHandler.initNPCs();
	}
	
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight ); 
    }
    
    setEnvironment(){
        const loader = new RGBELoader().setPath(this.assetsPath);
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        loader.load( 'hdr/factory.hdr', 
		texture => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          this.scene.environment = envMap;

		  this.loadingBar.visible = !this.loadingBar.loaded;
        }, 
		xhr => {
			this.loadingBar.update( 'envmap', xhr.loaded, xhr.total );
		},
		err => {
            console.error( err.message );
        } );
    }
    
	load(){
        this.loadEnvironment();
		this.npcHandler = new NPCHandler(this);
		// (game, placement of character, rotation of character)
		this.user = new User(this, new THREE.Vector3(-35.0790457675857, 0.55, 19.05524579889955), 160);
		

    }

    loadEnvironment(){
    	const loader = new GLTFLoader( ).setPath(`${this.assetsPath}factory/`);
        
        this.loadingBar.visible = true;
		
		// Load a glTF resource
		loader.load(
			// resource URL
			'factorymapv99.glb',
			// called when the resource is loaded
			gltf => {

				this.scene.add( gltf.scene );
                this.factory = gltf.scene;
				this.fans = [];

				const mergeObjects = {elements2:[], elements5:[], terrain:[]};

				gltf.scene.traverse( child => {
					if (child.isMesh){
						if (child.name == 'NavMesh'){
							this.navmesh = child;
							this.navmesh.geometry.rotateX( Math.PI/2 );
							this.navmesh.quaternion.identity();
							this.navmesh.position.set(-15, 0, 0);
							//child.material.transparent = true;
							//child.material.opacity = 0.2;
							child.material.visible = false;
						}else if (child.name.includes('fan')){
							this.fans.push( child );
						}else if (child.material.name.includes('flower')){
							mergeObjects.elements2.push(child);
							child.castShadow = true;
						}else if (child.material.name.includes('tree')){
							mergeObjects.elements5.push(child);
							child.castShadow = true;
						}else if (child.material.name.includes('leaf')){
							mergeObjects.terrain.push(child);
							child.castShadow = true;
						}else if (child.material.name.includes('mountain')){
							child.receiveShadow = true;
						}else if ( child.material.name.includes('wood')){
							child.castShadow = true;
							child.receiveShadow = true;
						}else if (child.parent.name.includes('main')){
							child.castShadow = true;
						}
					}
				});

				this.scene.add(this.navmesh);

				for(let prop in mergeObjects){
					const array = mergeObjects[prop];
					let material;
					array.forEach( object => {
						if (material == undefined){
							material = object.material;
						}else{
							object.material = material;
						}
					});
				}

				this.controller = new Controller(this);

                this.renderer.setAnimationLoop( this.render.bind(this) );

				this.initPathfinding(this.navmesh);

				this.loadingBar.visible = !this.loadingBar.loaded;
			},
			// called while loading is progressing
			xhr => {

				this.loadingBar.update('environment', xhr.loaded, xhr.total);
				
			},
			// called when loading has errors
			err => {

				console.error( err );

			}
		);
	}			
    
	startRendering(){
		this.renderer.setAnimationLoop( this.render.bind(this) );
	}

	render() {
		const dt = this.clock.getDelta();

		if (this.fans !== undefined){
            this.fans.forEach(fan => {
                fan.rotateY(dt); 
            });
        }
		if (this.npcHandler !== undefined ) this.npcHandler.update(dt);
		if (this.user !== undefined && this.user.ready ){
			this.user.update(dt);
			if (this.controller !== undefined) this.controller.update(dt);
		}

        this.renderer.render( this.scene, this.camera );

    }
}

export { Game };