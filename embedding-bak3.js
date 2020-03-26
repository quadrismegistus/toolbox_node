// Constants
DEFAULT_CORPUS = 'COHA'
DEFAULT_PERIOD_TYPE = 'byhalfcentury'

W2V_MODELS = {
	'COHA_byhalfcentury_nonf': {
		"fn": "static/data/db/models/COHA_byhalfcentury_nonf/chained_full_combined/1800-2000.min=100.run=01.txt",
		'periods':['1800','1850','1900','1950'],
		'periods_nice':['1800-1850','1850-1900','1900-1950','1950-2000'],
		"corpus_desc":"COHA (Corpus of Historical American English), Non-Fiction"
	},

	'COHA_byhalfcentury_nonf_smpl': {
		"fn": "static/data/db/models/COHA_byhalfcentury_nonf/chained_combined/1800-1999.min=500.run=01.txt",
		'periods':['1800','1850','1900','1950'],
		'periods_nice':['1800-1850','1850-1900','1900-1950','1950-2000'],
		"corpus_desc":"COHA (Corpus of Historical American English), Non-Fiction [Samples]"
	},

	'COHA_bythirtyyear_nonf': {
		"fn": "static/data/db/models/COHA_bythirtyyear_nonf_full/chained_combined/1810-2020.min=100.run=01.txt",
		'periods':['1810','1840','1870','1900','1930','1960','1990'],
		'periods_nice':['1810-1840','1840-1870','1870-1900','1900-1930','1930-1960','1960-1990','1990-2020'],
		"corpus_desc":"COHA (Corpus of Historical American English), Non-Fiction"
	}
}

DEFAULT_W2V_MODEL = 'COHA_bythirtyyear_nonf'
DEFAULT_W2V_FN = W2V_MODELS[DEFAULT_W2V_MODEL]['fn']
DEFAULT_PERIODS = W2V_MODELS[DEFAULT_W2V_MODEL]['periods']
DEFAULT_EXPAND_N = 2
const DEFAULT_N_SIMILAR = 1


// word2vec imports
var w2v=require('word2vec')
const math = require('mathjs')
const path = require('path'); 
// var DataFrame = require('dataframe-js').DataFrame;

// load fields and variables
const fs = require('fs');
let field2words = JSON.parse(fs.readFileSync('static/data/db/fields/_id2words.json')).data
let vec_names = JSON.parse(fs.readFileSync('static/data/db/fields/_vecids.json')).data
let content_words = JSON.parse(fs.readFileSync('static/data/db/misc/content_words.json')).data


// global variables for storage
var fn2M = {}
var fn2voc={} 

// ------------ //

// fn=undefined,periods=undefined,voc_fn=undefined,log=console.log) {

