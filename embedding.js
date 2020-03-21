
W2V_MODEL_FNS = {
	'COHA': {
		'bythirtyyear':{
			"combined":"static/data/db/models/COHA_bythirtyyear_nonf_full/chained_combined/1810-2020.min=100.run=01.txt",
			"1810-1840": 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1810-1840.txt',
			"1840-1870": 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1840-1870.txt',
			"1870-1900": 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1870-1900.txt',
			"1900-1930": 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1900-1930.txt',
			"1930-1960": 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1930-1960.txt',
			"1960-1990": 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1960-1990.txt',
			"1990-2020": 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1990-2020.txt'
		},
		'byhalfcentury':{
			"combined":"static/data/db/models/COHA_byhalfcentury_nonf/chained_full_combined/1800-2000.min=100.run=01.txt",
			"1800-1849":"static/data/db/models/COHA_byhalfcentury_nonf/chained_full/1800-1849.txt",
			"1850-1899":"static/data/db/models/COHA_byhalfcentury_nonf/chained_full/1850-1899.txt",
			"1900-1949":"static/data/db/models/COHA_byhalfcentury_nonf/chained_full/1900-1949.txt",
			"1950-1999":"static/data/db/models/COHA_byhalfcentury_nonf/chained_full/1950-1999.txt",			
		}
	}
}

const fs = require('fs');

let field2words = JSON.parse(fs.readFileSync('static/data/db/fields/_id2words.json')).data
let vec_names = JSON.parse(fs.readFileSync('static/data/db/fields/_vecids.json')).data
// console.log('field2words',field2words)
// console.log('vec_names',vec_names)



// MODEL CODE 
var w2v=require('word2vec')
var fn2M = {};     // other models
const math = require('mathjs')

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



// // get model (as a promise)
// function get_all_models(w2v_fns = W2V_MODEL_FNS) { 
// 	console.log('>> loading w2v_fn:',w2v_fn)
// 	let promise = new Promise(function(resolve,reject) { 
// 		var m = undefined;
// 		if(w2v_fn in fn2M) {
// 			m = resolve(fn2M[w2v_fn]);
// 		} else {
// 			w2v.loadModel( w2v_fn, function( error, model ) {
// 		  		if(error!==null) { console.log("errror?",error,model); }
// 		  		console.log('>> finished loading model:',w2v_fn);
// 		  		//console.log( model );
// 		  		fn2M[w2v_fn]=model;
// 		  		m = resolve(model);
// 			});
// 		}
// 		return m;
// 	});
// 	return promise;
// }

function opts2model_fn(opts) {
	corpus=opts['corpus']
	period_type=opts['period_type']
	period=opts['period']

	return W2V_MODEL_FNS[corpus][period_type][period];
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
					console.log('>> M.mostSimilar()',w2v_fn,w,sims)

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
						//console.log('new_sim_d',new_sim_d)
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


		
			// console.log(word1,'--',csim,'-->',word2)
			links.push({'source':word1, 'target':word2, 'weight':csim})
		}
	});

	//console.log('nodes',nodes)
	//console.log('links',links)

	//return (nodes,links);
	return {'nodes':nodes, 'links':links}
}




// import { Series, DataFrame } from 'pandas-js'



