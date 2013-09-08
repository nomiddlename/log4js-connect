var express = require('express');
var connectLogger = require('log4js-connect');
var app = express();

app.configure(function() {
  app.use(connectLogger(console));
});

app.get('/', function(req, res) {
  res.send("hello world");
});
app.listen(5000);
