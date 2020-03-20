

// SOCKET ROUTING
io.on('connection', function(socket){
  console.log('a user connected...');

  // get vector
  n_most_similar = 500;
  socket.on('mostSimilar', function(msg) {
    response = mostSimilar(msg, n_most_similar);
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

