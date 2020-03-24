
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





exports.mostsim2netjson = mostsim2netjson