async function with_model(opts,log=console.log,progress=console.log) {

	function Model() { }

	//fn_periods = opts2model_fn(opts)

	Model.fn = opts['model_fn']
	Model.periods=opts['model_periods']
	Model.opts=opts
	fn=Model.fn
	periods=Model.periods
	console.log('periods!',Model.periods)
	if(opts['voc_fn']==undefined) { opts['voc_fn']=fn.replace('.txt','.vocab.txt') }
	
	Model.voc_fn=opts['voc_fn']
	Model.log=log
	Model.progress=progress
	log('loading model: '+fn)

	model_vocab = await get_model(fn)
	// Model.progress(0.5,opts)

	Model.M = model_vocab[0]
	Model.vocab = model_vocab[1]

	Model.num_words = function() {
		return this.vocab.length
	}

	Model.get_vector = function(opts) {
		word_or_formula = opts['word']
		periods = opts['periods']
		var words_involved = split_words_only(word_or_formula)

		// console.log('getting vector',word_or_formula,'in model',this.M)

		var word2vecs = {}
		words_involved.forEach(function(w) { 
			// console.log('getting vectors for: '+w+'...')
			// Model.log('getting vectors for: "'+w+'"...')
			try { 
				vecs = this.M.getVector(w).values
				// console.log(vecs)
				word2vecs[w]=vecs
				// console.log(w,vecs[0])
				// console.log('vecs',vecs)
			} catch(TypeError) { 
				console.log('err!',TypeError)
				
				// try an average?
				word_vecs_to_avg = []
				word_periods = []
				console.log('periods2!',this.periods, this.fn)
				Model.periods.forEach(function(period) {
					word_period=w+'_'+period
					wpvecs=this.M.getVector(word_period).values
					word_vecs_to_avg.push(wpvecs)
					word_periods.push(word_period)
				})

				// if(opts['combine_periods']=='average') {
					word_vec_avg = math.add(...word_vecs_to_avg)
					word2vecs[w]=word_vec_avg
				// } else {
				// 	word_periods.forEach(function(wperiod,wpi) { 
				// 		wpvecs=word_vecs_to_avg[wpi]
				// 		word2vecs[wperiod]=wpvecs
				// 	})
				// }

				//console.log('WPVECS!',word2vecs)
			}
		});

		// console.log('word2vecs',word2vecs)

		// calc formula?
		formula_str=word_or_formula
		Model.log('locating vector position for: '+formula_str)
		formula_str_q=formula_str.trim().split('[').join('').split(']').join('');
		new_vec = solve_vectors(formula_str_q,word2vecs)
		return new_vec
	}

	Model.get_vectors = function(opts) {
		var name2vecs = {}
		opts['words'].forEach(function(word_or_formula,i) {
			// Model.progress(i/opts['words'].length,opts)
			opts['word']=word_or_formula
			try {
				name2vecs[word_or_formula] = Model.get_vector(opts)
			} catch(err) {
				console.log('err getting vector for!',word_or_formula)
			}
		});
		return name2vecs
	}

	Model.get_most_similar = function(opts) {
		console.log('most_similar_opts:', opts)

		if(opts['combine_periods']=='simultaneous' | opts['combine_periods']=='diachronic') {
			opts['words']=periodize(opts['words'], opts['periods'])
		}

		Model.log('input split into: ' + opts['words'].join(', '))
		opts['name2vec'] = Model.get_vectors(opts)
		return Model.get_most_similar_by_vector(opts)
	}

	Model.get_most_similar_by_vector = function(opts) {
		console.log('OPTS!','get_most_similar_by_vector',opts)
		var name2vec=opts['name2vec']
		var n_top=opts['n_top']
		var periods = opts['periods']
		if(n_top==undefined) { n_top = DEFAULT_N_SIMILAR }


		all_sims = []
		n_names = 0
		for(var name in name2vec) { n_names++ }
		i_names=0


		for(var name in name2vec) {
			// Model.progress(i_names/n_names, opts)
			i_names++
			Model.log('getting '+ n_top +' nearest word vectors to: ' + name)
			vec=name2vec[name]
			//console.log('vec!',name,vec)
			sims = this.M.getNearestWords(vec, (n_top+1)*5)
			// sims = this.M.getNearestWords(vec, (n_top+1)*2)
			name_sims=[]
			unique_words=new Set()
			sims.forEach(function(sim_d) {
				new_sim_d={}
				new_sim_d['id']=id1=name
				new_sim_d['id2']=id2=sim_d['word']
				worddat1=deperiodize_str(id1)
				worddat2=deperiodize_str(id2)
				new_sim_d['word'] = wordname1 = worddat1[0]
				new_sim_d['word2'] =wordname2 = worddat2[0]
				new_sim_d['period'] = period1 = worddat1[1]
				new_sim_d['period2'] = period2 = worddat2[1]
				new_sim_d['csim']=sim_d['dist']
				if((period1!=undefined) & (opts['combine_periods']=='diachronic') & (period2!=period1)) {
					// skip because let's not compare across periods in that case
					// console.log('yep!!')
				} else {

					// console.log('new_sim_d!?',new_sim_d)
					if((!(id2 in name2vec)) &(!(wordname2 in name2vec)) &(unique_words.size<n_top)) {
						// if we either want all periods, or periods wanted includes this one
						if(periods==undefined | (periods.includes(period2))) {
							// start a new dictionary
							name_sims.push(new_sim_d)


							// console.log('new_sim_d',new_sim_d)
							if(!(unique_words.has(wordname2))) {
								unique_words.add(wordname2)
							}
						
						}
					}
				}
			})

			// final average
			if(opts['combine_periods']=='average') { name_sims=average_periods(name_sims,val_key='csim',word_key='word2',period_key='period2') }

			all_sims.push(...name_sims)
		}
		// console.log('all_sims',all_sims.length)
		return all_sims
	}

	Model.get_expanded_wordset = function(opts) {
		console.log('get_expanded_wordset()',opts)

		var expand_n=opts['expand_n']
		if(expand_n==undefined) { expand_n = DEFAULT_EXPAND_N }
    	name2vecs = Model.get_vectors(opts)
    	log('retrieved vector data for existing words')
      
      	vecs = dict_values(name2vecs)
		sumvec = math.add(...vecs)
      	words_already=opts['words']
      	log('computed vector sum of existing words')

      	opts['name2vec'] = {'sumvec':sumvec}
      	most_similar_data = Model.get_most_similar_by_vector(opts)
      	log('found '+most_similar_data.length+' nearest words to sum vector')

        var matches = []
        most_similar_data.forEach(function(d) {
           // wordx=d.word2
          // don't include period anymore: should be an option?
          wordx=d.word2.split('_')[0]
          if(!words_already.includes(wordx)) {
          	
            
            words_already.push(wordx)
            if(matches.length < expand_n) {
              matches.push(wordx)
            }
          }
        })
        return matches
	}

	// Model.progress(1.0,opts)
	return Model
}






