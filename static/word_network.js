function draw_net(data) {

	// $('#command_bar').html(cmdbar)
	$('#cmdbar_net').show();
	$('#net_canvas').remove()
	$('#canvas_div').html('<canvas id="net_canvas" min-width="600px" width="900px" height="750px" /></div></center>')
	// $('#n_top').bind("enterKey",function(e){ analyze_word(); });
	// $('#n_top').keyup(function(e){ if(e.keyCode == 13) { $(this).trigger("enterKey");}});
	draw_net_springy(data)
}





function draw_net_springy(data) {
	// make a new graph
		var graph = new Springy.Graph();

		// which nodes are sources
		sources=[]
		data.links.forEach(function(link_d) {
			if(!sources.includes(link_d.source)) { sources.push(link_d.source); }
		});
		console.log(sources)

		id2node={}
		data.nodes.forEach(function(node_d) { 
		  id=node_d['id']
		  node_d['label']=node_d['id'][0].toUpperCase() + node_d['id'].slice(1)
		  //font-family: "Source Code Pro", Consolas, monaco, monospace;
		  // node_d['font']='16px Baskerville, Georgia, Serif'
		  if (sources.includes(id)) { 
		  	node_d['font-weight']='bold'
		  	node_d['font-size']=16
		  	node_d['font-family']= '"Ubuntu Mono", monospace'
		   } else {
		   	node_d['font-weight']='normal' 
		   	node_d['font-size']=12
		   	node_d['font-family']= '"Ubuntu Mono", monospace'
		   }
		  
		  if(node_d['label'].slice(0,2)=='V(') {
		  	// node_d['color']='#001f3f'
		  	// node_d['font-style']='italic';
		  }
		  id2node[id]=graph.newNode(node_d);
		});

		data.links.forEach(function(link_d) {
		  node1=id2node[link_d['source']];
		  node2=id2node[link_d['target']];
		  // edge_d={'stroke-width':10,'color':'red','opacity':0.25, 'size':10}
		  graph.newEdge(node1, node2, {'weight':link_d['weight']*2});
		});	
		$('#net_canvas').html('')
		// $('#net_canvas').springy({ graph: graph,
		// 	nodeSelected: function(node){
  //    		 console.log('Node selected: ' + JSON.stringify(node.data));
  //   		}

		// });

		jQuery(function(){
		  var springy = window.springy = jQuery('#net_canvas').springy({
		    graph: graph,
		    nodeSelected: function(node){
		      console.log('Node selected: ' + JSON.stringify(node.data));
		    }
		  });
		});
}





function draw_net_d3(data) {

	$('#cy').html('<svg width="960" height="600" id="svg_net"></svg>')

	var svg = d3v4.select("#svg_net"),
	    width = +svg.attr("width"),
	    height = +svg.attr("height");

	var color = d3v4.scaleOrdinal(d3v4.schemeCategory20);

	var simulation = d3v4.forceSimulation()
	    .force("link", d3v4.forceLink().id(function(d) { return d.id; }))
	    .force("charge", d3v4.forceManyBody())
	    .force("center", d3v4.forceCenter(width / 2, height / 2));

	d3v4.entries(data, function(error, graph) {
		console.log('>>',error,graph)
	  if (error) throw error;

	  var link = svg.append("g")
	      .attr("class", "links")
	    .selectAll("line")
	    .data(graph.links)
	    .enter().append("line")
	      .attr("stroke-width", function(d) { return Math.sqrt(d.value); });

	  var node = svg.append("g")
	      .attr("class", "nodes")
	    .selectAll("g")
	    .data(graph.nodes)
	    .enter().append("g")
	    
	  var circles = node.append("circle")
	      .attr("r", 5)
	      .attr("fill", function(d) { return color(d.group); })
	      .call(d3v4.drag()
	          .on("start", dragstarted)
	          .on("drag", dragged)
	          .on("end", dragended));

	  var lables = node.append("text")
	      .text(function(d) {
	        return d.id;
	      })
	      .attr('x', 6)
	      .attr('y', 3);

	  node.append("title")
	      .text(function(d) { return d.id; });

	  simulation
	      .nodes(graph.nodes)
	      .on("tick", ticked);

	  simulation.force("link")
	      .links(graph.links);

	  function ticked() {
	    link
	        .attr("x1", function(d) { return d.source.x; })
	        .attr("y1", function(d) { return d.source.y; })
	        .attr("x2", function(d) { return d.target.x; })
	        .attr("y2", function(d) { return d.target.y; });

	    node
	        .attr("transform", function(d) {
	          return "translate(" + d.x + "," + d.y + ")";
	        })
	  }
	});

	function dragstarted(d) {
	  if (!d3v4.event.active) simulation.alphaTarget(0.3).restart();
	  d.fx = d.x;
	  d.fy = d.y;
	}

	function dragged(d) {
	  d.fx = d3v4.event.x;
	  d.fy = d3v4.event.y;
	}

	function dragended(d) {
	  if (!d3v4.event.active) simulation.alphaTarget(0);
	  d.fx = null;
	  d.fy = null;
	}
}