function get_vectors(word_or_words_str,io_log=console.log,w2v_fn=DEFAULT_W2V_FN) {
	var word_or_words_str;
	const path = require('path'); 
	var DataFrame = require('dataframe-js').DataFrame;
	

	
	return new Promise(function(resolve,reject) {
		get_model(w2v_fn).then(function(M) { 
			console.log('MODEL:',M)
			
			word_or_words_str=reformat_formula_str(word_or_words_str)
			var word_list = split_words_only(word_or_words_str);
			// word_list.push(...field_words_to_calc)

			// field_words_to_calc = []

			
			

			io_log('loaded model: "'+path.basename(w2v_fn,'.txt')+'"')

			console.log('word_or_words_str',word_or_words_str)

			// new: account for multiple words

			io_log('found unique words: '+word_list.join(', '))
			
			// var all_vecs = [];
			var name2vecs = {};
			// var all_words = [];

			word_list.forEach(function(w) { 
				io_log('getting vectors for: '+w,'...')
				try { 
					vecs = M.getVector(w).values
					name2vecs[w]=vecs
					print(w,vecs[0])
					// console.log('vecs',vecs)
				} catch(TypeError) { 
					// con
				}
			});

			// add field summaries
			for(var field in field2words) {
				var base_array=undefined
				var num_arrays=0

				if (word_or_words_str.includes(field)) {
					fwords=field2words[field]

					fwvecs_to_add = []
					fwords.forEach(function(fw) {
						// console.log(fw)
						try { 
							fwvecs = M.getVector(fw).values
							// console.log(num_arrays,fw,'...',base_array,fwvecs.slice(0,5))
							
							// fwvecd={}
							// fwvecs.forEach(function(fwv,i) {
							// 	fwk='vec_'+i
							// 	fwvecd[fwk]=fwv
							// });

							fwvecs_to_add.push(fwvecs)
							// fwvecs_to_add.push(fwvecd)
							// num_arrays++
							// if(base_array==undefined) {
							// 	var base_array = fwvecs
							// } else {
							// 	base_array = vector_add(base_array,fwvecs)
							// 	console.log('base_array',base_array)
							// }
							// console.log('vecs',vecs)
						} catch(err) { 
							// console.log('!',fw,err,'...')
						}
					});

					// df = new DataFrame(fwvecs_to_add)

					// console.log(df,df.dim())

					// fwvecs_avg=[]
					// for(fwi=0; fwi<df.dim()[1]; fwi++) {
					// 	fwk='vec_'+fwi
					// 	avg=df.stat.mean(fwk)
					// 	fwvecs_avg.push(avg)
					// }
					// sumvec_avg=fwvecs_avg

					// console.log(df.stat.mean('vec_0'))


					// console.log('num fwvecs_to_add',fwvecs_to_add.length);

					sumvec = math.add(...fwvecs_to_add)
					// console.log('sumvec',sumvec.length,sumvec.slice(0,5))



					// div_vec = []
					// sumvec.forEach(function(dim) { div_vec.push(fwvecs_to_add.length) });
					// console.log('div_vec',div_vec.length,div_vec.slice(0,5))

					// sumvec_avg = math.divide(sumvec,fwvecs_to_add.length)
					// console.log('sumvec_avg',sumvec_avg.slice(0,5))
					// // console.log(div_vec)
					// // console.log(div_vec.length, base_array.length)

					// // final_array=vector_divide(base_array,div_vec)

					field_id = field.split('[').join('').split(']').join('') // .replace('[','').replace(']','')
					name2vecs[field_id] = sumvec

					// name2vecs[field_id]=final_array
					// name2vecs[field_id]=base_array
				}
			}

			// console.log('name2vecs',name2vecs)
			// console.log('all_vecs',all_vecs)
			

			// loop over formulas
			var new_vec_dir={}
			word_or_words_str.split(',').forEach(function(formula_str) {
				io_log('solving formula: '+formula_str)
				formula_str_q=formula_str.trim().split('[').join('').split(']').join('');
				new_vec = solve_vectors(formula_str_q,name2vecs)
				console.log('formvec',formula_str,new_vec.slice(0,5))
				was_new = (!word_list.includes(formula_str) & formula_str[0]!='[')
				if (was_new) { formula_str = 'V('+reformat_formula_str(formula_str)+')' }
				console.log(formula_str,was_new)
				new_vec_dir[formula_str] = new_vec
			});
			return resolve(new_vec_dir);
		});
	});
}








