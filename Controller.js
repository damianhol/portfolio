import { Object3D, Camera, Vector3, Quaternion, Raycaster, ColorKeyframeTrack } from './libs/three137/three.module.js';
import { JoyStick } from './libs/JoyStick.js';
//import { Game } from './Game.js';

class Controller{
    constructor(game){
        // grab refrences for convenience
        this.camera = game.camera;
        this.clock = game.clock;
        this.user = game.user;
        this.target = game.user.root;
        this.navmesh = game.navmesh;
        this.game = game;

        this.raycaster = new Raycaster();
        
        // movement is gonna be set using move object
        this.move = {up: 0, right: 0};
        // object for looking around
        this.look = { up: 0, right: 0};

        //create a working vector3 and quaternion to control how the camera tracks the avatar
        this.tmpVec3 = new Vector3();
        this.tmpQuat = new Quaternion();
        //we create 3d instance and copy the camera's position and turn in to this object
        this.cameraBase = new Object3D();
        this.cameraBase.position.copy(this.camera.position);
        this.cameraBase.quaternion.copy(this.camera.quaternion);
        // attach it to the user root group( .add -> local position: retained, world position: affected by parenting, .attach -> local position: affected by parenting, world position: retained);
        this.target.attach(this.cameraBase);

        // we define 4xVector3 with some useful directions
        this.yAxis = new Vector3(0, 1, 0);
        this.xAxis = new Vector3(1, 0, 0);
        this.forward = new Vector3(0, 0, 1);
        this.down = new Vector3(0, -1, 0);

        //speed of avatar
        this.speed = 6;
        

        this.checkForGamepad();

        // check for mobile device
        //if (ture) for testing touch controllers on desktop
        //if (true){
        if ('ontouchstart' in document.documentElement){
            this.initOnscreenController();
        } else {
            this.initKeyControl();
        }
    }

    initOnscreenController(){
        //joystick class adds 2 div(2 controllers) elements to the dom
            const options1 = {
                left: true,
                app: this,
                onMove: this.onMove
            };
            
            const joystick1 = new JoyStick(options1);
            
            // right joystick will call onlook method
            const options2 = {
                right: true,
                app: this,
                onMove: this.onLook
            };

            const joystick2 = new JoyStick(options2);

            const jumpBtn = document.createElement('div');
            jumpBtn.style.cssText = "position:absolute; bottom:55px; width:40px; height:40px; background:#ffffff; border:#444 solid medium; border-radius:50%; left:40%; transform:translateX(-50%); animation:fadeIn 160s;";
            jumpBtn.addEventListener('touchstart', this.jump.bind(this));
            document.body.appendChild(jumpBtn);

            const twerkBtn = document.createElement('div');
            twerkBtn.style.cssText = "position:absolute; bottom:55px; width:40px; height:40px; background:#ffffff; border:#444 solid medium; border-radius:50%; left:60%; transform:translateX(-50%); animation:fadeIn 160s;";
            twerkBtn.addEventListener('touchstart', this.twerk.bind(this));
            document.body.appendChild(twerkBtn);

            // class object that allows us to use the class method showTouchController
            this.touchController = { joystick1, joystick2, jumpBtn, twerkBtn};
        }

    initKeyControl(){
        document.addEventListener('keydown', this.keyDown.bind(this));
        document.addEventListener('keyup', this.keyUp.bind(this));
        document.addEventListener('mousedown', this.mouseDown.bind(this));
        document.addEventListener('mouseup', this.mouseUp.bind(this));
        document.addEventListener('mousemove', this.mouseMove.bind(this));
        this.keys = {   
                        w:false, 
                        a:false, 
                        d:false, 
                        s:false,
                        t:false,
                        space: false,
                        mousedown:false, 
                        mouseorigin: {x:0, y:0}
                    };
    }

    checkForGamepad(){
        
    }

    showTouchController(mode){
        if (this.touchController == undefined) return;

        this.touchController.joystick1.visible = mode;
        this.touchController.joystick2.visible = mode;
        this.touchController.jumpBtn.style.display = mode ? 'block' : 'none';
    }

    keyDown(e){
        //console.log('keyCode:' + e.keyCode);
        switch(e.keyCode){
            case 87:
                this.keys.w = true;
                break;
            case 65:
                this.keys.a = true;
                break;
            case 83:
                this.keys.s = true;
                break;
            case 68:
                this.keys.d = true;
                break;
            case 84:
                this.keys.t = true;
                this.twerk();
                break;
            case 32:
                this.keys.space = true;
                this.jump();
                break;                                           
        }
    }

    keyUp(e){
        switch(e.keyCode){
            case 87:
                this.keys.w = false;
                if (!this.keys.s) this.move.up = 0;
                break;
            case 65:
                this.keys.a = false;
                if (!this.keys.d) this.move.right = 0;
                break;
            case 83:
                this.keys.s = false;
                if (!this.keys.w) this.move.up = 0;
                break;
            case 68:
                this.keys.d = false;
                if (!this.keys.a) this.move.right = 0;
                break;
            case 32:
                this.keys.space = false;
                break;
                   
            case 84:
                this.keys.t = false;
                break;                          
        }
    }



// the offset values give the pixel position from the top left of the document
    mouseDown(e){
        this.keys.mousedown = true;
        this.keys.mouseorigin.x = e.offsetX;
        this.keys.mouseorigin.y = e.offsetY;
    }

    mouseUp(e){
        this.keys.mousedown = false;
        this.look.up = 0;
        this.look.right = 0;
    }

