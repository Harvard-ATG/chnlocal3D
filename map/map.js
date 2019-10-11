window.Map = (function($, pannellum) {
	"use strict";

	var Map = function(config) {
		this.config = config || {};
		this.config.mapSvgId = this.config.mapSvgId || 'mapsvg';
		this.config.panoramaConfig = this.config.panoramaConfig || 'tour.json';
		this.panoramaData = null;
		this.panoramaSceneId = null;
		this.mapLocations = new Array();
		this.onDocumentLoaded = this.onDocumentLoaded.bind(this);
	};
	Map.run = function(config) {
		var app = new Map(config);
		app.run();
	};
	Map.prototype.run = function() {
		var self = this;
		$.getJSON(this.config.panoramaConfig, function(data) {

      // the next for loop is here to deal with a problem of puting a method reference
      // as the value in the JSON data. There are probablem better ways to deal with
      // this, but this works
			for (var sceneID in data.scenes) {
				var scene = data.scenes[sceneID];

				scene.hotSpots.forEach(function(hotSpotDiv, indexOf ) {
          // look for the cssClass in the JSON and add createTooltipFunc with reference
          // to the method CLtextHotspot.
					if (scene.hotSpots[indexOf].cssClass ) {
						scene.hotSpots[indexOf].createTooltipFunc = CLtextHotspot;
				 	}
				 });
				}

			self.panoramaData = data;
			self.panoramaSceneId = data.default.firstScene;
			$(document).ready(self.onDocumentLoaded);
		});
	};
	Map.prototype.error = function() {
		console.error("Error: ", arguments);
	};
	Map.prototype.onDocumentLoaded = function() {
		this.viewer = pannellum.viewer('container', this.panoramaData);
		this.listenForEvents();
	};
	Map.prototype.listenForEvents = function() {
		var self = this;
		var viewer = this.viewer;
		var mapSvgId = this.config.mapSvgId;

		viewer.on('load', function() {
			// console.log("Loaded pannellum.", viewer);
		});
		viewer.on('scenechange', function(sceneId) {
			self.panoramaSceneId = sceneId;
			self.updateMarker();
		});
		viewer.on('mousedown', function(event) {
			// self.updateMarker();
			self.mouseDown = true;
		});
		document.addEventListener('mousemove', function(event) {
			if ( self.mouseDown ) self.updateMarker();
		});
		viewer.on('mouseup', function(event) {
			// self.updateMarker();
			self.mouseDown = false;
		});


		document.getElementById(mapSvgId).addEventListener("load", function() {
			var svgDoc = this.getSVGDocument();
			self.createLocationDots({ doc: svgDoc });
			self.marker = new Marker({ map: svgDoc });
			self.updateMarker();
		});
	};

	Map.prototype.createLocationDots = function(params) {
		// iterate through the scenes and create a location dot for each scene
		for (var node in this.panoramaData.scenes) {
			if (this.panoramaData.scenes.hasOwnProperty(node)  ) {
				// wconsole.log("checking out scenes ", this.panoramaData.scenes[node] );

				var dot = new Dot({
						map:      params.doc,
						sceneID:  node,
						position: this.panoramaData.scenes[node].map.position,
						viewer:   this.viewer,
						title:    this.panoramaData.scenes[node].title
					});

				this.mapLocations.push( dot );

			}
		}

	}
	// Note: probably don't need this method anymore because we can use access the yaw and northOffset
	// directly from the viewer API: https://pannellum.org/documentation/api/#getyaw
	Map.prototype.getCompassRotation = function() {
		var el, result, degrees = null;
		el = document.querySelector(".pnlm-compass");
		if(el) {
			result = /rotate\(([^)]+)deg\)/g.exec(el.style.transform);
			if(result) {
				degrees = Number(result[1]);
			}
		}
		return degrees;
	};
	Map.prototype.updateSvg = function(params) {
		var scene = this.panoramaData.scenes[this.panoramaSceneId];
		// console.log("Map settings for scene ", this.panoramaSceneId, scene.map);
	};
	Map.prototype.updateMarker = function() {
		// var sceneId = this.panoramaSceneId;
		// var scene = this.panoramaData.scenes[sceneId];
		// var position = scene.map && scene.map.position && scene.map.position.split(',');
		// var panoNorthOffSet = scene.panoNorthOffSet;
		// if(position) {
		// 	var degrees = this.viewer.getYaw() + panoNorthOffSet + this.viewer.getNorthOffset();
		// 	this.marker.moveTo({ x: position[0], y: position[1] });
		// 	this.marker.rotate({ degrees: degrees });
		// 	this.marker.show(true);
		// 	//console.log("updateMarker(): ", sceneId, "position: ", position, "rotation:", degrees);
		// } else {
		// 	this.marker.show(false);
		// 	//console.log("updateMarker(): ", sceneId, "position not defined!");
		// }
	};


	var Dot = function( params ) {
		this.scene    = params.sceneID;
		this.svgMap   = params.map;
		this.viewer   = params.viewer;
		this.title    = params.title;
		var position  = params.position.split(",");
		this.x        = position[0];
		this.y        = position[1];
		var svgNamespace = "http://www.w3.org/2000/svg";

		var shape = this.svgMap.createElementNS( svgNamespace, "g") ;
		shape.setAttributeNS(null, 'class', 'dot');
		shape.setAttributeNS(null, 'transform', ('translate(' + (parseInt(this.x) + 18) + ',' + (parseInt(this.y) + 18) + ')') );
		shape.addEventListener('click', () => {
				this.viewer.loadScene( this.scene );
  			// console.log('clicked', this.scene );
			});

		// create the visual represenation of the marker. In this case a red dot.
		var dot = this.svgMap.createElementNS(svgNamespace, "circle");
		dot.setAttributeNS(null, 'fill', 'blue');
		dot.setAttributeNS(null, "r", 10);
		dot.setAttributeNS(null, "opacity", 0.7);

	  var title = this.svgMap.createElementNS(svgNamespace, "title") ;
		title.appendChild(this.svgMap.createTextNode(this.title));
		// title.textContent( this.title );

// style="filter:url(#dropshadow)"

		// put it all together
		shape.appendChild(title);
		shape.appendChild(dot);

		this.svgMap.documentElement.appendChild(shape);
		this.svgDot = shape;

		// console.log("new dot ", this );

		return this;

	};



var Marker = function( params ) {
	this.svgMap = params.map;
	this.currentOrientation = 0;   //degrees
	var svgNamespace = "http://www.w3.org/2000/svg";

	// create a container for the Marker. This will be used to position the marker on the map
	var marker = this.svgMap.createElementNS( svgNamespace, "g") ;
	marker.setAttributeNS(null, 'id', 'marker');
	marker.setAttributeNS(null, 'style', 'z-index: 1000');

	// create a container for the arrow. This will be used to rotate the marker on the map.
	var arrow =this.svgMap.createElementNS( svgNamespace, "g" );
	arrow.setAttributeNS(null, 'id', 'arrow');

	// create the visual represenation of the marker. In this case a red arrow.
	var shape = this.svgMap.createElementNS(svgNamespace, "path");
	shape.setAttributeNS(null, 'd', "M35,35c0-.09-17.5-35-17.53-35S0,35,0,35s4-1.68,8.76-3.76l8.73-3.78,8.71,3.78C31,33.3,34.93,35,35,35A0,0,0,0,0,35,35Z");
	shape.setAttributeNS(null, 'fill', 'red');

	// put it all together
	arrow.appendChild(shape);
	marker.appendChild(arrow);
	this.svgMap.documentElement.appendChild(marker);
	this.svgMarker = marker;
	this.svgArrow = arrow;

	return this;
};
Marker.prototype.show = function(display) {
	if(this.svgMarker) {
		this.svgMarker.setAttributeNS(null, "display", display ? "" : "none");
	}
};
Marker.prototype.moveTo = function(params) {
	if(this.svgMarker) {
		this.svgMarker.setAttributeNS(null, 'transform', ('translate(' + params.x + ',' + params.y + ')') );
	}
};
// passed params should look like this: { degrees: 0 }
Marker.prototype.rotate = function( params ) {
	if(this.svgArrow) {
		var orientation = ( params.degrees ? params.degrees : 0);

		// console.log("Orientation: " + orientation);
		if (orientation) {
			this.svgArrow.setAttributeNS(null, 'transform', 'rotate(' + orientation + ', 18, 18)');
			this.currentOrientation = orientation;
		}
	}
};



	return Map;
})(jQuery, pannellum);