function split_words_only(_words) {
	// _words=reformat_formula_str(_words)
	// var regex = /\w+/g;
	_words_l=_words.split(/[^A-Z_\[\]a-z0-9]+/);
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

function split_words_keep_punct(_words) {
	return _words.match(/\\[^]|\.{3}|\w+|[^\w\s]/g)
}


// function reformat_formula_str(_words,model=undefined) {
// 	var _words=_words.replace(' ','')

// 	for(var field in field2words) {
// 		//console.log(field,_words)
// 		if (_words.includes(field)) {
// 			fwords = field2words[field]
// 			fwords_str='(' + fwords.join('+') + ')'
// 			_words=_words.replace(field,fwords_str)
// 		}
// 	}
// 	return _words
// }

function isAlpha(str) {
  return /^[a-zA-Z]+$/.test(str);
}


function reformat_formula_str(_words) {
	var _words=_words.replace(' ','')
	return _words;

	// for(var field in field2words) {
	// 	//console.log(field,_words)
	// 	if (_words.includes(field)) {
	// 		fwords = field2words[field]
	// 		fwords_str='(' + fwords.join('+') + ')'
	// 		_words=_words.replace(field,fwords_str)
	// 	}
	// }
	

	// // _words=_words.replace('-',' - ')
	// // _words=_words.replace('+',' + ')
	// // _words=_words.replace('*',' * ')
	// // _words=_words.replace('/',' / ')
	
	// var word2vecs={}
	// var _words_l = split_words_keep_punct(_words)
	// var _words_l2=[]
	// _words_l.forEach(function(w) {
	// 	if (!isAlpha(w)) {
	// 		_words_l2.push(w)
	// 	} else {
	// 		console.log('w',w)
	// 		try {
	// 			word2vecs[w]=model.getVector(w)
	// 			_words_l2.push(w)
	// 		} catch(err) {
	// 			console.log('err!',w,err)
	// 		}
	// 	}

	// })

	// console.log('_words_l',_words_l)
	// console.log('_words_l2',_words_l2)

	// return _words_l2.join('')
}





function compute_arrays(x, y, operator) {
	//console.log('compute_arrays',operator,x,y)
	// if (x==undefined & y!=undefined) { return y; }
	// if (y==undefined & x!=undefined) { return x; }

	// new_l = [];
	// for(i=0; i<x.length; i++) {
	// 	val = undefined
	// 	if (operator=="+") { val = x[i]+y[i]; }
	// 	if (operator=="-") { val = x[i]-y[i]; }
	// 	if (operator=="*") { val = x[i]*y[i]; }
	// 	if (operator=="/") { val = x[i]/y[i]; }
	// 	new_l.push(val)
	// }
	// return new_l
	console.log(operator,'!!!',x,y)

	if(operator=='+') { return math.add(x,y) }
	if(operator=='-') { return math.subtract(x,y) }
	if(operator=='*') { return math.multiply(x,y) }
	if(operator=='/') { return math.divide(x,y) }
}


// function vector_add(x, y) { return compute_arrays(x,y,'+') }
// function vector_subtract(x, y) { return compute_arrays(x,y,'-') }
// function vector_divide(x, y) { return compute_arrays(x,y,'/') } // '/') }
// function vector_multiply(x, y) { return compute_arrays(x,y,'*') } //'*') }

function vector_add(x, y) { return math.add(x,y) }
function vector_subtract(x, y) { return math.subtract(x,y) }
function vector_divide(x, y) { return math.divide(x,y) }
function vector_multiply(x, y) { return math.multiply(x,y) }


function solve_vectors(formula, var2val={}) {
	formula=formula.replace('[','').replace(']','')
	const expr = require('expression-eval');
	//console.log('getting ast')
	var ast = expr.parse('('+formula+')');
	//console.log('ast',ast.left);
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



// 





	var loadLocalFile = function (filePath, done) {
	    var fr = new FileReader();
	    fr.onload = function () { return done(this.result); }
	    fr.readAsText(filePath);
	}
	var loadFile = function (filePath, done) {
	    var xhr = new XMLHTTPRequest();
	    xhr.onload = function () { return done(this.responseText) }
	    xhr.open("GET", filePath, true);
	    xhr.send();
	}


	var AllWords=[];
	var AllVecs=[];

	function dotproduct(a,b) {
	    var n = 0, lim = Math.min(a.length,b.length);
	    for (var i = 0; i < lim; i++) n += a[i] * b[i];
	    return n;
	 }

	function norm2(a) {var sumsqr = 0; for (var i = 0; i < a.length; i++) sumsqr += a[i]*a[i]; return Math.sqrt(sumsqr);}

	function similarity(a, b) {return dotproduct(a,b)/norm2(a)/norm2(b);}

	function cosine_sim(x, y) {
	    xnorm = norm2(x);
	    if(!xnorm) return 0;
	    ynorm = norm2(y);
	    if(!ynorm) return 0;
	    return dotproduct(x, y) / (xnorm * ynorm);
	}




function parse_nums(numstr) {
numl=[];
numdat=numstr.split(', ');
for (ni=0; ni<numdat.length; ni++) {
	numl.push(parseFloat(numdat[ni]));
}
return numl
}









function get_custom_space(words = undefined,x_vec=undefined,x_vec_str=undefined,y_vec=undefined,y_vec_str=undefined) {

	var using_x_vec_str=false;
	var using_y_vec_str=false;
	if(x_vec_str!="undefined" & x_vec_str!=undefined & x_vec_str!="") {
		var using_x_vec_str=true;
		var x_col=x_vec_str;
	} else {
		var x_col=x_vec;
	}
	if(y_vec_str!="undefined" & y_vec_str!=undefined & y_vec_str!="") {
		var y_col=y_vec_str;
		var using_y_vec_str=true;
	} else {
		var y_col=y_vec;
	}

	word_str_need_vecs_for

	console.log('x_col',x_col);
	console.log('y_col',y_col);

	console.log('words',words)
	words_l=split_words(words.toLowerCase());
	console.log('words_l',words_l)
	dim_words_l=[x_col,y_col];

	words_l = words_l.filter(function(value, index, arr){ return value!="";});
	dim_words_l = dim_words_l.filter(function(value, index, arr){ return value!="";});

	console.log('words_l',words_l)
	console.log('dim_words_l',dim_words_l);


	all_vec_words=[]
	all_vec_words.push(...words_l)
	if(using_x_vec_str) { all_vec_words.push(...get_terms_from_formula(x_vec_str.toLowerCase())) }
	else { all_vec_words.push(x_vec) }
	if(using_y_vec_str) { all_vec_words.push(...get_terms_from_formula(y_vec_str.toLowerCase())) }
	else { all_vec_words.push(y_vec) }
	all_vec_words = all_vec_words.filter(function(value, index, arr){ return value!="" & value!="(" & value!=")";});
	console.log('<<all_vec_words>>',all_vec_words);


	// var AllVecs=[];
	var AllVecs={};
	var AllWords=[];
	promises = [];
	for(vi=0; vi<all_vec_words.length; vi++) {
		word=all_vec_words[vi];
		ifn='/static/data/db/matrices/COHA/'+word+'.tsv'
		promises.push(d3v5.tsv(ifn));
	}



Promise.all(promises).then(function(files) {
		var AllVecs={};
		var AllWords=[];
		var AllPeriods = [];

		$('#progressbar').html("")
		var bar = new ProgressBar.Circle(progressbar, {
			color: '#aaa',
			// This has to be the same size as the maximum width to
			// prevent clipping
			strokeWidth: 6,
			trailWidth: 1,
			// easing: 'easeInOut',
			duration: 0,
			text: {
				autoStyleContainer: false
			},
			from: { color: '#aaa', width: 1 },
			to: { color: '#333', width: 4 },
			// Set default step function for all animate calls
			step: function(state, circle) {
				circle.path.setAttribute('stroke', state.color);
				circle.path.setAttribute('stroke-width', state.width);

				var value = Math.round(circle.value() * 100);
				if (value === 0) {
					circle.setText('');
				} else {
					circle.setText(value+'%');
				}

			}
		});
		// bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
		bar.text.style.fontSize = '1rem';
		bar.animate(0.0);

		console.log('bar',bar);

		for(fi=0;fi<files.length;fi++) {
			fdata=files[fi];
			vec_word=all_vec_words[fi];

			for(fdi=0; fdi<fdata.length;fdi++) {
				// add word_period
				dat=fdata[fdi];
				Word=dat['word']+'_'+dat['period'];
				AllWords.push(Word);

				// add word_period vec
				vecstr=dat['vectors'];
				vecfl=parse_nums(vecstr);
				AllVecs[Word.replace(' ','')]=vecfl;

				// add period?
				if (!AllPeriods.includes(dat['period'])) {
					AllPeriods.push(dat['period']);
				}
			}

		bar.animate((fi+1)/files.length);
		}
		console.log('AllVecs',words_l);
		console.log('AllWords',AllPeriods);
		console.log('AllPeriods',AllPeriods);




		// get data to output
		sim_ld = [];
		// all_vals = [];
		x_vals=[];
		y_vals=[];

		words_l.forEach(function(row_word) {
			AllPeriods.forEach(function(period) {
				ok_word=true;
				oword_dx = {'word':row_word, 'period':period}



				dim_words_l.forEach(function(dim_word) {
					// console.log(period,row_word,dim_word,'.....');
					row_word_period = row_word+'_'+period;
					dim_word_period = dim_word+'_'+period;

					console.log('dim_word:',dim_word)
					console.log('using_x_vec_str:',using_x_vec_str)
					console.log('x_col:',x_col)
					console.log('using_y_vec_str:',using_y_vec_str)
					console.log('y_col:',y_col)

					if(using_y_vec_str & dim_word==y_col) {
						dim_word_period_vec = parse_formula(dim_word.toLowerCase(),AllVecs,suffix='_'+period)
						console.log('dim_vec Ycol formula result:',dim_word,dim_word_period_vec)
					} else if(using_x_vec_str & dim_word==x_col) {
						dim_word_period_vec = parse_formula(dim_word.toLowerCase(),AllVecs,suffix='_'+period)
						console.log('dim_vec Xcol formula result:',dim_word,dim_word_period_vec)
					} else {
						dim_word_period_vec = AllVecs[dim_word_period.replace(' ','')];

					}
					row_word_period_vec = AllVecs[row_word_period];






					console.log('VECS:',[row_word_period,dim_word_period],[row_word_period_vec,dim_word_period_vec]);

					if (row_word_period_vec!=undefined & dim_word_period_vec!=undefined) {
								var csim_val = similarity(row_word_period_vec,dim_word_period_vec)

								// invert if formula-fied
								if(dim_word.includes('+') | dim_word.includes('-') | dim_word.includes('*') | dim_word.includes('/')) {
								// if(tokenize(dim_word).length>1) {
								// console.log('INVERTING:',dim_word,csim_val)
									// var csim_val = -1 * csim_val
									csim_val=csim_val;
								}


						// all_vals.push(csim_val);
						if(dim_word==y_col) { y_vals.push(csim_val) }
						if(dim_word==x_col) { x_vals.push(csim_val) }

						oword_dx[dim_word]= csim_val

						// console.log('CSIM!',csim_val);
					} else {
						ok_word=false;
					}


				});

			if(ok_word){ sim_ld.push(oword_dx); }
			// sim_ld.push(oword_dx);
			// console.log('oword_dx',oword_dx)
			});
		});

			attached_data = sim_ld;

			console.log('attached_data000',attached_data)
			input_words=words_l.join(',')



			console.log('y_vals_length',y_vals.length,y_vals)
			console.log('x_vals_length',x_vals.length,x_vals)
			y_min=Math.min(...y_vals)
			y_max=Math.max(...y_vals)
			x_min=Math.min(...x_vals)
			x_max=Math.max(...x_vals)

			y_margin=(y_max-y_min)/10
			x_margin=(x_max-x_min)/10

			y_mid=y_min + (y_max - y_min)/2
			x_mid=x_min + (x_max - x_min)/2

			all_periods = use_all_periods()

			if(using_y_vec_str){ y_col_name='V('+tokenize(y_col).join(' ')+')'; } else { y_col_name=y_col; }
			if(using_x_vec_str){ x_col_name='V('+tokenize(x_col).join(' ')+')'; } else { x_col_name=x_col; }

			make_linegraph_spaces(
				input_words,
				y_col = y_col,
				x_col = x_col,
				div_id="custom_viz",
				x_min=x_min-x_margin, x_max=x_max+x_margin,
				y_min=y_min-y_margin,y_max=y_max+y_margin,
				y_mid=y_mid,x_mid=x_mid,
				sp_title="",
				y_col_name = y_col_name, //"<< Concrete | Abstract >>",
				x_col_name = x_col_name,
				all_periods=all_periods, orig_width=600, orig_height=600,
				attached_data = attached_data,ifn_dir=IFN_DIR,words=words_l); //,words=sim_ld_words);

	})

}






function custom_spaces(word=undefined, points="movement") {
	return get_custom_space();
}



















exports.get_model = get_model
exports.get_vectors = get_vectors
exports.get_most_similar = get_most_similar
exports.get_most_similar_by_vector = get_most_similar_by_vector
exports.mostsim2netjson = mostsim2netjson
exports.W2V_MODEL_FNS=W2V_MODEL_FNS
exports.opts2model_fn=opts2model_fn