// config
DEFAULT_W2V_FN = 'static/data/db/models/COHA_bythirtyyear_nonf_full/chained/1810-1840.txt'
VECS = ['Animal (VG2) <> Human (VG2)', 'Black <> White', 'Concrete (CHPoetry-All) <> Abstract (CHPoetry-All)', 'Concrete (CHPoetry-Robust) <> Abstract (CHPoetry-Robust)', 'Concrete (Consolidated) <> Abstract (Consolidated)', 'Concrete (ConsolidatedBinary) <> Abstract (ConsolidatedBinary)', 'Concrete (HGI) <> Abstract (HGI)', 'Derogatory (VG2) <> Non-Derogatory (VG2)]', 'Female (HGI) <> Male (HGI)', 'Female (VG2) <> Male (VG2)', 'Hard Seed (RH&LL) <> Abstract Values (RH&LL)', 'Negative (Abs-Cluster) <> Positive (Abs-Cluster)', 'Negative (HGI) <> Positive (HGI)', 'Object (VG2) <> Animal (VG2)', 'Object (VG2) <> Animal+Human (VG2)', 'Object (VG2) <> Human (VG2)', 'Object (WN) <> Human (WN)', 'Objective (Abs-Cluster) <> Subjective (Abs-Cluster)', 'Passive (HGI) <> Active (HGI)', 'Poetic Diction (CHPoetry) <> Prosaic Diction (CHPoetry)', 'Pre-Norman (TU&JS) <> Post-Norman (TU&JS)', 'Racialized (VG2) <> Non-Racialized (VG2)', 'Science (Abs-Cluster)', 'Submit (HGI) <> Power (HGI)', 'Substance (Locke) <> Mode (Locke)', 'Tangible (MT) <> Intangible (MT)', 'The Natural (Abs-Cluster) <> The Social (Abs-Cluster)', 'Vice (HGI) <> Virtue (HGI)', 'Weak (HGI) <> Strong (HGI)', 'Woman <> Man']
FIELDS = ['Abstract(CHPoetry-All)', 'Abstract(CHPoetry-Robust)', 'Abstract(Consolidated)', 'Abstract(ConsolidatedBinary)', 'Abstract(HGI)', 'AbstractValues(RH&LL)', 'Active(HGI)', 'Animal(VG2)', 'Animal+Human(VG2)', 'Black', 'Concrete(CHPoetry-All)', 'Concrete(CHPoetry-Robust)', 'Concrete(Consolidated)', 'Concrete(ConsolidatedBinary)', 'Concrete(HGI)', 'Derogatory(VG2)', 'Female(HGI)', 'Female(VG2)', 'HardSeed(RH&LL)', 'Human(VG2)', 'Human(WN)', 'Intangible(MT)', 'Male(HGI)', 'Male(VG2)', 'Man', 'Mode(Locke)', 'Negative(Abs-Cluster)', 'Negative(HGI)', 'Non-Derogatory(VG2)]', 'Non-Racialized(VG2)', 'Object(VG2)', 'Object(WN)', 'Objective(Abs-Cluster)', 'Passive(HGI)', 'PoeticDiction(CHPoetry)', 'Positive(Abs-Cluster)', 'Positive(HGI)', 'Post-Norman(TU&JS)', 'Power(HGI)', 'Pre-Norman(TU&JS)', 'ProsaicDiction(CHPoetry)', 'Racialized(VG2)', 'Strong(HGI)', 'Subjective(Abs-Cluster)', 'Submit(HGI)', 'Substance(Locke)', 'Tangible(MT)', 'TheNatural(Abs-Cluster)', 'TheSocial(Abs-Cluster)', 'Vice(HGI)', 'Virtue(HGI)', 'Weak(HGI)', 'White', 'Woman']
DEFAULT_N_SIMILAR = 25

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


function mostSimilar(word,n_top=20,w2v_fn=DEFAULT_W2V_FN) {
	console.log('<< mostSimilar()',word)
	
	return new Promise(function(resolve,reject) {
		get_model(w2v_fn).then(function(M) { 
			console.log('>> got back model:',M)
			sims = M.mostSimilar(word, n_top);
			console.log('>> mostSimilar()',sims)
			return resolve(sims);
		});
	});
}





// drawing code
const D3Node = require('d3-node')

function draw_net(most_similar_data,container_id="net_container",chart_id="net_chart") { 
	console.log('<< draw_net(',most_similar_data,')')

	opts = { container: '<div id="'+container_id+'"><div id="'+chart_id+'"></div></div>' }
	const d3n = new D3Node(opts)
	console.log('d3n',d3n)
	const d3 = d3n.d3
	console.log('d3',d3)


	most_similar_data.forEach(function(data) { 
		word=data[0];
		csim=data[1];

	// 	d3.select(d3n.document.querySelector('#chart')).append('span') // insert span tag into #chart
	// // d3n.html()   // output: <html><body><div id="container"><div id="chart"><span></span></div></div></body></html>
	// d3n.chartHTML()   // output: <div id="chart"><span></span></div>		

	});

	d3.select(d3n.document.querySelector(chart_id)).append('span') // insert span tag into #chart
	d3html = d3n.html()   // output: <html><body><div id="container"><div id="chart"><span></span></div></div></body></html>
	

	// d3html = d3n.chartHTML()   // output: <html><body><div id="container"><div id="chart"><span></span></div></div></body></html>// console.log('d3html',d3html)
	return d3html
	// return d3n.chartHTML()   // output: <div id="chart"><span></span></div>


}


















// SOCKET ROUTING
io.on('connection', function(socket){
  console.log('a user connected...');

  
  // mostSimilar() -- find most similar
  socket.on('mostSimilar', function(msg) {
  	console.log('<< mostSimilar(',msg,')')

  	promised_data = mostSimilar(msg, n_most_similar=DEFAULT_N_SIMILAR)

  	promised_data.then(function(most_similar_data) {
  		console.log('result from mostSimilar = ',most_similar_data);
    	

  		// respond with network
  		network_svg_html = draw_net(most_similar_data);
  		console.log('>> network_svg_html =',network_svg_html)


    	io.emit('mostSimilar_resp',network_svg_html);	



  	}).catch(function(err) { console.log('err!!',err); });
    
  });




});




