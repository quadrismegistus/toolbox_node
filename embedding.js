

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
		  		//console.log( model );
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


function get_most_similar_by_vector(formula2vec={},n_top=DEFAULT_N_SIMILAR,w2v_fn=DEFAULT_W2V_FN,log=console.log) {
	log('get_most_similar_by_vector()')

	return new Promise(function(resolve,reject) {
		get_model(w2v_fn).then(function(M) { 

			all_sims = [];

			for(var formula in formula2vec) {
				vec=formula2vec[formula]
				
				sims = M.getNearestWords(vec, n_top+1)
				sims.forEach(function(sim_d) {
					if (sim_d['word']!=formula) {
						new_sim_d={}
						new_sim_d['word']=formula
						new_sim_d['word2']=sim_d['word']
						new_sim_d['csim']=sim_d['dist']
						all_sims.push(new_sim_d)
						console.log('new_sim_d',new_sim_d)
					}
				});
			}

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






function get_vectors(word_or_words_str,io_log=console.log,w2v_fn=DEFAULT_W2V_FN) {
	var word_or_words_str;
	const path = require('path'); 

	word_or_words_str=reformat_formula_str(word_or_words_str)
	return new Promise(function(resolve,reject) {
		get_model(w2v_fn).then(function(M) { 
			io_log('loaded model: "'+path.basename(w2v_fn,'.txt')+'"')

			console.log('word_or_words_str',word_or_words_str)

			// new: account for multiple words
			var word_list = split_words_only(word_or_words_str);
			io_log('found unique words: '+word_list.join(','))
			
			// var all_vecs = [];
			var name2vecs = {};
			// var all_words = [];

			word_list.forEach(function(w) { 
				io_log('getting vectors for: '+w,'...')
				// try { 
					vecs = M.getVector(w).values
					//console.log('vecs',vecs)
					// all_vecs.push(vecs)
					// all_words.push(w)
					name2vecs[w]=vecs
					print(w,vecs[0])
					// console.log('vecs',vecs)
				// } catch(TypeError) { 
					// con
				// }
			});

			// console.log('name2vecs',name2vecs)
			// console.log('all_vecs',all_vecs)
			

			// loop over formulas
			var new_vec_dir={}
			word_or_words_str.split(',').forEach(function(formula_str) {

				io_log('solving formula: '+formula_str)
				formula_str=formula_str.trim();
				new_vec = solve_vectors(formula_str,name2vecs)
				was_new = !word_list.includes(formula_str)
				if (was_new) { formula_str = 'V('+reformat_formula_str(formula_str)+')' }
				new_vec_dir[formula_str] = new_vec
			});
			return resolve(new_vec_dir);
		});
	});
}








function split_words_only(_words) {
	_words=reformat_formula_str(_words)
	// var regex = /\w+/g;
	_words_l=_words.split(/[^A-Z_a-z0-9]+/);
	_words_l2=[]
	_words_l.forEach(function(w) { if(w) { _words_l2.push(w) } })
	// console.log(_words,'--tokenized-->',_words_l)
	return _words_l2
}



function split_words(_words) {
	// _words=_words.replace('-',' - ')
	// _words=_words.replace('+',' + ')
	// _words=_words.replace('*',' * ')
	// _words=_words.replace('/',' / ')
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

	// console.log(_words,'--tokenized-->',_words_l)
	return _words_l;
}


function reformat_formula_str(_words) {
	_words=_words.replace(' ','')
	// _words=_words.replace('-',' - ')
	// _words=_words.replace('+',' + ')
	// _words=_words.replace('*',' * ')
	// _words=_words.replace('/',' / ')
	return _words;
}





function compute_arrays(x, y, operator) {
	//console.log('compute_arrays',operator,x,y)
	// if (x==undefined & y!=undefined) { return y; }
	// if (y==undefined & x!=undefined) { return x; }

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
function vector_divide(x, y) { return compute_arrays(x,y,'/') } // '/') }
function vector_multiply(x, y) { return compute_arrays(x,y,'*') } //'*') }


function solve_vectors(formula, var2val={}) {
	const expr = require('expression-eval');
	// console.log('getting ast')
	var ast = expr.parse('('+formula+')');
	//console.log('ast',ast);
	return compute_tree(ast,var2val=var2val);
}

function compute_tree(tree,var2val={}) {
	// console.log('tree',Boolean(tree.left),tree)
	// console.log('var2val',var2val)

	var arr_left=undefined;
	var arr_right=undefined;
	var op=undefined;
	var new_val=undefined;


	// if branches
	if (tree.left) { 
		// console.log('found split in tree:',tree.left,tree.operator,tree.right)
		arr_left = compute_tree(tree.left,var2val)
		op = tree.operator
		arr_right = compute_tree(tree.right,var2val)
		new_val = compute_arrays(arr_left,arr_right,op)
		// console.log('computation result ',arr_left[0],op,arr_right[0],'= ',new_val[0])
		return new_val;
	} else if (tree.value) {
		// console.log('found a value in tree',tree.value)
		return tree.value;
	} else {
		// console.log('found a variable in tree',tree.name)
		new_val = var2val[tree.name]
		// console.log('found a new_val of',new_val) //.islice(0,5))
		//console.log('new_val',new_val)
		return new_val;
	}
}

print = function(x) { console.log(x); }






exports.get_model = get_model
exports.get_vectors = get_vectors
exports.get_most_similar = get_most_similar
exports.get_most_similar_by_vector = get_most_similar_by_vector
exports.mostsim2netjson = mostsim2netjson