// -----------------------------------------
//Created by Regina Flores Mir 
//Holobiont Urbanism 
//-----------------------------------------
function Particles(
	scene, particleCount, flowField, scaleX, scaleY, particleSize, vertexShader, fragmentShader
) {
	this.flowField = flowField;

	var geometry = new THREE.BufferGeometry();
	
	this.vertices = new Float32Array(particleCount * 3);
	this.velocities = [];


	this.alphas = new Float32Array(particleCount); // [ 0.2, 0.2144, 0.0, ... ]

	for (i = 0; i < particleCount; ++i) {
		var vertex = new THREE.Vector3(
			Math.random() * scaleX,
			Math.random() * scaleY,
			0
		);

		var velocity = new THREE.Vector3(
			Math.random() - 0.5, //Math.random() gives you a number betn 0 and 1
			Math.random() - 0.5, //slow = divide by 10000
			0
		);

		this.vertices[i * 3]     = vertex.x;
		this.vertices[i * 3 + 1] = vertex.y;
		this.vertices[i * 3 + 2] = vertex.z;

		this.velocities.push(velocity);

		this.alphas[i] = 0;
	}

	geometry.addAttribute('position', new THREE.BufferAttribute(this.vertices, 3));
	geometry.addAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

	var material = new THREE.ShaderMaterial({
		uniforms: { 
			pointSize: { type: 'f', value: 1.0 }
		},
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		depthTest: false,
	 	transparent: true
	});

	this.mesh = new THREE.Points(geometry, material);

	this.particleSize = particleSize;

	scene.add(this.mesh);
}

Particles.prototype.count = function() {
	return this.velocities.length;
}

Particles.prototype.remove = function(scene) {
	scene.remove(this.mesh);
}

function findNearestFlowPoint(pos, flowData) {
	var nearestFlowPoint = flowData.reduce(function(memo, opticalFlowPoint) {
		var dist = pos.distanceTo(opticalFlowPoint);

		if ( dist < memo.currentDistance ) {
			return {
				point: opticalFlowPoint,
				currentDistance: dist
			}
		}
		else {
			return memo;
		}
	}, { currentDistance: Infinity, point: flowData[0] });

	return nearestFlowPoint;
}

function randn() {
    return ((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3) / 3;
}

// update scaleX/scaleY as a parameter from UI
Particles.prototype.update = function(
	steerModifier, velocityModifier, densityModifier, scaleX, scaleY, particleSize, 
	speedDampener, airParticle, airDeath, flowData, distanceModifier, rndPart
	) {
//----------------------------------------------------------------------------//
	if(rndPart == true){
		if (this.particleSize != particleSize) {
			this.mesh.material.size = particleSize;
			this.particleSize = particleSize;
		}

	    for (var i = 0; i < this.mesh.geometry.vertices.length; ++i) {
	    	var g = this.mesh.geometry.vertices[i];
	    	var v = this.velocities[i];

			    var fd = this.flowField.flowData;
			    var K = 8;
			    if (fd) {
				    var fdl = fd.length;
				    if (fdl > 0) {
				    	var p = fd[i % fdl];
					    // g.x = p.x * scaleX + Math.random() * K - K / 2;
					    // g.y = p.y * scaleY + Math.random() * K - K / 2;

					    // Approximate Gaussian
					    g.x = p.x * scaleX + randn() * K;
					    g.y = p.y * scaleY + randn() * K;
					}
				}
	    }

	    this.mesh.geometry.verticesNeedUpdate = true;

//----------------------------------------------------------------------------//
	} else{

		if (this.particleSize != particleSize) {
			this.mesh.material.uniforms.pointSize.value = particleSize;
			this.particleSize = particleSize;
		}
		
		this.mesh.position.set(-scaleX / 2, -scaleY / 2, 0.0);

	    for (var j = 0; j < this.vertices.length; j += 3) {
	    	var i = j / 3;

	    	var shouldCalculateAlpha = j > this.vertices.length * airParticle; //0.01; // change number of particles flying from the screen -> set as param later (0.05)
	    	var shouldDie = Math.random() < airDeath; //0.001;
	    	
	    	var gx = this.vertices[j];
	    	var gy = this.vertices[j + 1];
	    	var gz = this.vertices[j + 2];

	    	var v = this.velocities[i];
	    	var a = this.alphas[i];

	    	var f = this.flowField.sample(gx, gy, scaleX, scaleY);

	    	if (f !== undefined && !shouldDie) {
	    		var flowVec = new THREE.Vector3(f.value.x, f.value.y, 0);

	    		// steer = steerModifier * (f - v) 
	    		var steer = v.clone()
		    		.lerp(flowVec, steerModifier)
		    		.normalize()
		    		.multiplyScalar(densityModifier / 10);
		    		
		    	gx += steer.x*speedDampener;
		    	gy += steer.y*speedDampener;
		    	gz += steer.z*speedDampener;


		    	v.lerp(steer, velocityModifier);


		    	// gets the distance that flow field grid has to nearest pink dot
		    	var distanceFlowField = f.distance;

		    	// calculate distance from particles current position (gx/gy) to nearest pink dot
		    	var distance = findNearestFlowPoint(new THREE.Vector2(gx, gy), flowData).currentDistance;

		    	// distance = (distance - 0.2);

		    	// find min of both values - this fixes particles staying on screen when someone leaves
		    	//distance = Math.min(distanceFlowField, (1 - distance) / 10);

				// set final alpha value - we are only showing the particles that are "close" to the pink ones
				// this is the hack instead of using openCV - Lukas Kanade 

				if (distance == Infinity) {
					a = 0;
				}
				else {
					a = shouldCalculateAlpha ? (1.0 - Math.min(1, Math.max(0, distance))) / distanceModifier : 1.0;
					// a = shouldCalculateAlpha ? (1.0 - Math.min(1, Math.max(0, distance))) / 5.0 : 1.0;
				}
		    	
		    	
	    	}
	    	else {
	    	
	    		// LOOK AT THIS BLOCK OF CODE---- QUESTIONABLE PERFORMANCE....
	    		// particle went outside of flow-field -> reset to random position / velocity
	    		gx = Math.random() * scaleX;
	    		gy = Math.random() * scaleY;
	    		gz = 0;

	    		v.x = Math.random() - 0.5;
	    		v.y = Math.random() - 0.5;
	    		v.z = 0;

	    		a = shouldCalculateAlpha ? 0 : 1.0;
	    	}

	    	this.vertices[j] = gx;
	    	this.vertices[j + 1] = gy;
	    	this.vertices[j + 2] = gz;


	    	this.mesh.geometry.attributes.position.array[j] = gx;
	    	this.mesh.geometry.attributes.position.array[j + 1] = gy;
	    	this.mesh.geometry.attributes.position.array[j + 2] = gz;


	    	this.mesh.geometry.attributes.alpha.array[i] = a; // for sanity, not sure if needed
	    }

	    // this.mesh.geometry.verticesNeedUpdate = true;

	    // not sure about that
	    this.mesh.geometry.attributes.alpha.needsUpdate = true;
	    this.mesh.geometry.attributes.position.needsUpdate = true;
	}
//----------------------------------------------------------------------------//

}
