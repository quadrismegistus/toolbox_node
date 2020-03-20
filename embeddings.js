var w2v=require('word2vec')


var fn2M = {};     // other models


function get_model(w2v_fn = DEFAULT_W2V_FN) { 
	console.log('>> loading w2v_fn:',w2v_fn)

	if(w2v_fn in fn2M) {
		return fn2M[w2v_fn];
	} else {
		w2v.loadModel( w2v_fn, function( error, model ) {
	  		console.log("errror?",error);
	  		console.log('>> finished loading model:',w2v_fn);
	  		console.log( model );
	  		fn2M[w2v_fn]=model;
	  		return model;
		});
	}
}


function mostSimilar(word,n_top=20,w2v_fn=DEFAULT_W2V_FN) {
	console.log('<< mostSimilar()',msg)
	
	M=get_model(w2v_fn);
	sims = M.mostSimilar(word, n_top);

	console.log('>> mostSimilar()',sims)
	return sims;
}



// start word2vec server
