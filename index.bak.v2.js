// config
DEFAULT_W2V_FN = 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1810-1840.txt'
// DEFAULT_W2V_FN = 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1990-2020.txt'
// DEFAULT_W2V_FN = 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained_combined/1810-2020.min=100.run=01.txt'
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








// MODEL CODE 
var w2v=require('word2vec')
var fn2M = {};     // other models

// get model (as a promise)
function get_model(w2v_fn = DEFAULT_W2V_FN) { 
	console.log('>> loading w2v_fn:',w2v_fn)
	let promise = new Promise(function(resolve,reject) { 
		var m = undefined;
		if(w2v_fn in fn2M) {
			m = resolve(fn2M[w2v_fn]);
		} else {
			w2v.loadModel( w2v_fn, function( error, model ) {
		  		if(error!==null) { console.log("errror?",error,model); }
		  		console.log('>> finished loading model:',w2v_fn);
		  		console.log( model );
		  		fn2M[w2v_fn]=model;
		  		m = resolve(model);
			});
		}
		return m;
	});
	return promise;
}


function get_most_similar(word,n_top=DEFAULT_N_SIMILAR,w2v_fn=DEFAULT_W2V_FN) {
	console.log('getting ',n_top,' most similar words to:',word)
	
	return new Promise(function(resolve,reject) {
		get_model(w2v_fn).then(function(M) { 
			console.log('>> got back model:',M)

			// new: account for multiple words
			word_list = split_words(word);
			all_sims = [];

			word_list.forEach(function(w) { 
				try { 
					sims = M.mostSimilar(w, n_top)
					//console.log('>> M.mostSimilar()',sims)

					sims.forEach(function(sim_d) {
						new_sim_d={}
						new_sim_d['word']=w
						new_sim_d['word2']=sim_d['word']
						new_sim_d['csim']=sim_d['dist']
						//console.log('new_sim_d',new_sim_d)
						all_sims.push(new_sim_d)
					});
				} catch(TypeError) { 
					// ...
				}
			});
			
			return resolve(all_sims);
		});
	});
}




function mostsim2netjson(most_similar_data,cutoff=DEFAULT_CSIM_CUTOFF) {
	// format data
	var nodes = []
	var nodes_sofar = []
	var links = []

	most_similar_data.forEach(function(data) {
		word1=data['word']
		word2=data['word2']
		csim=data['csim']

		if (cutoff==undefined | csim>=cutoff) {
			maybe_new_nodes = [word1,word2]
			maybe_new_nodes.forEach(function(w) { 
			  if(!(nodes_sofar.includes(w))) {
					nodes_sofar.push(w)
					new_node = {'id':w}
					nodes.push(new_node)
				}
			});


		
			console.log(word1,'--',csim,'-->',word2)
			links.push({'source':word1, 'target':word2, 'weight':csim})
		}
	});

	//console.log('nodes',nodes)
	//console.log('links',links)

	//return (nodes,links);
	return {'nodes':nodes, 'links':links}
}




function split_words(_words) {
	try {
		_words_l0 = _words.split(',')
	} catch(TypeError) {
		return [];
	}
	_words_l = []
	for(wii=0; wii<_words_l0.length; wii++) {
		_words_l.push(_words_l0[wii].trim());
	}
	// console.log('split_words',_words,_words_l);
	return _words_l;
}








function get_vectors(word_or_words_str,io_log=console.log,w2v_fn=DEFAULT_W2V_FN) {
	return new Promise(function(resolve,reject) {
		get_model(w2v_fn).then(function(M) { 
			io_log('>> got back model:')

			// new: account for multiple words
			word_list = split_words(word_or_words_str);
			io_log('split input into: '+word_list.join('|'))
			
			all_vecs = [];
			// all_words = [];

			word_list.forEach(function(w) { 
				io_log('getting vectors for',w,'...')
				try { 
					vecs = M.getVector(w)
					all_vecs.push(vecs)
					// all_words.push(w)

					console.log(vecs)
				} catch(TypeError) { 
					// ...
				}
			});
			
			return resolve(all_vecs);
		});
	});
}

function compute_arrays(x, y, operator) {
	new_l = [];
	for(i=0; i<x.length; i++) {
		val = undefined
		if (operator=="+") { val = x[i]+y[i]; }
		if (operator=="-") { val = x[i]-y[i]; }
		if (operator=="*") { val = x[i]*y[i]; }
		if (operator=="/") { val = x[i]/y[i]; }
		new_l.push(val)
	}
	return new_l
}

