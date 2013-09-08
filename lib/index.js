"use strict";
var debug = require('debug')('log4js:connect')
, DEFAULT_FORMAT = ':remote-addr - -' + 
  ' ":method :url HTTP/:http-version"' + 
  ' :status :content-length ":referrer"' + 
  ' ":user-agent"';
/**
 * Log requests with the given `format` string.
 *
 *   - `logger`        log4js.Logger instance
 *   - `format`        Format string, see below for tokens (optional)
 *   - `nolog`         URLs matching this regexp will not be logged (optional)
 *
 * Tokens:
 *
 *   - `:req[header]` ex: `:req[Accept]`
 *   - `:res[header]` ex: `:res[Content-Length]`
 *   - `:http-version`
 *   - `:response-time`
 *   - `:remote-addr`
 *   - `:date`
 *   - `:method`
 *   - `:url`
 *   - `:referrer`
 *   - `:user-agent`
 *   - `:status`
 *
 * @param {log4js.Logger} logger
 * @param {String} format
 * @param {Regexp} nolog
 * @return {Function}
 * @api public
 */
module.exports = function connectLogger(logger4js, formatString, nolog) {

	var fmt = formatString || DEFAULT_FORMAT;
  if (fmt instanceof RegExp) {
    nolog = fmt;
    fmt = DEFAULT_FORMAT;
  }

  debug("connectLogger created with args: ", logger4js, fmt, nolog);

  return function (req, res, next) {
    debug("request received with url ", req.originalUrl);
		// nologs
		if (nolog && nolog.test(req.originalUrl)) return next();
      
		var start = new Date()
		, statusCode
    , logFn = logger4js.info
		, writeHead = res.writeHead
		, end = res.end
		, url = req.originalUrl;

    debug("we're going to log it");
      
		// proxy for statusCode.
		res.writeHead = function(code, reasonPhrase, headers){
      debug("res.writeHead received with ", code, reasonPhrase, headers);

      if (typeof reasonPhrase === 'object' && reasonPhrase !== null) {
        headers = reasonPhrase;
        reasonPhrase = null;
      }
			res.writeHead = writeHead;
			res.writeHead(code, reasonPhrase, headers);
			res.__statusCode = statusCode = code;
			res.__headers = headers || {};
      
			//status code response level handling
			if(code >= 300) logFn = logger4js.warn;
			if(code >= 400) logFn = logger4js.error;
    };
      
		// proxy end to output a line to the provided logger.
		res.end = function(chunk, encoding) {
      debug("res.end received");
			res.end = end;
			res.end(chunk, encoding);
			res.responseTime = new Date() - start;
      debug("logging to logFn ", logFn, " message: ", format(fmt, req, res));
			logFn.call(logger4js, format(fmt, req, res));
		};
    
    debug("calling next");
    //ensure next gets always called
    next();
  };
};

/**
 * Return formatted log line.
 *
 * @param  {String} str
 * @param  {IncomingMessage} req
 * @param  {ServerResponse} res
 * @return {String}
 * @api private
 */
function format(str, req, res) {
	return str
    .replace(':url', req.originalUrl)
    .replace(':method', req.method)
    .replace(':status', res.__statusCode || res.statusCode)
    .replace(':response-time', res.responseTime)
    .replace(':date', new Date().toUTCString())
    .replace(':referrer', req.headers.referer || req.headers.referrer || '')
    .replace(':http-version', req.httpVersionMajor + '.' + req.httpVersionMinor)
    .replace(
      ':remote-addr', 
      req.socket && 
        (req.socket.remoteAddress || (req.socket.socket && req.socket.socket.remoteAddress))
    )
    .replace(':user-agent', req.headers['user-agent'] || '')
    .replace(
      ':content-length', 
      (res._headers && res._headers['content-length']) || 
        (res.__headers && res.__headers['Content-Length']) || 
        '-'
    )
    .replace(/:req\[([^\]]+)\]/g, function(_, field){ return req.headers[field.toLowerCase()]; })
    .replace(/:res\[([^\]]+)\]/g, function(_, field){
      return res._headers ? 
        (res._headers[field.toLowerCase()] || res.__headers[field])
        : (res.__headers && res.__headers[field]);
    });
}
