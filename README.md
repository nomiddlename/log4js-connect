log4js-connect
==============

Connect middleware that logs http requests to log4js, or potentially any logging framework that exposes "info", "warn", and "error" functions.

Installation
------------

	npm install log4js-connect
	
Note that log4js is not a dependency of this project, to avoid having multiple version of log4js included in your projects (and this module can be used without log4js - see below).

Usage
-----
	var log4js = require('log4js');
	var connectLogger = require('log4js-connect');
	var app = require('express')();
	app.use(connectLogger(log4js.getLogger('http')));
	
connectLogger(logger, [format], [nolog])
----------------------------------------

* `logger` - an object that has three functions named "info", "warn", "error". These functions will be called with a formatted string as follows:
	* http response status = 1xx, 2xx - "info" called
	* http response status = 3xx - "warn" called
	* http response status = 4xx, 5xx - "error" called
* `format` - String, format for the output can contain the following tokens:
	* `:req[header]` ex: `:req[Accept]`
 	* `:res[header]` ex: `:res[Content-Length]`
 	* `:http-version`
 	* `:response-time`
 	* `:remote-addr`
 	* `:date`
 	* `:method`
 	* `:url`
 	* `:referrer`
 	* `:user-agent`
 	* `:status`
* `nolog` - RegExp, URLs matching the regular expression will not be logged

The default format string used is `:remote-addr - - ":method :url HTTP/:http-version" :status :content-length ":referrer" ":user-agent"`

See `example.js` for a comprehensive example which includes log4js configuration and multiple connect loggers. `console-example.js` shows that you can use the connect logger without log4js, just passing in node's console object instead.


Changes since it was part of log4js
-----------------------------------
If you were using the connect logger that was included as part of log4js prior to version 0.7, this version has some differences that you may be interested in:

* format is always a string, no function support any more
* nolog is always a regexp, previously it could be a string, array or a regexp
* connectLogger now takes three arguments instead of an options object
* level is now always 'auto': info for status 1xx, 2xx; warn for 3xx; error for 4xx, 5xx (no need to specify a level for connect logger)
* module now returns a function (`var connectLogger = require('log4js-connect')(log4jslogger);`)
* no longer checks to see if already mounted - this was causing problems if you actually wanted to app.use two different loggers

License
-------
Apache 2.0