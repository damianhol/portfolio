import { Group, 
	Object3D,
	Vector3,
	LoopOnce,
	Quaternion,
	Raycaster,
	AnimationMixer, 
	SphereGeometry, 
	MeshBasicMaterial, 
	Mesh} from './libs/three137/three.module.js';
import { GLTFLoader } from './libs/three137/GLTFLoader.js';
import { DRACOLoader } from './libs/three137/DRACOLoader.js';

class User{
constructor(game, pos, heading){
   // group object as a base for the character
   this.root = new Group();
   this.root.position.copy(pos);
   this.root.rotation.set(0, heading, 0, 'XYZ');
   // refrence to the game and to the camera
   this.game = game;
   this.camera = game.camera;
   // create raycaster
   this.raycaster = new Raycaster();
   //add the root group to the scene
   game.scene.add(this.root);
   // refrence to the loading bar
   //this.loadingBar = game.loadingBar;
   // call the load method
   this.load();
   // to reposition the character
   //this.initMouseHandler();
   this.initRifleDirection();

}

initRifleDirection(){
   //add quaternions copied from blender to the object
   this.rifleDirection = {};

   this.rifleDirection.idle = new Quaternion(-0.178, -0.694, 0.667, 0.203);
   this.rifleDirection.run = new Quaternion( 0.044, -0.772, 0.626, -0.102);
   this.rifleDirection.hit = new Quaternion(-0.025, -0.816, 0.559, -0.147);
   this.rifleDirection.dead = new Quaternion( 0.037, -0.780, 0.6, -0.175);
   this.rifleDirection.throw = new Quaternion(-0.082, -0.789, 0.594, -0.138);
   this.rifleDirection.walk = new Quaternion(-0.082, -0.789, 0.594, -0.138);
}

initMouseHandler(){
   this.game.renderer.domElement.addEventListener( 'click', raycast, false );
	   
   const self = this;
   const mouse = { x:0, y:0 };
   
   function raycast(e){
	   
	   mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	   mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

	   //2. set the picking ray from the camera position and mouse coordinates
	   self.raycaster.setFromCamera( mouse, self.game.camera );    

	   //3. compute intersections
	   const intersects = self.raycaster.intersectObject( self.game.navmesh );
	   
	   if (intersects.length>0){
		   const pt = intersects[0].point;
		  //console.log(pt);

		   self.root.position.copy(pt);
	   }	
   }
}



set position(pos){
   this.root.position.copy( pos );
}

addSphere(){
   const geometry = new SphereGeometry( 0.1, 8, 8 );
   const material = new MeshBasicMaterial( { color: 0xFF0000 });
   const mesh = new Mesh( geometry, material );
   this.root.add(mesh);
}

load(){
   const loader = new GLTFLoader( ).setPath(`${this.game.assetsPath}factory/`);
   const dracoLoader = new DRACOLoader();
   dracoLoader.setDecoderPath( '../../libs/three137/draco/' );
   loader.setDRACOLoader( dracoLoader );
   
   // Load a glTF resource
   loader.load(
	   // resource URL
	   'marioanimations.glb',
	   // called when the resource is loaded
	   gltf => {
		   //add gltf.scene to the group root
		   this.root.add(gltf.scene);
		   // keep a class refrence to glrf scene
		   this.object = gltf.scene;

		   this.object.scale.set(0.01, 0.01, 0.01);

		   //traverse gltf scene
		//    
		   
		   //create animations object
		   this.animations = {};
		   // add animations to array
		   gltf.animations.forEach(animation => {
			   this.animations[animation.name.toLowerCase()] = animation;
		   });

		   // animation mixer
		   this.mixer = new AnimationMixer(gltf.scene);

		   this.action = 'idle';

		   this.ready = true;

	   },
	   // called while loading is progressing
	   xhr => {
		   //this.loadingBar.update( 'user', xhr.loaded, xhr.total );
	   },
	   // called when loading has errors
	   err => {
		   console.error( err );
	   }
   );
}

set action(name){
   if (this.actionName == name.toLowerCase()) return;
		   
   const clip = this.animations[name.toLowerCase()];

   if (clip !== undefined){
	   

	   const action = this.mixer.clipAction( clip );
	   

		
	
	   action.reset();
	   const jump = this.actionName == 'jump';
	   const twerk = this.actionName == 'twerk';
	//    const angry = this.actionName == 'angry';
	   this.actionName = name.toLowerCase();
	   action.play();

	   if (this.curAction){
			if(twerk ){
				this.curAction.crossFadeTo(action, 4.5);
			} else if (jump){
				this.curAction.crossFadeTo(action, 2);
			}
		    
		   else{
			   this.curAction.crossFadeTo(action, 0.5);
		   }
	   }
	   this.curAction = action;


	   
   }
}

update(dt){
   if (this.mixer) this.mixer.update(dt);


}
}

export { User };