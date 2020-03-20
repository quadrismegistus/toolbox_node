// start server
const express = require('express');
const app = express();
const port = 30101;
var http = require('http').createServer(app);
var io = require('socket.io')(http);
app.use('/static', express.static('static'))
http.listen(port, function(){ console.log('listening on *:'+port); });