/** @class */
function Controller() {
	// Advanced features
	this._speed      = 1;     // Running speed of the playable
	this._iterations = 1;     // Number of times to iterate the playable
	this._persist    = false; // To keep the playable running instead of completing
	this._pingpong   = false; // To make the playable go backward on even iterations
	this._pongping   = false; // To make the playable go backward on odd iterations
};
module.exports = Controller;

Controller.prototype._advanced = true;

Object.defineProperty(Controller.prototype, 'speed', {
	get: function () { return this._speed; },
	set: function (speed) {
		var dt = this._timeNow - this._timeStart;
		if (speed === 0) {
			// Setting timeStart as if new speed was 1
			this._timeStart = this._timeNow - dt * this._speed;
		} else {
			if (this._speed === 0) {
				// If current speed is 0,
				// it corresponds to a virtual speed of 1
				// when it comes to determing where timeStart is
				this._timeStart = this._timeNow - dt / speed;
			} else {
				this._timeStart = this._timeNow - dt * this._speed / speed;
			}
		}

		this._speed = speed;
	}
});

Object.defineProperty(Controller.prototype, 'time', {
	get: function () {
		if(this._speed === 0) {
			// Speed is virtually 1
			return this._timeNow - this._timeStart;
		} else {
			return (this._timeNow - this._timeStart) * this._speed;
		},
	set: function (time) {
		this.goTo(time);
	}
});

Controller.prototype.goToBeginning = function () {
	this.goTo(0);
	return this;
};

Controller.prototype.goToEnd = function () {
	this.goTo(this.getDuration());
	return this;
};

Controller.prototype.goTo = function (time) {
	if(this._speed === 0) {
		// Speed is virtually 1
		this._timeStart = this._timeNow - time;
	} else {
		// Offsetting timeStart with respect to timeNow and speed
		this._timeStart = this._timeNow - time / this._speed;
	}
	return this;
};

Controller.prototype.getDuration = function () {
	return this._duration * this._iterations;
};

Controller.prototype.getAbsoluteDuration = function () {
	return this._duration * this._iterations / this._speed;
};

Controller.prototype.iterations = function (iterations) {
	this._iterations = iterations;
	return this;
};

Controller.prototype.persist = function (persist) {
	this._persist = persist;
	return this;
};

Controller.prototype.pingpong = function (pingpong) {
	this._pingpong = pingpong;
	return this;
};

Controller.prototype.pongping = function (pongping) {
	this._pongping = pongping;
	return this;
};

Controller.prototype._update = function (time) {
	// Converting absolute time into relative time
	var t = (time - this._timeStart) * this._speed;

	// Iteration at current update
	var currentIteration = t / this._duration;

	if (currentIteration < this._iterations) {
		// Setting time within current iteration
		t = t % this._duration;
	}

	if (((this._pingpong === true) && (Math.ceil(currentIteration) % 2 === 0)) ||
		((this._pongping === true) && (Math.ceil(currentIteration) % 2 === 1))) {
		// Reversing time
		t = this._duration - t;
	}

	var timeOverflow = this._doUpdate(t);

	// Callback triggered before resetting time
	if (this._onUpdate !== null) {
		var dt = time - this._timeNow;
		this._onUpdate(t, dt);
	}
	
	if (timeOverflow === undefined) {
		this._timeNow = time;
		// Not completed, no overflow
		return;
	}

	if (currentIteration < this._iterations) {
		// Keep playing, no overflow
		this._timeNow = time;
		return;
	}

	if (this._persist === true) {
		// Playable keeps playing even if it has reached its end
		// Can only be stopped manually
		if (timeOverflow > 0) {
			// Time flows positively
			// The end is the end
			if (this._speed === 0) {
				this._timeStart = time - this._duration * this._iterations;
			} else {
				this._timeStart = time - (this._duration * this._iterations) / this._speed;
			}
		} else {
			// Time flows negatively
			// The beginning is the end (is the beginning, c.f Smashing Pumpkins)
			this._timeStart = time;
		}

		// No overflow
		this._timeNow = time;
		return;
	}

	// Direction of the playable
	dt = time - this._timeNow;
	this._timeNow = time;

	// The playable completes
	return this._complete(timeOverflow, dt);
};