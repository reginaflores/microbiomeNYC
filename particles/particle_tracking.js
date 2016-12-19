// -----------------------------------------
//Created by Regina Flores Mir 
//Holobiont Urbanism 
//-----------------------------------------
function ParticlesTracking(scene, count, assetsPath) {
	var geometry = new THREE.Geometry();
	
	for (i = 0; i < count; ++i) {
		var vertex = new THREE.Vector3(
			0,
			0,
			0
		);

		geometry.vertices.push(vertex);
	}


	var material = new THREE.PointsMaterial({ 
		size: 0.05,
		map: THREE.ImageUtils.loadTexture(assetsPath),
		blending: THREE.AdditiveBlending,
		depthTest: false,
		transparent: true
	});

	this.mesh = new THREE.Points(geometry, material);
	
	scene.add(this.mesh);
}

ParticlesTracking.prototype.remove = function(scene) {
	scene.remove(this.mesh);
}

ParticlesTracking.prototype.update = function(flowData, scaleX, scaleY, alpha) {
	this.mesh.position.set(-scaleX / 2, -scaleY / 2, 0)

	this.mesh.material.opacity = alpha;

    for (var i = 0; i < this.mesh.geometry.vertices.length; ++i) {
    	var g = this.mesh.geometry.vertices[i];

		if (flowData.length > 0) {
	    	var flowIndex = i % flowData.length;
	    	
	    	var fx = flowData[flowIndex].x;
	    	var fy = flowData[flowIndex].y;
	    	
	    	g.x = fx*scaleX;
	    	g.y = fy*scaleY;
	    }
    
    }

    this.mesh.geometry.verticesNeedUpdate = true;	
}
