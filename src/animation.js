(function(oCanvas, window, document, undefined){

	// Define the class
	var animation = function () {
		
		// Return an object when instantiated
		return {
			
			durations: {
				"short": 500,
				"normal": 1000,
				"long": 2000
			},

			defaults: {
				duration: "normal",
				easing: "ease-in-out"
			},
			
			queue: {
				activeAnimations: {},
				timers: {},
				lastID: 0
			},
			
			easing: {
				
				"ease-in": function (time) {
					return this.cubicBezier(0.42, 0, 1, 1, time);
				},
				
				"ease-out": function (time) {
					return this.cubicBezier(0, 0, 0.58, 1, time);
				},
				
				"ease-in-out": function (time) {
					return this.cubicBezier(0.42, 0, 0.58, 1, time);
				},
				
				"linear": function (time) {
					return time;
				},
				
				cubicBezier: function (x1, y1, x2, y2, time) {
				
					// Inspired by Don Lancaster's two articles
					// http://www.tinaja.com/glib/cubemath.pdf
					// http://www.tinaja.com/text/bezmath.html
					
					
						// Set start and end point
					var x0 = 0,
						y0 = 0,
						x3 = 1,
						y3 = 1,
						
						// Convert the coordinates to equation space
						A = x3 - 3*x2 + 3*x1 - x0,
						B = 3*x2 - 6*x1 + 3*x0,
						C = 3*x1 - 3*x0,
						D = x0,
						E = y3 - 3*y2 + 3*y1 - y0,
						F = 3*y2 - 6*y1 + 3*y0,
						G = 3*y1 - 3*y0,
						H = y0,
						
						// Variables for the loop below
						t = time,
						iterations = 5,
						i, slope, x, y;
					
					// Loop through a few times to get a more accurate time value, according to the Newton-Raphson method
					// http://en.wikipedia.org/wiki/Newton's_method
					for (i = 0; i < iterations; i++) {
					
						// The curve's x equation for the current time value
						x = A* t*t*t + B*t*t + C*t + D;
						
						// The slope we want is the inverse of the derivate of x
						slope = 1 / (3*A*t*t + 2*B*t + C);
						
						// Get the next estimated time value, which will be more accurate than the one before
						t -= (x - time) * slope;
						t = t > 1 ? 1 : (t < 0 ? 0 : t);
					}
					
					// Find the y value through the curve's y equation, with the now more accurate time value
					y = Math.abs(E*t*t*t + F*t*t + G*t * H);
					
					return y;
				}
			},

			animate: function (obj, args, runFromQueue, id) {
				args = Array.prototype.slice.call(args);
				runFromQueue = runFromQueue || false;
				id = id === undefined ? false : id;
				
				// Abort if the first argument is not an object
				if (args[0].constructor !== Object) {
					return false;
				}
				
				// Add new item to the queue if it doesn't exist for this object
				if (!this.queue[obj.id]) {
					this.queue[obj.id] = [[]];
				}

				var _this = this,
					properties = args[0],
					duration = this.defaults.duration,
					easing = this.easing[this.defaults.easing],
					newQueue = false,
					callback = function () {},
					queue = this.queue,
					objQueues = queue[obj.id],
					objQueue = objQueues[0],
					objQueueIndex = 0,
					property, runMore,
					startValues = {},
					currentTime = 0,
					timers = this.queue.timers;

				// Create the active container for the object
				if (!queue.activeAnimations[obj.id]) {
					queue.activeAnimations[obj.id] = [];
				}

				// Create the timer if it doesn't exist
				if (timers[obj.id] === undefined) {
					timers[obj.id] = [0];
				}
				
				// Add the animation to the queue if this call comes from a display object
				// If this block is run, execution will be aborted at the end of the block
				// and run animate() again with the first inactive animation in the queue
				if (runFromQueue !== true) {
					newQueue = parseNewQueue.call(this, args[3], false);
					newQueue = parseNewQueue.call(this, args[1], newQueue);
					if (newQueue) {
						objQueueIndex = objQueues.push([]) - 1;
						objQueue = objQueues[objQueueIndex];
						timers[obj.id][objQueueIndex] = 0;
					}
					objQueue.push({
						id: objQueueIndex,
						obj: obj,
						properties: properties,
						callback: callback,
						start: function () {
							_this.animate(obj, args, true, this.id);
						}
					});
					
					// Start the first animation in the queue if no animations are active on the object
					// If there is an active the next animation in the queue will be fired
					// when that animation is completed
					if (!~queue.activeAnimations[obj.id].indexOf(objQueueIndex)) {
						queue.activeAnimations[obj.id].push(objQueueIndex);
						objQueue[0].start();
						return;
					}
					return;
				} else {
					objQueueIndex = id;
					objQueue = objQueues[objQueueIndex];
				}
				
				
				
				// Helper functions to be used further down
				function parseDuration (arg) {
					if (this.durations[arg]) {
						return this.durations[arg];
					} else {
						return !isNaN(parseInt(arg)) ? parseInt(arg) : this.durations[duration];
					}
				}
				function parseEasing (arg, argNum) {
				
					// Allow the user to specify a custom easing function,
					// only if it's not the last argument (will interfere with the callback)
					if (typeof arg === "function" && argNum === args.length - 2) {
						return arg;
					}
					
					// Predefined easing method
					else if (this.easing[arg]) {
						return this.easing[arg];
					}
					
					// Custom cubic bezier curve
					else if (typeof arg === "string" && ~arg.indexOf("cubic-bezier")) {
						var x1, y1, x2, y2, match;
						
						// Get the values from the form:
						//   cubic-bezier(x1, y1, x2, y2)
						match = arg.match(/cubic-bezier\(\s*(.*?),\s*(.*?),\s*(.*?),\s*(.*?)\)/);
						x1 = !isNaN(parseFloat(match[1])) ? parseFloat(match[1]) : 0,
						y1 = !isNaN(parseFloat(match[2])) ? parseFloat(match[2]) : 0,
						x2 = !isNaN(parseFloat(match[3])) ? parseFloat(match[3]) : 1,
						y2 = !isNaN(parseFloat(match[4])) ? parseFloat(match[4]) : 1;
						
						return function (time) {
							return this.cubicBezier(x1, y1, x2, y2, time);
						};
					}
					
					// Return the default easing if nothing else matches
					else {
						return easing;
					}
				}
				function parseCallback (arg) {
					return (typeof arg === "function") ? arg : callback;
				}
				function parseNewQueue (arg, val) {
					return (typeof arg === "boolean") ? arg : val;
				}
				
				
				// Get arguments and correct different syntax alternatives
				duration = parseDuration.call(this, args[1]);
				easing = parseEasing.call(this, args[1], 1);
				easing = parseEasing.call(this, args[2], 2);
				callback = parseCallback.call(this, args[1]);
				callback = parseCallback.call(this, args[2]);
				callback = parseCallback.call(this, args[3]);
				callback = parseCallback.call(this, args[4]);
				objQueue[0].callback = callback;
				
				// Get start values from the object
				for (property in properties) {
					startValues[property] = obj[property];
				}
				
				// Set the timer that will run the actual animation frames
				(function timer () {
					var property, endValue, startValue, change, newValue;
					
					// Set the new time value
					currentTime += 1000 / _this.core.settings.fps;
					timers[obj.id][objQueueIndex] = currentTime;
					
					// Loop through all properties and set them to the new calculated value
					for (property in properties) {
					
						// Get values needed to calculate the next step
						endValue = properties[property];
						startValue = startValues[property];
						
						// Calculate the next value using the set easing function
						// The easing function gets one argument, time, which is a percentage (0-1) of how long the animation has run
						// Back from the easing function comes a coefficient of how far to the end value the next value should be
						newValue = easing.call(_this.easing, currentTime / duration) * (endValue - startValue) + startValue;
						
						// Only animate if the property hasn't reached its end value
						if ((startValue < endValue && newValue <= endValue) || (startValue > endValue && newValue >= endValue)) {
						
							// Set the new value
							obj[property] = newValue;
						}
					}
					
					// Draw the frame if there is time left
					if (timers[obj.id][objQueueIndex] < duration && ~queue.activeAnimations[obj.id].indexOf(objQueueIndex)) {
						if (!_this.core.timeline.running) {
							_this.core.draw.redraw(true);
						}
						objQueue[0].timer = setTimeout(timer, 1000 / _this.core.settings.fps);
					}
					
					// Abort the animation if the end time has been reached 
					else if (~queue.activeAnimations[obj.id].indexOf(objQueueIndex)) {
						clearTimeout(objQueue[0].timer);
						
						// Set the values to the end values
						for (property in properties) {
							obj[property] = properties[property];
						}
						
						// Redraw the canvas
						if (!_this.core.timeline.running) {
							_this.core.draw.redraw(true);
						}
						
						// Set animation status
						queue.activeAnimations[obj.id].splice(queue.activeAnimations[obj.id].indexOf(objQueueIndex), 1);
						
						// Trigger the next animation in the queue if there is any
						objQueue.shift();
						if (objQueue[0] !== undefined) {
							queue.activeAnimations[obj.id].push(objQueue[0].id);
							objQueue[0].start();
						}

						// Trigger the callback
						callback.call(obj);
					}
				})();
			},
			
			// Method that stops all running animations on an object
			stop: function(objectID) {
				
				// Only stop the queue if it exists
				if (this.queue[objectID] !== undefined) {
				
					// Stop the animation and remove the queue
					if (this.queue[objectID][0][0]) {
						clearTimeout(this.queue[objectID][0][0].timer);
					}
					this.queue.activeAnimations[objectID] = [];
					delete this.queue[objectID];
					
					// Redraw the canvas with the latest updates
					if (!this.core.timeline.running) {
						this.core.draw.redraw(true);
					}
				}
			},

			// Method that stops all animations and sets all final values
			finish: function (objectID) {
				var queue, obj, properties, callback, property;
				queue = this.queue[objectID];

				if (!queue || queue[0].length === 0) {
					return;
				}

				queue = queue[0][0];
				obj = queue.obj;
				properties = queue.properties;
				callback = queue.callback;

				this.stop(objectID);

				// Set the values to the end values
				for (property in properties) {
					obj[property] = properties[property];
				}

				// Redraw the canvas with the latest updates
				if (!this.core.timeline.running) {
					this.core.draw.redraw(true);
				}

				// Trigger the callback
				callback.call(obj);
			}
			
		};
	};

	// Register the module
	oCanvas.registerModule("animation", animation);

})(oCanvas, window, document);