// Get vocabulary from a vocab fn
function get_vocab(fn) {
	return new Promise(function(resolve,reject) {
		
		fs.readFile(fn, "UTF8", function(err, data) {
			var all_vocab =[]
			vtxt=data
			var all_vocab=[]
			// console.log(fn)
			lines=vtxt.split('\n')
			lines.forEach(function(line) {
				// console.log(line)
				word=line.split(' ')[0]
				//console.log(word)
				all_vocab.push(word)
			});
			// console.log('all_vocab',all_vocab)
			resolve(all_vocab)
		})
		
	});
}


// get model (as a promise)
async function get_model(w2v_fn = DEFAULT_W2V_FN) { 
	// console.log('>> loading w2v_fn:',w2v_fn)
	var voc_fn=w2v_fn.replace('.txt','.vocab.txt')
	var model_promise
	var vocab_promise
	if(w2v_fn in fn2M) {
		console.log('>> RESTORING FROM CACHE:',w2v_fn)
		vocab_promise = new Promise(function(res,rej) { res(fn2voc[w2v_fn]) })
		model_promise = new Promise(function(res,rej) { res(fn2M[w2v_fn]) })
	} else {
		model_promise = new Promise(function(res,rej) { 
			w2v.loadModel(w2v_fn,function(err,model) {
				fn2M[w2v_fn]=model
				//console.log('loaded',w2v_fn,model)
				res(model)
			})
		})
		vocab_promise = new Promise(function(res,rej) { 
			get_vocab(voc_fn).then(function(all_vocab) {
				fn2voc[w2v_fn]=all_vocab
				res(all_vocab)
			})
		})
	}
	M = await model_promise
	Voc = await vocab_promise
	//console.log("mvoc2",M,Voc)
	return [M,Voc]
}


// function opts2model_fn(opts) {
// 	console.log(opts,'??????')
// 	console.log('model_id: ',opts['model_id'])
// 	res=W2V_MODELS[opts['model_id']]
// 	console.log('model res:',res)
// 	return res
// }








function split_words_only(_words) {
	_words_l=_words.split(/[^A-Z_\[\]a-z0-9]+/);
	_words_l2=[]
	_words_l.forEach(function(w) { if(w) { _words_l2.push(w) } })
	return _words_l2
}

function split_words(_words) {
	console.log('split_words',_words)
	_words=_words.replace('\r\n',',').replace('\r',',').replace('\n',',')
	try {
		_words_l0 = _words.split(',')
	} catch(TypeError) {
		return [];
	}
	_words_l = []
	for(wii=0; wii<_words_l0.length; wii++) {
		_words_l.push(_words_l0[wii].trim());
	}
	return _words_l;
}

function split_words_keep_punct(_words) {
	return _words.match(/\\[^]|\.{3}|\w+|[^\w\s]/g)
}

function isAlpha(str) {
  return /^[a-zA-Z]+$/.test(str);
}


function reformat_formula_str(_words) {
	var _words=_words.replace(' ','')
	return _words
}

function compute_arrays(x, y, operator) {
	if(operator=='+') { return math.add(x,y) }
	if(operator=='-') { return math.subtract(x,y) }
	if(operator=='*') { return math.multiply(x,y) }
	if(operator=='/') { return math.divide(x,y) }
}

function vector_add(x, y) { return math.add(x,y) }
function vector_subtract(x, y) { return math.subtract(x,y) }
function vector_divide(x, y) { return math.divide(x,y) }
function vector_multiply(x, y) { return math.multiply(x,y) }


function solve_vectors(formula, var2val={}) {
	formula=formula.replace('[','').replace(']','')
	const expr = require('expression-eval');
	var ast = expr.parse('('+formula+')');
	return compute_tree(ast,var2val=var2val);
}

