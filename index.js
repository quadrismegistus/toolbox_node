// load config
var fs = require('fs');
eval(fs.readFileSync('config.js')+'');

// start w2v
var w2v = require( 'word2vec' );
var M = undefined;
w2v.loadModel( w2v_fn, function( error, model ) {
  // console.log("errror?",error);
  console.log('>> loading model for the first time!');
  console.log( model );
  console.log(model.mostSimilar( 'value_1810', 10 ));
  M = model;
  console.log('M=',M)
});
console.log('M0=',M)

// Start server
const express = require('express');
const app = express();
const port = 30101;
var http = require('http').createServer(app);
var io = require('socket.io')(http);

// static
app.use('/static', express.static('static'))


// templater
var nunjucks = require('nunjucks')
// nunjucks.configure('templates/');
nunjucks.configure('templates/', { autoescape: true, express: app });


// listen
http.listen(port, function(){ console.log('listening on *:'+port); });

// http route
app.get('/', function(req, res){
  // res.sendFile(__dirname + '/templates/word.html');
  return res.render('word.html');
});

console.log('M1=',M)
// socket route
io.on('connection', function(socket){
  console.log('a user connected...');


  // /// get most similar
  // socket.on('get_most_similar', function(msg) {
  //   response = M.mostSimilar(msg,10);
  //   console.log('!',response);
  //   io.emit('get_most_similar_resp',response);
  // });

  // get vector
  n_most_similar = 500;
  socket.on('mostSimilar', function(msg) {
    console.log('<< mostSimilar()',msg)
    response = M.mostSimilar(msg, n_most_similar);
    console.log('>> mostSimilar()',response)
    io.emit('mostSimilar_resp',response);
  });

  // get vector
  socket.on('getVector', function(msg) {
    console.log('<< getVector()',msg)
    response = M.getVector(msg);
    console.log('>> getVector()',response)
    io.emit('getVector_resp',response);
  });

});






  //
  // // Set some defaults (required if your JSON file is empty)
  // db.defaults({ posts: [], user: {}, count: 0 })
  //   .write()
  //
  // // Add a post
  // db.get('posts')
  //   .push({ id: 1, title: 'lowdb is awesome'})
  //   .write()
  //
  // // Set a user using Lodash shorthand syntax
  // db.set('user.name', 'typicode')
  //   .write()
  //
  // // Increment count
  // db.update('count', n => n + 1)
  //   .write()