    mouseMove(e){
        if (!this.keys.mousedown) return;
        // how far the mouse has moved from when it was pressed
        let offsetX = e.offsetX - this.keys.mouseorigin.x;
        let offsetY = e.offsetY - this.keys.mouseorigin.y;
        // limit range of mouse from -100px to 100px, then devide both values by 100, so offset x and y are limited to the rande -1 and 1
        if (offsetX<-100) offsetX = -100;
        if (offsetX>100) offsetX = 100;
        offsetX /= 100;
        if (offsetY<-100) offsetY = -100;
        if (offsetY>100) offsetY = 100;
        offsetY /= 100;
        // set the look property, invert y value -> by moving the mouse we set look right and up properties
        this.onLook(-offsetY, offsetX);
    }

    jump(){
        this.user.action = 'jump';
    }

    twerk(){
        this.user.action = 'twerk';
    }


    onMove( up, right ){
        this.move.up = up;
        this.move.right = -right;
    }

    onLook( up, right ){
        this.look.up = up*0.25;
        this.look.right = -right;
    }

    gamepadHandler(){
        
    }

    keyHandler(){
        if (this.keys.w) this.move.up += 0.1;
        if (this.keys.s) this.move.up -= 0.1;
        if (this.keys.a) this.move.right += 0.1;
        if (this.keys.d) this.move.right -= 0.1;
        // limit to range -1 to 1
        if (this.move.up > 1) this.move.up = 1;
        if (this.move.up <- 1) this.move.up = -1;
        if (this.move.right > 1) this.move.right = 1;
        if (this.move.right <- 1) this.move.right = -1;
    }

    update(dt=0.0167){   
        let playerMoved = false;
        let speed;

        // check if a gamepad or keys exist
        if(this.gamepad) {
            this.gamepadHandler();
        }else if (this.keys){
            this.keyHandler();
        }

        if (this.move.up != 0){
            //we need a vector which is set to the avatar world direction, we clone the forward wector we created in the constructor then apply a target quaternion
            const forward = this.forward.clone().applyQuaternion(this.target.quaternion);
            // if moveup > 0 avatar is moving forward, we slow down moving back
            speed = this.move.up > 0 ? this.speed * dt : this.speed * dt * 0.3;
            // multyiply speed by moveup value, max move is 1 so we reduce the speed to allowed value
            speed *= this.move.up;
            // clone target's position (avatar root position) then add the farward vector multiplied by the calculated speed value
            // it calculates where we want the avatar to move to this frame
            const pos = this.target.position.clone().add(forward.multiplyScalar(speed));
            // raycast down to see if this location is on the navmesh
            // because we are casting down we move pos y value up by 2 meters
            pos.y += 2;
            // set up raycaster using calculated pos and down
            this.raycaster.set(pos, this.down);
            // we use intersectObj to get navmesh
            const intersects = this.raycaster.intersectObject(this.navmesh);

            // for player movement
            if (intersects.length > 0){
                this.target.position.copy(intersects[0].point);
                playerMoved = true;
            }
            
            }
            // for player rotation
            if (Math.abs(this.move.right) > 0.1){
                const theta = dt * (this.move.right - 0.1) * 1;
                this.target.rotateY(theta);
                playerMoved = true;
        }

        //if the user moved their avatar or rotated it then player moved is true and we get the camerabase world position. then we use lerp which is a blend of current position and first parameter
        if (playerMoved){
            this.cameraBase.getWorldPosition(this.tmpVec3);
            // 0.7 -> 30% new position 70% position stored in tmpVec3
            this.camera.position.lerp(this.tmpVec3, 0.7);

            //from walk to run
            let run = false;
            // setting run to true if speed has been sustained abone 0.03 for > 0.1s
            if ( speed > 0.03 ){
                // overRunSpeedTime is the clock time when the speed value first exceeded 0.03
                if (this.overRunSpeedTime){
                    //if overruntime exists check how long it exceeded 0.03
                    const elapsedTime = this.clock.elapsedTime - this.overRunSpeedTime;
                    // if elapsedTime > 0.1 then speed has been over 0.03 for required time to switch the animation to run
                    run = elapsedTime > 0.1;
                }else{
                    // if overrunspeedtime doesnt exists it initialized to the current clock elapsed time
                    this.overRunSpeedTime = this.clock.elapsedTime;
                }
            // if speed is less than 0.03 then we delete overrunspeedtime
            }else{
                delete this.overRunSpeedTime;
            }

            //choose which animation to display
            if (run) {
                this.user.action = 'run';
            }else{
                this.user.action = 'walk';
            }
        } else {
            // if not moving then idle
            if (this.user !== undefined) this.user.action = 'idle';
        }
        //camera positioning

        if (this.look.up == 0 && this.look.right == 0){
            let lerpSpeed = 0.7;
            // copy values to tmpVec3 and tmpQuat
            this.cameraBase.getWorldPosition(this.tmpVec3);
            this.cameraBase.getWorldQuaternion(this.tmpQuat);
            //move camera using lerp ( & slerp for quaternion)
            this.camera.position.lerp(this.tmpVec3, lerpSpeed);
            this.camera.quaternion.slerp(this.tmpQuat, lerpSpeed);
        }else {
            //if we're looking around
            const delta = 1 * dt;

            this.camera.rotateOnWorldAxis(this.yAxis, this.look.right * delta);
            // Once we've rotated in the y axis, the camera's x axis is no longer on (0,0) so we need to clone the default x axis and then applt the current camera quaternion
            const cameraXAxis = this.xAxis.clone().applyQuaternion(this.camera.quaternion);
            // use calculated axis and up value to rotate camera up and down
            this.camera.rotateOnWorldAxis(cameraXAxis, this.look.up * delta);
        }

    }
}

export { Controller };