function compute_tree(tree,var2val={}) {
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

function dict_values(vector_data) {
	var vecs = []
	for(var name in vector_data) { 
		vec = vector_data[name]
		if(vec!=undefined) { 
			vecs.push(vec)
		}
	}
	return vecs
}



// Umap
function get_umap_from_vector_data(name2vec) {
	console.log(name2vec)

	data = []
	names = []
	for(name in name2vec) {
		data.push(name2vec[name])
		names.push(name)
	}
	console.log('names',names)

	umapjs = require('umap-js')

	const umap = new umapjs.UMAP({nComponents: 2,nEpochs: 400,nNeighbors: 3,});
	const embedding = umap.fit(data)

	out_ld = []

	embedding.forEach(function(erow,i) {
		name=names[i]
		word_period=deperiodize_str(name)
		word=word_period[0]
		period=word_period[1]

		out_d={}
		out_d['name']=names[i]
		out_d['word']=word
		out_d['period']=period
		out_d['umap_V1']=erow[0]
		out_d['umap_V2']=erow[1]
		out_ld.push(out_d)

		console.log(out_d)
	})


	return out_ld
}



// M = new Model(DEFAULT_W2V_FN)
// M = gen_model(DEFAULT_W2V_FN)
// console.log('Mfn',M.fn)

// gen_model(DEFAULT_W2V_FN).then(function(M) {
// 	console.log('M??',M)
// 	console.log('Mfn2',M.fn)
// 	console.log("Mvoclength",M.num_words())
	// console.log('Mvec11',M.get_vectors(['word_1950', 'word_1950 + word_1900', 'value_1800']))
	// console.log('Mvec22',M.get_most_similar('value_1800,value_1800-value_1950'))
	// console.log('MM',M.M)
// })

// console.log('MVOC',M.vocab)


function periodize(words,periods) {
	word_periods = []
	console.log('periodize',words,periods)
	words.forEach(function(w) {
		if(!w.includes('_')) {
			word_pieces = split_words_keep_punct(w)
			periods.forEach(function(p) {
				var word_period
				if(word_pieces.length==1) {
					word_period=w+'_'+p
				} else {
					word_period_l = []
					word_pieces.forEach(function(wpiece) {
						if(isAlpha(wpiece)) {
							word_period_l.push(wpiece+'_'+p)
						} else {
							word_period_l.push(wpiece)
						}
					})
					word_period=word_period_l.join('')
				}


				word_periods.push(word_period)
			})
		}
	})

	console.log('PERIODIZED:',words,'-->',word_periods)
	return word_periods
}

function get_period_from(wordstr) {
	if(wordstr.includes('_')) {
		return wordsstr.split('_').slice(-1)[0]
	}
	return ''
}

function deperiodize_str(wordstr) {
	new_word_pieces=[]
	word_pieces = split_words_keep_punct(wordstr)
	periods=[]
	word_pieces.forEach(function(wpiece) {
		if(!wpiece.includes('_')) {
			new_word_pieces.push(wpiece)
		} else {
			word=wpiece.split('_')[0]
			period=wpiece.split('_')[1]
			periods.push(period)
			new_word_pieces.push(word)
		}
	})
	return [new_word_pieces.join(''), periods[0]]
}



function average_periods(word_ld,val_key='csim',word_key='word',period_key='period',periods=undefined) {
	//create word2ld
	word2vals = {}
	word2eg = {}
	word_ld.forEach(function(word_d) {
		word=word_d[word_key]

		var ok = true
		if(periods!=undefined) {
			period=word_d[period_key]
			if(!periods.includes(period)) {
				ok=false
			}
		}

		if(ok) {
			if(!(word in word2vals)) { word2vals[word]=[]; word2eg[word]=word_d }
			word2vals[word].push(parseFloat(word_d[val_key]))
		}
	})

	word_old=[]
	for(word in word2vals) {
		word_vals = word2vals[word]
		word_vals_avg = math.mean(word_vals)
		word_od = {}
		for(k in word2eg[word]) { word_od[k]=word2eg[word][k] }
		word_od[val_key]=word_vals_avg
		word_old.push(word_od)
	}

	return word_old
}





exports.with_model = with_model
exports.W2V_MODELS = W2V_MODELS
exports.periodize = periodize
exports.deperiodize_str = deperiodize_str
exports.get_umap_from_vector_data=get_umap_from_vector_data






