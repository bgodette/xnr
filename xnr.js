javascript:(function() {
	if (typeof(require) == "undefined") {
		MergeSegments = W.Action.MergeSegments;
	} else {
		MergeSegments = require("Waze/Action/MergeSegments");
	}
	if (typeof(onScreen) == "undefined") {
		function onScreen(obj) {
			if (obj.geometry) {
				return(W.map.getExtent().intersectsBounds(obj.geometry.getBounds()));
			}
			return(false);
		}
	}
	var count = 0;
	Object.forEach(W.model.nodes.objects, function(k, v) {
		if (count < 10) {
			if (v.areConnectionsEditable() && onScreen(v)) {
				if (v.attributes.segIDs.length == 2) {
					console.log("eval:", v.attributes.id);
					var seg1 = W.model.segments.get(v.attributes.segIDs[0]);
					var seg2 = W.model.segments.get(v.attributes.segIDs[1]);
					if (seg1 && seg2 && 
					   (seg1.attributes.hasOwnProperty("flags") && seg2.attributes.hasOwnProperty("flags") && seg1.attributes.flags == seg2.attributes.flags) &&
					   (seg1.attributes.hasOwnProperty("level") && seg2.attributes.hasOwnProperty("level") && seg1.attributes.level == seg2.attributes.level) &&
					   (seg1.attributes.toNodeID != seg1.attributes.fromNodeID && seg2.attributes.toNodeID != seg2.attributes.fromNodeID) &&
					   seg1.attributes.primaryStreetID === seg2.attributes.primaryStreetID &&
					   seg1.attributes.roadType === seg2.attributes.roadType &&
					   seg1.attributes.routingRoadType === seg2.attributes.routingRoadType &&
					   seg1.isOneWay() === seg2.isOneWay() &&
					   seg1.isDrivable() &&
					   seg2.isDrivable())
					{
						console.log("basic match");
						var update = true;
						if ((seg1.attributes.hasOwnProperty("level") && !seg2.attributes.hasOwnProperty("level") && seg1.attributes.level === 0) ||
						    (!seg1.attributes.hasOwnProperty("level") && seg2.attributes.hasOwnProperty("level") && seg2.attributes.level === 0))
						{
							console.log("segments have different elevations");
							update = false;
							return;
						}
						if (seg1.attributes.toNodeID !== v.getID() &&
						   (seg1.attributes.toNodeID === seg2.attributes.toNodeID || seg1.attributes.toNodeID === seg2.attributes.fromNodeID))
						{
							console.log(v.getID(), "natural direction match, same nodes");
							update = false;
							return;
						}
						if (seg1.attributes.fromNodeID !== v.getID() &&
						   (seg1.attributes.fromNodeID === seg2.attributes.toNodeID || seg1.attributes.fromNodeID === seg2.attributes.fromNodeID))
						{
							console.log(v.getID(), "natural direction mismatch, same nodes");
							update = false;
							return;
						}
						if (seg1.attributes.toNodeID === seg2.attributes.fromNodeID || seg1.attributes.fromNodeID === seg2.attributes.toNodeID) {
							if (seg1.attributes.fwdMaxSpeed !== seg2.attributes.fwdMaxSpeed || seg1.attributes.revMaxSpeed !== seg2.attributes.revMaxSpeed) {
								console.log(v.getID(), "natural direction match, speed limit mismatch");
								update = false;
								return;
							}
						} else {
							if (seg1.attributes.revMaxSpeed !== seg2.attributes.fwdMaxSpeed || seg1.attributes.fwdMaxSpeed !== seg2.attributes.revMaxSpeed) {
								console.log(v.getID(), "natural direction mismatch, speed limit mismatch");
								update = false;
								return;
							}
						}
						if (seg1.attributes.hasOwnProperty("fwdRestrictions") && seg1.attributes.hasOwnProperty("revRestrictions") &&
						    seg2.attributes.hasOwnProperty("fwdRestrictions") && seg2.attributes.hasOwnProperty("revRestrictions") &&
						   (seg1.attributes.fwdRestrictions.length || seg1.attributes.revRestrictions.length || seg2.attributes.fwdRestrictions.length || seg2.attributes.revRestrictions.length))
						{
							console.log("TBSR present");
							update = false;
							return;
						}
						var tg = W.model.getTurnGraph();
						var fwd = tg.getTurnThroughNode(v, seg1, seg2);
						var rev = tg.getTurnThroughNode(v, seg2, seg1);
						if (fwd._turnData._restrictions.length || rev._turnData._restrictions.length) {
							console.log("TBTR present");
							update = false;
							return;
						}
						if (update) {
							var n1;
							var n2;
							if (seg1.attributes.toNodeID == v.getID()) {
								n1 = W.model.nodes.get(seg1.attributes.fromNodeID);
							} else {
								n1 = W.model.nodes.get(seg1.attributes.toNodeID);
							}
							if (seg2.attributes.toNodeID == v.getID()) {
								n2 = W.model.nodes.get(seg2.attributes.fromNodeID);
							} else {
								n2 = W.model.nodes.get(seg2.attributes.toNodeID);
							}
							if (n1 && n2) {
								for (var i = 0; i < n1.attributes.segIDs.length; i++) {
									for (var j = 0; j < n2.attributes.segIDs.length; j++) {
										if (n1.attributes.segIDs[i] == n2.attributes.segIDs[j]) {
											console.log("Merge on", v.getID(), "would cause two or more segments connected to same nodes.");
											update = false;
											return;
										}
									}
								}
							}
						}
						if (update) {
							W.model.actionManager.add(new MergeSegments(null, v));
							count++;
							console.log("merged(" + count + ") " + seg1.getID() + " with " + seg2.getID() + " at " + v.getID());
						}
					}
				}
			}
		}
	});
})();