import * as THREE from './libs/three137/three.module.js';

class NPC{
	constructor(options){
		const fps = options.fps || 30; //default fps
		
		this.name = options.name | 'NPC';
		
		this.animations = {};	
		
		options.app.scene.add(options.object);
		
		this.object = options.object;
		this.pathLines = new THREE.Object3D();
		this.pathColor = new THREE.Color(0xFFFFFF);
		options.app.scene.add(this.pathLines);

		this.showPath = options.showPath | false;

        this.waypoints = options.waypoints;

        this.dead = false;
		
        this.speed = options.speed;
        this.app = options.app;
        
        if (options.app.pathfinder){
            this.pathfinder = options.app.pathfinder;
            this.ZONE = options.zone;
            this.navMeshGroup = this.pathfinder.getGroup(this.ZONE, this.object.position);	
        }
		
		const pt = this.object.position.clone();
		pt.z += 10;
		this.object.lookAt(pt);
        
        if (options.animations){
            //Use this option to set multiple animations directly
            this.mixer = new THREE.AnimationMixer(options.object);
            options.animations.forEach( (animation) => {
                this.animations[animation.name.toLowerCase()] = animation;
            })
        }
	}

    get randomWaypoint(){
		const index = Math.floor(Math.random()*this.waypoints.length);
		return this.waypoints[index];
	}
	
	setTargetDirection(pt){
		const player = this.object;
		pt.y = player.position.y;
		const quaternion = player.quaternion.clone();
		player.lookAt(pt);
		this.quaternion = player.quaternion.clone();
		player.quaternion.copy(quaternion);
	}

	get randomWaypoint(){
		const index = Math.floor(Math.random()*this.waypoints.length);
		return this.waypoints[index];
	}
	

	newPath(pt){
        const player = this.object;
        //check if we have a pathfinder
        if (this.pathfinder===undefined){
			//if not set a target point as a single node 
            this.calculatedPath = [ pt.clone() ];
            //calculate target direction
			//position a mesh so it will point at the target
            this.setTargetDirection( pt.clone() );
            this.action = 'walking';
            return;
        }
        
		//console.log(`New path to ${pt.x.toFixed(1)}, ${pt.y.toFixed(2)}, ${pt.z.toFixed(2)}`);	

		const targetGroup = this.pathfinder.getGroup(this.ZONE, pt);
		const closestTargetNode = this.pathfinder.getClosestNode(pt, this.ZONE, targetGroup);
		
		// Calculate a path to the target and store it
		// .findPath takes current position, target position(ZONE = 'factory'), navmesh group (navmesgroup was set in the constructor). Then we get vector from current position to [0], then check the length of this vector squared, if it's greater than 0.01 we move along this segment(first we normalize length 1 of length 1 multiple it by dt(time in sec that elapsed since last update) * speed). then we move NPC, check if we overshoot the target, leg is complete. then use setTargetDirection and update method moves NPC to [1]. When we reach [1] calculated path is 0 so we switch to idle animation
		this.calculatedPath = this.pathfinder.findPath(player.position, pt, this.ZONE, this.navMeshGroup);

		if (this.calculatedPath && this.calculatedPath.length) {
			this.action = 'walking';
			// if we have a path we set a target direction
			this.setTargetDirection( this.calculatedPath[0].clone() );
			// if pathline is displayed we generate it and show it
			if (this.showPath){
				if (this.pathLines) this.app.scene.remove(this.pathLines);

				const material = new THREE.LineBasicMaterial({
					color: this.pathColor,
					linewidth: 2
				});

				const points = [player.position];
				
				// Draw debug lines
				this.calculatedPath.forEach( function(vertex){
					points.push(vertex.clone());
				});

				let geometry = new THREE.BufferGeometry().setFromPoints( points );

				this.pathLines = new THREE.Line( geometry, material );
				this.app.scene.add( this.pathLines );

				// Draw debug spheres except the last one. Also, add the player position.
				const debugPath = [player.position].concat(this.calculatedPath);

				debugPath.forEach(vertex => {
					geometry = new THREE.SphereGeometry( 0.2 );
					const material = new THREE.MeshBasicMaterial( {color: this.pathColor} );
					const node = new THREE.Mesh( geometry, material );
					node.position.copy(vertex);
					this.pathLines.add( node );
				});
			}
		} else {
			this.action = 'idle';
			
            if (this.pathfinder){
                const closestPlayerNode = this.pathfinder.getClosestNode(player.position, this.ZONE, this.navMeshGroup);
                const clamped = new THREE.Vector3();
                this.pathfinder.clampStep(
                    player.position, 
                    pt.clone(), 
                    closestPlayerNode, 
                    this.ZONE, 
                    this.navMeshGroup, 
                    clamped);
            }
            
			if (this.pathLines) this.app.scene.remove(this.pathLines);
		}
	}
	
	set action(name){
		if (this.actionName == name.toLowerCase()) return;
				
		const clip = this.animations[name.toLowerCase()];

		if (clip!==undefined){
			const action = this.mixer.clipAction( clip );
			if (name=='throw'){
				action.clampWhenFinished = true;
				action.setLoop( THREE.LoopOnce );
			}
			action.reset();
			const nofade = this.actionName == 'throw';
			this.actionName = name.toLowerCase();
			action.play();
			if (this.curAction){
				if (nofade){
					this.curAction.enabled = false;
				}else{
					this.curAction.crossFadeTo(action, 0.5);
				}
			}
			this.curAction = action;
		}
	}
	// suppose the calculated path has 2 nodes [0] and [1]. Node is simply Vector3 value. NPC is at random location, first it changes it's rotation to [0] (first we calculate direction which NPC should adopt to be pointing at the target - .setTargetDirection quaternion) 
	update(dt){
		const speed = this.speed;
		const player = this.object;
		// mixer property is used to update orientation of the bones
		if (this.mixer) this.mixer.update(dt);
		
        if (this.calculatedPath && this.calculatedPath.length) {
			//first node
            const targetPosition = this.calculatedPath[0];
			// vector property which is the current target position
            const vel = targetPosition.clone().sub(player.position);
            
            let pathLegComplete = (vel.lengthSq()<0.01);
            
            if (!pathLegComplete) {
                //if we are still moving to the target (distanceToSquared is than distance)
                const prevDistanceSq = player.position.distanceToSquared(targetPosition);
                vel.normalize();
                // Move player to target
				// normalize the vector making it of length 1, interpolate player's orientation (quaternion)
                if (this.quaternion) player.quaternion.slerp(this.quaternion, 0.1);
				// move the player along the vel vector by dt * speed
                player.position.add(vel.multiplyScalar(dt * speed));
                //get distance after moving, if greater then we've overshot and this leg is complete
                const newDistanceSq = player.position.distanceToSquared(targetPosition);
				// if it's greater than earlier calculation then we've overshot and this leg is complete
                pathLegComplete = (newDistanceSq > prevDistanceSq);
            } 
            // if we're close to the target
            if (pathLegComplete){
                // Remove node from the path we calculated
                this.calculatedPath.shift();
                if (this.calculatedPath.length == 0){
					// if calculated path length == 0 and the waypoints are defined generate new path
                    if (this.waypoints !== undefined){
                        this.newPath(this.randomWaypoint);
                    }else{
						// if the path is now 0 length we player directly to the target and set animation to idle
                        player.position.copy( targetPosition );
                        this.action = 'idle';
                    }
                }else{
                    this.setTargetDirection( this.calculatedPath[0].clone() );
                }
            }
        }else{
            if (!this.dead && this.waypoints!==undefined) this.newPath(this.randomWaypoint);
        }
    }
}

export { NPC };