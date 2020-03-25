const cutoff=DEFAULT_CSIM_CUTOFF

function ld2dld(ld,key) {
	var dld={}
	ld.forEach(function(d) {
		k=d[key]
		if(!(k in dld)) { dld[k]=[] }
		dld[k].push(d)
	})
	return dld
}


function sims2net(most_similar_data,opts={}) {
	nets=[]
	console.log('sims2net opts',opts)
	console.log('MSDMSD',most_similar_data)
	if(opts['combine_periods']=='diachronic') {
		most_similar_data_by_period = ld2dld(most_similar_data,'period')
		for(period in most_similar_data_by_period) {
			period_data = most_similar_data_by_period[period]
			console.log('period!!',period,period_data)
			net = mostsim2netjson(period_data,opts=opts)
			nets.push(net)
		}
	} else {
		net = mostsim2netjson(most_similar_data,opts=opts)
		nets.push(net)
	}

	console.log('NETSSS:',nets)

	return nets
}


function mostsim2netjson(most_similar_data,opts={}) {
	// format data
	var nodes = []
	var nodes_sofar = []
	var links = []

	most_similar_data.forEach(function(data,i) {
		// console.log(i,most_similar_data.length)
		// progress(i/most_similar_data.length, opts)
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





exports.mostsim2netjson = mostsim2netjson
exports.sims2net = sims2net