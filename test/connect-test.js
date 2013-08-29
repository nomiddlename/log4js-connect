/* jshint maxparams:7 */
"use strict";
var vows = require('vows')
, assert = require('assert');

function MockLogger() {

  var that = this;
  this.messages = [];
  
  this.log = function(level, message, exception) {
    that.messages.push({ level: level, message: message });
  };

}

function MockRequest(remoteAddr, method, originalUrl, headers) {

  this.socket = { remoteAddress: remoteAddr };
  this.originalUrl = originalUrl;
  this.method = method;
  this.httpVersionMajor = '5';
  this.httpVersionMinor = '0';
  this.headers = headers || {};

  var self = this;
  Object.keys(this.headers).forEach(function(key) {
    self.headers[key.toLowerCase()] = self.headers[key];
  });
}

function MockResponse(statusCode) {
  
  this.statusCode = statusCode;

  this.end = function(chunk, encoding) {    
  };

  this.writeHead = function(code, headers) {
  };

}

function request(cl, method, url, code, reqHeaders, resHeaders) {
  var req = new MockRequest('my.remote.addr', method, url, reqHeaders);
  var res = new MockResponse();
  cl(req, res, function() {});
  res.writeHead(code, resHeaders);
  res.end('chunk','encoding');
}

vows.describe('log4js connect logger').addBatch({
  'getConnectLoggerModule': {
    topic: function() {
      var clm = require('../lib/index');
      return clm;
    },
    
    'should return a "connect logger" factory' : function(clm) {
      assert.isFunction(clm);
    },

    'take a log4js logger and return a "connect logger"' : {
      topic: function(clm) {
        var ml = new MockLogger();
        var cl = clm(ml);
        return cl;
      },
      
      'should return a "connect logger"': function(cl) {
        assert.isFunction(cl);
      }
    },
    
    'log events' : {
      topic: function(clm) {
        var ml = new MockLogger();
        var cl = clm(ml);
        request(cl, 'GET', 'http://url', 200);
        return ml.messages;
      },

      'check message': function(messages) {
        assert.isArray(messages);
        assert.equal(messages.length, 1);
        assert.equal("info", messages[0].level);
        assert.include(messages[0].message, 'GET');
        assert.include(messages[0].message, 'http://url');
        assert.include(messages[0].message, 'my.remote.addr');
        assert.include(messages[0].message, '200');
      }
    },

    'log events with custom format' : {
      topic: function(clm) {
        var ml = new MockLogger();
        var cl = clm(ml, ':method :url');
        request(cl, 'GET', 'http://url', 200);
        return ml.messages;
      },
      
      'check message': function(messages) {
        assert.isArray(messages);
        assert.equal(messages.length, 1);
        assert.equal(messages[0].level, 'info');
        assert.equal(messages[0].message, 'GET http://url');
      }
    },

    'auto log levels': {
      topic: function(clm) {
        var ml = new MockLogger();
        var cl = clm(ml, ':method :url');
        request(cl, 'GET', 'http://meh', 200);
        request(cl, 'GET', 'http://meh', 201);
        request(cl, 'GET', 'http://meh', 302);
        request(cl, 'GET', 'http://meh', 404);
        request(cl, 'GET', 'http://meh', 500);
        return ml.messages;
      },

      'should use INFO for 2xx': function(messages) {
        assert.equal(messages[0].level, 'info');
        assert.equal(messages[1].level, 'info');
      },

      'should use WARN for 3xx': function(messages) {
        assert.equal(messages[2].level, 'warn');
      },

      'should use ERROR for 4xx': function(messages) {
        assert.equal(messages[3].level, 'error');
      },

      'should use ERROR for 5xx': function(messages) {
        assert.equal(messages[4].level, 'error');
      }
    },

    'format that includes request headers': {
      topic: function(clm) {
        var ml = new MockLogger();
        var cl = clm(ml, ':req[Content-Type]');
        request(
          cl, 
          'GET', 'http://blah', 200, 
          { 'Content-Type': 'application/json' }
        );
        return ml.messages;
      },
      'should output the request header': function(messages) {
        assert.equal(messages[0].message, 'application/json');
      }
    },

    'format that includes response headers': {
      topic: function(clm) {
        var ml = new MockLogger();
        var cl = clm(ml, ':res[Content-Type]');
        request(
          cl,
          'GET', 'http://blah', 200,
          null,
          { 'Content-Type': 'application/cheese' }
        );
        return ml.messages;
      },

      'should output the response header': function(messages) {
        assert.equal(messages[0].message, 'application/cheese');
      }
    },

    'nolog RegExp' : {
      topic: function(clm) {
        var ml = new MockLogger();
        var cl = clm(ml, /\.gif|\.jpe?g/);
        return {cl: cl, ml: ml};
      },

      'check unmatch url request (png)': {
        topic: function(d){
          var req = new MockRequest('my.remote.addr', 'GET', 'http://url/hoge.png'); // not gif
          var res = new MockResponse(200);
          d.cl(req, res, function() { });
          res.end('chunk', 'encoding');
          return d.ml.messages;
        }, 
        'check message': function(messages){
          assert.isArray(messages);
          assert.equal(messages.length, 1);
          assert.equal(messages[0].level, 'info');
          assert.include(messages[0].message, 'GET');
          assert.include(messages[0].message, 'http://url');
          assert.include(messages[0].message, 'my.remote.addr');
          assert.include(messages[0].message, '200');
          messages.pop();
        }
      },

      'check match url request (gif)': {
        topic: function(d) {
          var req = new MockRequest('my.remote.addr', 'GET', 'http://url/hoge.gif'); // gif
          var res = new MockResponse(200);
          d.cl(req, res, function() { });
          res.end('chunk', 'encoding');
          return d.ml.messages;
        }, 
        'check message': function(messages) {
          assert.isArray(messages);
          assert.equal(messages.length, 0);
        }
      },

      'check match url request (jpeg)': {
        topic: function(d) {
          var req = new MockRequest('my.remote.addr', 'GET', 'http://url/hoge.jpeg'); // gif
          var res = new MockResponse(200);
          d.cl(req, res, function() { });
          res.end('chunk', 'encoding');
          return d.ml.messages;
        }, 
        'check message': function(messages) {
          assert.isArray(messages);
          assert.equal(messages.length, 0);
        }
      }
    }

  }
}).export(module);
