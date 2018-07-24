var Accessory = require('../').Accessory;
var Service = require('../').Service;
var Characteristic = require('../').Characteristic;
var uuid = require('../').uuid;
var Gpio = require('pigpio').Gpio;

var redLED = new Gpio(17, {mode: Gpio.OUTPUT});
var greenLED = new Gpio(22, {mode: Gpio.OUTPUT});
var blueLED = new Gpio(24, {mode: Gpio.OUTPUT});

var LightController = {
	name: "LED Strip", //name of accessory
	pincode: "000-00-123",
	username: "BB:13:00:00:00:00", // MAC like address used by HomeKit to differentiate accessories. 
	manufacturer: "BasementMaker", //manufacturer (optional)
	model: "v1.0", //model (optional)
	serialNumber: "BMLEDSTRIP", //serial number (optional)

	power: true, //current power status
	brightness: 100, //current brightness
	hue: 120, //current hue
	saturation: 100, //current saturation

	redValue: 0,
	greenValue: 255,
	blueValue: 0,
	
	brightnessChanged: false,
	hueChanged: false,
	saturationChanged: false,

	outputLogs: true, //output logs
	
	start: function() {
		redLED.pwmWrite(this.redValue);
		greenLED.pwmWrite(this.greenValue);
		blueLED.pwmWrite(this.blueValue);
		
		setTimeout(function (){
			informHomeKit();
		}, 1000)
	},

	setPower: function(status) { //set power of accessory
		if (this.outputLogs) { console.log("Turning the '%s' %s", this.name, status ? "on" : "off"); }
			this.power = status;
			if ( this.power ) {
				redLED.pwmWrite(this.redValue);
				greenLED.pwmWrite(this.greenValue);
				blueLED.pwmWrite(this.blueValue);
			} else {
				redLED.pwmWrite(0);
				greenLED.pwmWrite(0);
				blueLED.pwmWrite(0);
		}
	},

	getPower: function() { //get power of accessory
		if (this.outputLogs) { console.log("'%s' is %s.", this.name, this.power ? "on" : "off"); }
		if ( this.redValue > 0 || this.greenValue > 0 || this.blueValue > 0 || this.power == true ) {
		  this.power = true;
		} else {
		  this.power = false;
		}
		return this.power;
	},
		
	changeColor: function() {
		if ( (this.hueChanged && this.saturationChanged) || this.brightnessChanged ) {		
			var h, s, v;
			var r, g, b;
			
			h = this.hue/360;
			s = this.saturation/100;
			v = this.brightness/100;

			var i = Math.floor(h * 6);
			var f = h * 6 - i;
			var p = v * (1 - s);
			var q = v * (1 - f * s);
			var t = v * (1 - (1 - f) * s);

			switch(i % 6){
				case 0: r = v, g = t, b = p; break;
				case 1: r = q, g = v, b = p; break;
				case 2: r = p, g = v, b = t; break;
				case 3: r = p, g = q, b = v; break;
				case 4: r = t, g = p, b = v; break;
				case 5: r = v, g = p, b = q; break;
			}
			
			r = Math.floor(r * 255);
			g = Math.floor(g * 255);
			b = Math.floor(b * 255);
			
			this.redValue = r;
			this.greenValue = g;
			this.blueValue = b;
				
			if (this.outputLogs) { console.log("Red: "+r); }
			if (this.outputLogs) { console.log("Green: "+g); }
			if (this.outputLogs) { console.log("Blue: "+b); }

			redLED.pwmWrite(r);
			greenLED.pwmWrite(g);
			blueLED.pwmWrite(b);
			
			this.brightnessChanged = false;
			this.hueChanged = false;
			this.saturationChanged = false;
		}
	},
	
	colorChangedOutsideHomeKit: function(newRedValue, newGreenValue, newBlueValue) {
		if (this.outputLogs) { console.log("Color changed outside of HomeKit, new RGB Values: %s %s %s", newRedValue, newGreenValue, newBlueValue); }
		var r, g, b;
		var h, s, v;
		
		r = newRedValue;
		g = newGreenValue;
		b = newBlueValue;
		
		this.redValue = r;
		this.greenValue = g;
		this.blueValue = b;
		
		redLED.pwmWrite(r);
		greenLED.pwmWrite(g);
		blueLED.pwmWrite(b);
		
		r = r/255, g = g/255, b = b/255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, v = max;

		var d = max - min;
		s = max == 0 ? 0 : d / max;

		if (max == min) {
			h = 0; // achromatic
		} else {
			switch(max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
				
		h = Math.floor(h * 360);
		s = Math.floor(s * 100);
		v = Math.floor(v * 100);
		
		if (this.outputLogs) { console.log("Hue: "+h); }
		if (this.outputLogs) { console.log("Saturation: "+s); }
		if (this.outputLogs) { console.log("Brightness: "+v); }
		
		this.hue = h;
		this.saturation = s;
		this.brightness = v;
		
		informHomeKit();
	},

	setBrightness: function(brightness) { //set brightness
		if (this.outputLogs) { console.log("Setting '%s' brightness to %s", this.name, brightness); }
		this.brightness = brightness;
		this.brightnessChanged = true;
		this.changeColor();
	},

	getBrightness: function() { //get brightness
		if (this.outputLogs) { console.log("'%s' brightness is %s", this.name, this.brightness); }
		return this.brightness;
	},

	setSaturation: function(saturation) { //set brightness
		if (this.outputLogs) { console.log("Setting '%s' saturation to %s", this.name, saturation); }
		this.saturation = saturation;
		this.saturationChanged = true;
		this.changeColor();
	},

	getSaturation: function() { //get brightness
		if (this.outputLogs) { console.log("'%s' saturation is %s", this.name, this.saturation); }
		return this.saturation;
	},

	setHue: function(hue) { //set brightness
		if (this.outputLogs) { console.log("Setting '%s' hue to %s", this.name, hue); }
		this.hue = hue;
		this.hueChanged = true;
		this.changeColor();
	},

	getHue: function() { //get hue
		if (this.outputLogs) { console.log("'%s' hue is %s", this.name, this.hue); }
		return this.hue;
	},

	identify: function() { //identify the accessory
		if (this.outputLogs) { console.log("Identify the '%s'", this.name); }
	}
}

// Generate a consistent UUID for our light Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the word "light".
var lightUUID = uuid.generate('hap-nodejs:accessories:light' + LightController.name);

// This is the Accessory that we'll return to HAP-NodeJS that represents our light.
var lightAccessory = exports.accessory = new Accessory(LightController.name, lightUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
lightAccessory.username = LightController.username;
lightAccessory.pincode = LightController.pincode;

// set some basic properties (these values are arbitrary and setting them is optional)
lightAccessory
  .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, LightController.manufacturer)
    .setCharacteristic(Characteristic.Model, LightController.model)
    .setCharacteristic(Characteristic.SerialNumber, LightController.serialNumber);

// listen for the "identify" event for this Accessory
lightAccessory.on('identify', function(paired, callback) {
	LightController.identify();
	callback();
});

// Add the actual Lightbulb Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
lightAccessory
	.addService(Service.Lightbulb, LightController.name) // services exposed to the user should have "names" like "Light" for this case
	.getCharacteristic(Characteristic.On)
	.on('set', function(value, callback) {
		LightController.setPower(value);

		// Our light is synchronous - this value has been successfully set
		// Invoke the callback when you finished processing the request
		// If it's going to take more than 1s to finish the request, try to invoke the callback
		// after getting the request instead of after finishing it. This avoids blocking other
		// requests from HomeKit.
		callback();
	})
	// We want to intercept requests for our current power state so we can query the hardware itself instead of
	// allowing HAP-NodeJS to return the cached Characteristic.value.
	.on('get', function(callback) {
		callback(null, LightController.getPower());
	})
;

// also add an "optional" Characteristic for Brightness
lightAccessory
	.getService(Service.Lightbulb)
	.addCharacteristic(Characteristic.Brightness)
	.on('set', function(value, callback) {
		LightController.setBrightness(value);
		callback();
	})
	.on('get', function(callback) {
		callback(null, LightController.getBrightness());
	})
;

// also add an "optional" Characteristic for Saturation
lightAccessory
	.getService(Service.Lightbulb)
	.addCharacteristic(Characteristic.Saturation)
	.on('set', function(value, callback) {
		LightController.setSaturation(value);
		callback();
	})
	.on('get', function(callback) {
		callback(null, LightController.getSaturation());
	})
;

// also add an "optional" Characteristic for Hue
lightAccessory
	.getService(Service.Lightbulb)
	.addCharacteristic(Characteristic.Hue)
	.on('set', function(value, callback) {
		LightController.setHue(value);
		callback();
	})
	.on('get', function(callback) {
		callback(null, LightController.getHue());
	})
;

// inform HomeKit about changes
function informHomeKit() {
	lightAccessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.On).updateValue(LightController.getPower());
	lightAccessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.Brightness).updateValue(LightController.getBrightness());
	lightAccessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.Saturation).updateValue(LightController.getSaturation());
	lightAccessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.Hue).updateValue(LightController.getHue());
}

// startup routine
function start() {
	LightController.start()
}

start();