// The connect/express logger was added to log4js by danbell. 
// This allows connect/express servers to log using log4js.
// https://github.com/nomiddlename/log4js-node/wiki/Connect-Logger

// to get this example to run you'll need to 
// npm install log4js express log4js-connect

// load modules
var log4js = require('log4js');
var connectLogger = require('log4js-connect');
var express = require("express");
var app = express();

//config
log4js.configure({
	appenders: {
    "console": { type: 'console' },
		"accesslog": { 
      type: 'file', 
      filename: 'logs/log4jsconnect.log'
    }
	},
  categories: {
    "default": { level: "debug", appenders: [ "console" ] },
    "http": { level: "info", appenders: [ "accesslog", "console" ] },
    "noimages": { level: "info", appenders: [ "console" ] },
    "customformat": { level: "info", appenders: [ "console" ] }
  }
});

//define logger
var logger = log4js.getLogger('http');

//express app
app.configure(function() {
	app.use(express.favicon(''));

  //minimal version - in a real app, you'd probably only use this one
  app.use(connectLogger(logger));

  //custom log format
	app.use(connectLogger(log4js.getLogger('customformat'), ':method :url :status :response-time'));

  //don't log image requests
  app.use(connectLogger(log4js.getLogger('noimages'), /\.gif$|\.jpg$|\.png$/));

});

//route
app.get('/', function(req,res) {
	res.send('hello world');
});

//start app
app.listen(5000);

console.log('server runing at localhost:5000');
console.log('Simulation of normal response: goto localhost:5000');
console.log('Simulation of error response: goto localhost:5000/xxx');