function draw_net_cola(data) { 

	var width = 960,
        height = 500;

    var color = d3v4.scaleOrdinal(d3v4.schemeCategory20);

    var cola = cola.d3adaptor(d3v4)
        .size([width, height]);

    var svg = d3v4.select("#cy").append("svg")
        .attr("width", width)
        .attr("height", height);

    d3v4.entries(data, function (error, graph) {
    	console.log(error)
    	console.log(graph)

        cola
            .nodes(graph.nodes)
            .links(graph.links)
            .jaccardLinkLengths(40,0.7)
            .start(30);

        var link = svg.selectAll(".link")
            .data(graph.links)
          .enter().append("line")
            .attr("class", "link")
            .style("stroke-width", function (d) { return Math.sqrt(d.value); });

        var node = svg.selectAll(".node")
            .data(graph.nodes)
          .enter().append("circle")
            .attr("class", "node")
            .attr("r", 5)
            .style("fill", function (d) { return color(d.group); })
            .call(cola.drag);

        node.append("title")
            .text(function (d) { return d.name; });

        cola.on("tick", function () {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });

            node.attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; });
        });
    });

}










function draw_net_cy(data) {
	// console.log('draw_net_cy',data);
	all_data = []
	all_data.push(...data.nodes)
	all_data.push(...data.links)
	console.log('all_data',all_data)

	var defaultOptions = {
	  // Called on `layoutready`
	  ready: function () {
	  },
	  // Called on `layoutstop`
	  stop: function () {
	  },
	  // 'draft', 'default' or 'proof" 
	  // - 'draft' fast cooling rate 
	  // - 'default' moderate cooling rate 
	  // - "proof" slow cooling rate
	  quality: 'default',
	  // Whether to include labels in node dimensions. Useful for avoiding label overlap
	  nodeDimensionsIncludeLabels: false,
	  // number of ticks per frame; higher is faster but more jerky
	  refresh: 30,
	  // Whether to fit the network view after when done
	  fit: true,
	  // Padding on fit
	  padding: 10,
	  // Whether to enable incremental mode
	  randomize: true,
	  // Node repulsion (non overlapping) multiplier
	  nodeRepulsion: 4500,
	  // Ideal (intra-graph) edge length
	  idealEdgeLength: 50,
	  // Divisor to compute edge forces
	  edgeElasticity: 0.45,
	  // Nesting factor (multiplier) to compute ideal edge length for inter-graph edges
	  nestingFactor: 0.1,
	  // Gravity force (constant)
	  gravity: 0.25,
	  // Maximum number of iterations to perform
	  numIter: 2500,
	  // Whether to tile disconnected nodes
	  tile: true,
	  // Type of layout animation. The option set is {'during', 'end', false}
	  animate: 'end',
	  // Duration for animate:end
	  animationDuration: 500,
	  // Amount of vertical space to put between degree zero nodes during tiling (can also be a function)
	  tilingPaddingVertical: 10,
	  // Amount of horizontal space to put between degree zero nodes during tiling (can also be a function)
	  tilingPaddingHorizontal: 10,
	  // Gravity range (constant) for compounds
	  gravityRangeCompound: 1.5,
	  // Gravity force (constant) for compounds
	  gravityCompound: 1.0,
	  // Gravity range (constant)
	  gravityRange: 3.8,
	  // Initial cooling factor for incremental layout
	  initialEnergyOnIncremental: 0.5
	};

	var cy = cytoscape({
	  container: document.getElementById('cy'),
	  elements: all_data
	});

	// defaultOptions['name']='cose-bilkent'
	// cy.layout(defaultOptions);

	cy.run();

}







