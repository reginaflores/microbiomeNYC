// -----------------------------------------
//Created by Regina Flores Mir 
//Holobiont Urbanism 
//-----------------------------------------
function FlowField(size, margin, modx, mody) {
	this.data = [];
	this.size = size; // 20 
	this.margin = margin; // 5

	this.simplex = new SimplexNoise();

	// TODO: add sliders -> modx/mody
	// this.gen(0.01, 0.02);
	this.gen(modx, mody)
}

FlowField.prototype.gen = function(modx, mody) {  
	for (var x = 0; x < this.size; ++x) {
		this.data[x] = [];
		for (var y = 0; y < this.size; ++y) {
			var n = this.simplex.noise(x * modx, y * mody);

			this.data[x][y] = {
				noise: new THREE.Vector2(
					Math.cos(n * Math.PI * 2),
					Math.sin(n * Math.PI * 2) 	
				),
				value: new THREE.Vector2(0, 0)
			};
		}
	}
};

FlowField.prototype.genFromFlow = function(flowData, lerpModifier, flowScale, rndPart) {
	
	if(rndPart == true){
		this.flowData = flowData;
	}

	if (flowData.length == 0) { return; }
	
	function findNearestFlowPoint(v, flowData) {
		var nearestFlowPoint = flowData.reduce(function(memo, opticalFlowPoint) {
			var dist = v.distanceTo(opticalFlowPoint);

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

	for (var x = 0; x < this.size; ++x) {
		for (var y = 0; y < this.size; ++y) {
			var checkPoint = new THREE.Vector2(
				x / this.size,
				y / this.size
			);

			var foundNearestPoint = findNearestFlowPoint(checkPoint, flowData);

			var nearestFlowPoint = foundNearestPoint.point;
			var nearestFlowPointDistance = foundNearestPoint.currentDistance;

			this.data[x][y].value = this.data[x][y].value.subVectors(nearestFlowPoint, checkPoint)
				.normalize()
				// .multiplyScalar(Math.min(nearestFlowPointDistance * 10, 10)) // move faster is further away
				.multiplyScalar(flowScale); // scale the flow field vector which impacts the particle speed

			this.data[x][y].distance = nearestFlowPointDistance;
			this.data[x][y].value.lerp(this.data[x][y].noise, lerpModifier);
		}
	}

};

// x -> -scaleX - +scaleX
// x / scaleX -> 0 - 1
// 0 - 0, 1 -> this.size

FlowField.prototype.sample = function(x, y, scaleX, scaleY) {
	var newX = x / scaleX * this.size;
	var newY = y / scaleY * this.size;

	x = Math.round(newX);
	y = Math.round(newY); 

	return this.data[x] ? (this.data[x][y] ? this.data[x][y] : undefined) : undefined; //? is a shorthand for if statement
};