"use strict";
/* jshint maxparams:7 */
var should = require('should');

function MockLogger() {

  var that = this;
  this.messages = [];
  
  ["info", "warn", "error"].forEach(function(level) {
    that[level] = function(message) {
      that.messages.push({ level: level, message: message });
    };
  });

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

function request(cl, method, url, code, reqHeaders, resHeaders, reasonPhrase) {
  var req = new MockRequest('my.remote.addr', method, url, reqHeaders);
  var res = new MockResponse();
  cl(req, res, function() {});
  if (reasonPhrase) {
    res.writeHead(code, reasonPhrase, resHeaders);
  } else {
    res.writeHead(code, resHeaders);
  }
  res.end('chunk','encoding');
}

describe('log4js connect logger', function() {
  var clm = require('../lib/index');
  
  it('should return a "connect logger" factory', function() {
    clm.should.be.a('function');
  });

  describe('when passed a log4js logger', function() {
    var ml = new MockLogger()
    , cl = clm(ml);

    it('should return a "connect logger"', function() {
      cl.should.be.a('function');
    });
    
    it('should log events', function() {
      request(cl, 'GET', 'http://url', 200);

      ml.messages.should.be.an.instanceOf(Array);
      ml.messages.should.have.length(1);
      ml.messages[0].level.should.eql('info');
      ml.messages[0].message.should.include('GET');
      ml.messages[0].message.should.include('http://url');
      ml.messages[0].message.should.include('my.remote.addr');
      ml.messages[0].message.should.include('200');
    });
  });

  describe('when passed a custom format', function() {
    var ml = new MockLogger()
    , cl = clm(ml, ':method :url');

    it('should log events with custom format', function() {
      request(cl, 'GET', 'http://url', 200);
      
      ml.messages.should.be.an.instanceOf(Array);
      ml.messages.should.have.length(1);
      ml.messages[0].level.should.eql('info');
      ml.messages[0].message.should.eql('GET http://url');
    });
  });

  describe('when requests have different status codes', function() {
    var ml = new MockLogger()
    , cl = clm(ml, ':method :url');

    before(function() {
      request(cl, 'GET', 'http://meh', 200);
      request(cl, 'GET', 'http://meh', 201);
      request(cl, 'GET', 'http://meh', 302);
      request(cl, 'GET', 'http://meh', 404);
      request(cl, 'GET', 'http://meh', 500);
    });
    
    it('should use INFO for 2xx', function() {
      ml.messages[0].level.should.eql('info');
      ml.messages[1].level.should.eql('info');
    });

    it('should use WARN for 3xx', function() {
      ml.messages[2].level.should.eql('warn');
    });

    it('should use ERROR for 4xx', function() {
      ml.messages[3].level.should.eql('error');
    });

    it('should use ERROR for 5xx', function() {
      ml.messages[4].level.should.eql('error');
    });
  });

  describe('when the format includes request headers', function() {
    var ml = new MockLogger()
    , cl = clm(ml, ':req[Content-Type]');

    before(function() {
      request(
        cl, 
        'GET', 'http://blah', 200, 
        { 'Content-Type': 'application/json' }
      );
    });

    it('should output the request header', function() {
      ml.messages[0].message.should.eql('application/json');
    });
  });

  describe('when the format includes response headers', function() {
    var ml = new MockLogger()
    , cl = clm(ml, ':res[Content-Type]');

    before(function() {
      request(
        cl,
        'GET', 'http://blah', 200,
        null,
        { 'Content-Type': 'application/cheese' }
      );
    });

    it('should output the response header', function() {
      ml.messages[0].message.should.eql('application/cheese');
    });
  });

  describe('when passed a nolog RegExp', function() {
    var ml = new MockLogger()
    , cl = clm(ml, /\.gif|\.jpe?g/);

    afterEach(function() { ml.messages.pop(); });

    it('should log requests that do not match the regexp', function() {
      request(cl, 'GET', 'http://url/hoge.png', 200);
      
      ml.messages.should.have.length(1);
      ml.messages[0].level.should.eql('info');
      ml.messages[0].message.should.include('GET');
      ml.messages[0].message.should.include('http://url/hoge.png');
      ml.messages[0].message.should.include('my.remote.addr');
      ml.messages[0].message.should.include('200');
    });

    it('should not log requests that do match the regexp (gif)', function() {
      request(cl, 'GET', 'http://url/hoge.gif', 200);
      
      ml.messages.should.have.length(0);
    });

    it('should not log requests that do match the regexp (jpeg)', function() {
      request(cl, 'GET', 'http://url/hoge.jpeg', 200);

      ml.messages.should.have.length(0);
    });
  });

  describe('when the three argument form of res.writeHead is used', function() {
    var ml = new MockLogger()
    , cl = new clm(ml, ':res[Content-Type]');

    before(function() {
      request(
        cl, 
        'GET', 'http://url', 200, 
        null, 
        { 'Content-Type': 'application/json' },
        'OK'
      );
    });

    it('should still log the headers', function() {
      ml.messages.should.have.length(1);
      ml.messages[0].message.should.include('application/json');
    });
  });
});