function draw_dynamic_chart(dynamic_data) {

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    color = d3.scaleOrdinal(d3.schemeCategory20b);

var a = {id: "a"},
	b = {id: "b"},
	c = {id: "c"},
	d = {id: "d"},
	e = {id: "e"},
	f = {id: "f"},
	g = {id: "g"},
	h = {id: "h"},
	i = {id: "i"},
	j = {id: "j"},
	k = {id: "k"},
	l = {id: "l"},
	m = {id: "m"},
	n = {id: "n"},
	o = {id: "o"},
	p = {id: "p"},
  q = {id: "q"},
	r = {id: "r"},  
  s = {id: "s"},
	t = {id: "t"},
  u = {id: "u"},
  v = {id: "v"},
  w = {id: "w"},
  x = {id: "x"},
  y = {id: "y"},
  z = {id: "z"};
     
 jsonData = [
 {
   "time": 1,
   "node1": a,
   "node2": b
 },
 {
   "time": 2,
   "node1": a,
   "node2": e
 },
 {
   "time": 3,
   "node1": a,
   "node2": d
 },
 {
   "time": 4,
   "node1": b,
   "node2": c
 },
 {
   "time": 5,
   "node1": d,
   "node2": e
 },
 {
   "time": 6,
   "node1": f,
   "node2": g
 },
 {
   "time": 7,
   "node1": p,
   "node2": f
 },
 {
   "time": 8,
   "node1": e,
   "node2": d
 },
 {
   "time": 9,
   "node1": e,
   "node2": f
 },
 {
   "time": 10,
   "node1": f,
   "node2": i
 },
 {
   "time": 11,
   "node1": j,
   "node2": f
 },
 {
   "time": 12,
   "node1": l,
   "node2": g
 },
 {
   "time": 13,
   "node1": i,
   "node2": j
 }, 
 {
   "time": 14,
   "node1": g,
   "node2": h
 },
 {
   "time": 15,
   "node1": o,
   "node2": p
 },
 {
   "time": 16,
   "node1": m,
   "node2": l
 },
 {
   "time": 17,
   "node1": q,
   "node2": r
 },
 {
   "time": 21,
   "node1": q,
   "node2": s
 },
 {
   "time": 22,
   "node1": q,
   "node2": t
 },
 {
   "time": 23,
   "node1": j,
   "node2": k
 },
 {
   "time": 24,
   "node1": j,
   "node2": p
 },
 {
   "time": 25,
   "node1": o,
   "node2": n
 },
 {
   "time": 26,
   "node1": x,
   "node2": x
 },
 {
   "time": 29,
   "node1": p,
   "node2": q
 },
 {
   "time": 30,
   "node1": q,
   "node2": o
 },
 {
   "time": 33,
   "node1": t,
   "node2": u
 },
 {
   "time": 33,
   "node1": x,
   "node2": z
 }  
]
    nodes = [a],
    links = [];
    times = jsonData.map(e => e.time);  // store all the times
  maxtime = d3.max(times);  // get the maximum time to know when to stop
  
  
  
var simulation = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-300))
    .force("link", d3.forceLink(links).distance(80))
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .alphaTarget(1)
    .on("tick", ticked);

var g = svg.append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")"),
    link = g.append("g").attr("stroke", "#000").attr("stroke-width", 1.5).selectAll(".link"),
    node = g.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5).selectAll(".node");

restart();

var intervl = setInterval(tickfn,1000),
	counterr = 0;
	
function tickfn(){
	counterr ++;
	if(counterr == maxtime){
		clearInterval(intervl);
	}
	jsonData.forEach(function(jsdata){
		if(counterr == jsdata.time){
			if(!contains(nodes,jsdata.node1)){
				nodes.push(jsdata.node1);
			}
			if(!contains(nodes,jsdata.node2)){
				nodes.push(jsdata.node2);
			}
			links.push({source: jsdata.node1, target: jsdata.node2});
		}
	});
  	d3.select('text').html(counterr);
  	restart();
}

  
  function contains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
}

  
  
function restart() {

  // Apply the general update pattern to the nodes.
  node = node.data(nodes, function(d) { return d.id;});
  node.exit().remove();
  node = node.enter().append("circle")
    .style('opacity', 1)
    .attr("fill", function(d) { return color(d.id); })
    .attr("r", 8)
    .merge(node)
    ;

  // Apply the general update pattern to the links.
  link = link.data(links, function(d) { return d.source.id + "-" + d.target.id; });
  link.exit().remove();
  link = link.enter().append("line")
       .merge(link);

  // Update and restart the simulation.
  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();
}

  
  
function ticked() {
  node
    .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })

  link
    .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });
}




}