function vector_add(x, y) { return compute_arrays(x,y,'+') }
function vector_subtract(x, y) { return compute_arrays(x,y,'-') }
function vector_divide(x, y) { return compute_arrays(x,y,'/') }
function vector_multiply(x, y) { return compute_arrays(x,y,'*') }










// SOCKET ROUTING
io.on('connection', function(socket){
  console.log('a user connected...');
  var io_log = function(x) { io.to(socket.id).emit('status',x); }

  
  // mostSimilar() -- find most similar
  socket.on('get_most_similar', function(args) {
  	// get most similar
  	io.emit('status','<< get_most_similar()')

  	var word = args['word']
  	var n_top;
  	if(args['n_top']) { n_top=args['n_top'] } else { n_top=DEFAULT_N_SIMILAR }
  	
  	get_most_similar(word, n_most_similar=n_top)
  		.then(function(most_similar_data) {
  			
  			io.to(socket.id).emit('status','converting to network data format')
  			network_data = mostsim2netjson(most_similar_data)

  			// send back main response
  			io.to(socket.id).emit('status','sending network data to browser')
    		io.to(socket.id).emit('get_most_similar_resp',network_data);
		})
		.catch(function(err) { console.log('err!!',err); });
  });


  // mostSimilar() -- find most similar
  socket.on('get_vectors', function(args) {
  	// get most similar
  	io.emit('status','<< get_vectors()')

  	var word=args['word']
  	
  	
  	get_vectors(word, io_log=io_log)
  		.then(function(vector_data) {

  			console.log('received vector_data',vector_data);

  			// const FormulaParser = require('formula-parser');
  			// const algebraParser = new FormulaParser(); //variableKey, unaries, binaries);

  			// console.log(algebraParser.parse('a + b'));

  			// var Formula = require('fparser');
			// var fObj = new Formula('2^x)');
			const expr = require('expression-eval');
			const ast = expr.parse('1 + foo');
			console.log('ast',ast)




  			var overload = require('operator-overloading');
  			
			overload(function () {

			    //A simple student constructor
			    function Vector(array) {
			        var _this = this;
			        this.array = array;
			        //THIS is WHERE we OVERLOAD '+' Operator


			        this.compute_arrays = function (x, y, operator) {
						new_l = [];
						for(i=0; i<x.length; i++) {
							val = undefined
							if (operator=="+") { val = x[i]+y[i]; }
							if (operator=="-") { val = x[i]-y[i]; }
							if (operator=="*") { val = x[i]*y[i]; }
							if (operator=="/") { val = x[i]/y[i]; }
							new_l.push(val)
						}
						return new_l
					}

			        this.__plus = function (leftOperand) {
			        	console.log(this.array,'+',leftOperand.array,'???')
			        	summed = this.compute_arrays(this.array, leftOperand.array, '+')
			        	console.log('= ',summed)
			            return new Vector(summed);
			        };
			        this.toString = function() { return this.array.join(', '); }
			    }
			 
			    //Define some students
			    var ones = new Vector([1,1,1])
			        tens = new Vector([10,10,10])
			        hundreds = new Vector([100,100,100])
			 
			    //See the overload magic
			    var group1 = ones + tens,
			        group2 = ones + tens + hundreds,
			        group3 = tens + hundreds;

				
			 
			    //Lets print
			    console.log(group1.toString()); //Output: Kushal+Kashish:156
			    console.log(group2.toString()); //Output: Kushal+Kashish+Vibhor:236
			    console.log(group3.toString()); //Output: Kushal+Vibhor:146

			  //     			var word2array={}

  			// vector_data.forEach(function (word_vec_obj) {
  			// 	if(word_vec_obj) {
  			// 		word2array[word_vec_obj.word]=word_vec_obj.values;
  			// 	}
  			// });



  			word2array={}
  			word2array['a']=ones
  			word2array['b']=tens
  			word2array['c']=hundreds

  			let scope = word2array;


  			console.log('mathans', math.evaluate('a + b', scope) )

			 
			})();

			//  /*Here you are enabling overloading for this function scope only*/();
			 








  			
  			// ...

		})
		.catch(function(err) { 
			console.log('err!!',err); 
		});
  });




});




