// config
// DEFAULT_W2V_FN = 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1810-1840.txt'
// DEFAULT_W2V_FN = 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1990-2020.txt'
//DEFAULT_W2V_FN = 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained_combined/1810-2020.min=100.run=01.txt'
// DEFAULT_W2V_FN="/Volumes/Present/DH/data/models/COHA_byhalfcentury_nonf/chained_full_combined/1800-2000.min=100.run=01.txt"
DEFAULT_W2V_FN="/Volumes/Present/DH/data/models/COHA_byhalfcentury_nonf/separate3_allskips/1800-1849.txt.run=01.txt"

VECS = ['Animal (VG2) <> Human (VG2)', 'Black <> White', 'Concrete (CHPoetry-All) <> Abstract (CHPoetry-All)', 'Concrete (CHPoetry-Robust) <> Abstract (CHPoetry-Robust)', 'Concrete (Consolidated) <> Abstract (Consolidated)', 'Concrete (ConsolidatedBinary) <> Abstract (ConsolidatedBinary)', 'Concrete (HGI) <> Abstract (HGI)', 'Derogatory (VG2) <> Non-Derogatory (VG2)]', 'Female (HGI) <> Male (HGI)', 'Female (VG2) <> Male (VG2)', 'Hard Seed (RH&LL) <> Abstract Values (RH&LL)', 'Negative (Abs-Cluster) <> Positive (Abs-Cluster)', 'Negative (HGI) <> Positive (HGI)', 'Object (VG2) <> Animal (VG2)', 'Object (VG2) <> Animal+Human (VG2)', 'Object (VG2) <> Human (VG2)', 'Object (WN) <> Human (WN)', 'Objective (Abs-Cluster) <> Subjective (Abs-Cluster)', 'Passive (HGI) <> Active (HGI)', 'Poetic Diction (CHPoetry) <> Prosaic Diction (CHPoetry)', 'Pre-Norman (TU&JS) <> Post-Norman (TU&JS)', 'Racialized (VG2) <> Non-Racialized (VG2)', 'Science (Abs-Cluster)', 'Submit (HGI) <> Power (HGI)', 'Substance (Locke) <> Mode (Locke)', 'Tangible (MT) <> Intangible (MT)', 'The Natural (Abs-Cluster) <> The Social (Abs-Cluster)', 'Vice (HGI) <> Virtue (HGI)', 'Weak (HGI) <> Strong (HGI)', 'Woman <> Man']
FIELDS = ['Abstract(CHPoetry-All)', 'Abstract(CHPoetry-Robust)', 'Abstract(Consolidated)', 'Abstract(ConsolidatedBinary)', 'Abstract(HGI)', 'AbstractValues(RH&LL)', 'Active(HGI)', 'Animal(VG2)', 'Animal+Human(VG2)', 'Black', 'Concrete(CHPoetry-All)', 'Concrete(CHPoetry-Robust)', 'Concrete(Consolidated)', 'Concrete(ConsolidatedBinary)', 'Concrete(HGI)', 'Derogatory(VG2)', 'Female(HGI)', 'Female(VG2)', 'HardSeed(RH&LL)', 'Human(VG2)', 'Human(WN)', 'Intangible(MT)', 'Male(HGI)', 'Male(VG2)', 'Man', 'Mode(Locke)', 'Negative(Abs-Cluster)', 'Negative(HGI)', 'Non-Derogatory(VG2)]', 'Non-Racialized(VG2)', 'Object(VG2)', 'Object(WN)', 'Objective(Abs-Cluster)', 'Passive(HGI)', 'PoeticDiction(CHPoetry)', 'Positive(Abs-Cluster)', 'Positive(HGI)', 'Post-Norman(TU&JS)', 'Power(HGI)', 'Pre-Norman(TU&JS)', 'ProsaicDiction(CHPoetry)', 'Racialized(VG2)', 'Strong(HGI)', 'Subjective(Abs-Cluster)', 'Submit(HGI)', 'Substance(Locke)', 'Tangible(MT)', 'TheNatural(Abs-Cluster)', 'TheSocial(Abs-Cluster)', 'Vice(HGI)', 'Virtue(HGI)', 'Weak(HGI)', 'White', 'Woman']
DEFAULT_N_SIMILAR = 10
// DEFAULT_CSIM_CUTOFF = 0.45
DEFAULT_CSIM_CUTOFF = undefined   // ie leave it at max DEFAULT_N_SIMILAR

// store in opts
GLOBAL_OPTS = {'fields':FIELDS, 'vecs':VECS}
GLOBAL_OPTS['all_fields_vecs'] = []
FIELDS.forEach(function(x) { GLOBAL_OPTS['all_fields_vecs'].push(x) })
VECS.forEach(function(x) { GLOBAL_OPTS['all_fields_vecs'].push(x) })
GLOBAL_OPTS['points']='movement'
GLOBAL_OPTS['view']='spaces'
GLOBAL_OPTS['x_vec_str']='King - Man + Woman'
GLOBAL_OPTS['y_vec_str']='Young - Old'

// start server
const express = require('express');
const app = express();
const port = 30101;
var http = require('http').createServer(app);
var io = require('socket.io')(http);
app.use('/static', express.static('static'))
var nunjucks = require('nunjucks')
nunjucks.configure('templates/', { autoescape: true, express: app });

// http routing
app.get('/', function(req, res){ return res.render('word.html'); });
http.listen(port, function(){ console.log('listening on *:'+port); });




// Word2vec
var embed = require('./embedding.js')
console.log('embed',embed)




// SOCKET ROUTING
io.on('connection', function(socket){
  // console.log('a user connected...');
  var io_log = function(x) { console.log(x); io.to(socket.id).emit('status','>> '+x); }
  var log = io_log

  
  // mostSimilar() -- find most similar
  socket.on('get_most_similar', function(args) {
  	// get most similar
  	io_log('received requst: get_vectors()')

  	var word = args['word'].toLowerCase();
  	var n_top;
  	if(args['n_top']) { n_top=args['n_top'] } else { n_top=DEFAULT_N_SIMILAR }
  	
  	embed.get_most_similar(word, n_most_similar=n_top)
  		.then(function(most_similar_data) {
  			
  			io.to(socket.id).emit('status','converting to network data format')
  			network_data = embed.mostsim2netjson(most_similar_data)

  			// send back main response
  			io.to(socket.id).emit('status','sending network data to browser')
    		io.to(socket.id).emit('get_most_similar_resp',network_data);
		})
		.catch(function(err) { console.log('err!!',err); });
  });


  // mostSimilar() -- find most similar
  socket.on('get_vectors', function(args) {
  	// get most similar
  	io_log('received requst: get_vectors()')

  	var word=args['word'].toLowerCase();
  	var n_top=parseInt(args['n_top']); //.toInteger();
  	
  	
  	embed.get_vectors(word, io_log=log)
  		.then(function(vector_data) {
  			// console.log('received vector_data',vector_data);
  			log('received vector_data')
  			console.log('vector_data',vector_data)


  			embed.get_most_similar_by_vector(vector_data,n_top=n_top,w2v_fn=DEFAULT_W2V_FN,log=io_log)
  				.then(function(most_similar_data) {
  					log('received most_similar_data')
  					console.log(most_similar_data)
  			
		  			log('converting to network data format')
		  			network_data = embed.mostsim2netjson(most_similar_data)

		  			// send back main response
		  			log('sending network data to browser')
		    		io.to(socket.id).emit('get_most_similar_resp',network_data);
				});

		})
		.catch(function(err) { 
			console.log('err!!',err); 
		});
  });




});




