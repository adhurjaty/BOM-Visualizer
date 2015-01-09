var y_depth = 180;

var margin = {top: 20, right: 20, bottom: 20, left: 120},
    width = 1200 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;
    
var i = 0,
    duration = 750,
    root;

var tree = d3.layout.tree()
    .size([height, width]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

// define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .call(zoomListener)
    .append('g')
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//Variable to hold autocomplete options
var keys;

d3.json("bom.json", function(error, flare) {

	root = flare;
	root.x0 = height / 2;
	root.y0 = 0;
  
  	root.children.forEach(collapse);
  	update(root);

	keys = tree_to_list();
  	autocomplete_start();

  	d3.select('#bp-ac').select('div').select('div')
  		.append('button').attr('onclick', 'clear_search(true)').text('Clear Search');

});

//Object.observe(root, function() { debugger; });

d3.select(self.frameElement).style("height", "800px");

function update(source) {

  // Compute the new tree layout.
  var nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * y_depth; });

  // Update the nodes…
  var node = svg.selectAll("g.node")
      .data(nodes, function(d) {
      		return d.id || (d.id = ++i);
      });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .on("click", click);

  nodeEnter.append("circle")
      .attr("r", 1e-6)
      .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

  nodeEnter.append("text")
      .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
      .text(function(d) {
      		return d.name;
      })
      .attr('onmouseover', function(d) {
      	var outString = d.name + '<br>' + escape(d.part_name);
		var imgString = '<br><img src=/images/' + d.name + '.bmp' + '/>';
		var qtyString = '<br>Quantity: ' + d.qty;

		return 'nhpup.popup("' + outString + qtyString + imgString + '")';

      })
      .style("fill-opacity", 1e-6);

  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdate.select("circle")
      .attr("r", 4.5)
      .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

  nodeUpdate.select("text")
      .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .remove();

  nodeExit.select("circle")
      .attr("r", 1e-6);

  nodeExit.select("text")
      .style("fill-opacity", 1e-6);

  // Update the links…
  var link = svg.selectAll("path.link")
      .data(links, function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = {x: source.x0, y: source.y0};
        return diagonal({source: o, target: o});
      })
      .attr('parent', function(d) {
      	return d.source;
      })
      .attr('child', function(d) {
      	return d.target;
      });

  // Transition links to their new position.
  link.transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {x: source.x, y: source.y};
        return diagonal({source: o, target: o});
      })
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Toggle children on click.
function click(d) {

	var min_x = 25;
	var min_display = 3;

	//if there is an active search, clear the search and expand the parents
	//of the selected node
	if(mAll_parents != null) {
		clear_search();
		for(path_node of part_search(d)[0].slice(0, -1)) {
			click(path_node);
		}
	}
  
  	if(d.name == 'v') {
		var par = d.parent;
		var removed_length = par.display_num - 1;

		//if we are not moving from top, only remove display_num-2
		//elements, not referencing up and down arrows
		if(par.start_index != 0)
			removed_length--;

		par.start_index += removed_length;
		var new_end_index = par.start_index + par.display_num - 2;

		//special case: if the new_end_index + 1 = last element index
		//in which case, do not show the down arrow, show the last element
		if(new_end_index == par.all_children.length - 1)
			new_end_index++;

		//create new children from lower elements. display_num-2 because
		//this makes room for up and down arrow
		par.children = par.all_children.slice(par.start_index, new_end_index);

		par.children.unshift(par.up_arrow);

		//if there are hidden children beneath visible children
		if(new_end_index < par.all_children.length-1)
			par.children.push(par.down_arrow);
  
  	} else if(d.name == '^') {
		var par = d.parent;
		var new_end_index = par.start_index;

		par.start_index -= par.display_num - 1;

		if(par.start_index <= 0)
			par.start_index = 0;
		else
			par.start_index++;		

		//create new children from lower elements
		par.children = par.all_children.slice(par.start_index, new_end_index);

		par.children.push(par.down_arrow);

		//if there are hidden children beneath visible children
		if(par.start_index > 0)
			par.children.unshift(par.up_arrow);

	//collapse node
  	} else if (d.children) {
  		//if there are hidden children
		if(d.all_children != null) {
			d._children = d.all_children;

			//cleanup
			delete d.all_children;
			delete d.up_arrow;
			delete d.down_arrow;
			delete d.start_index;

		 } else {
			d._children = d.children;
		 }
	
    	d.children = null;
	
	//if there are children to be expanded
  	} else {

		if(d._children) {
			
			d.children = d._children;
			d._children = null;
			var all_nodes = tree.nodes(root);

			var nodes = all_nodes[all_nodes.indexOf(d)].children;

			var x1 = nodes[0].x;
			var x2 = nodes[nodes.length-1].x;

			d.display_num = Math.floor((x2 - x1)/(min_x) + 1);
			if(d.display_num < min_display)
				d.display_num = min_display;

			d._children = d.children;
			d.children = null;

			if(d._children.length > d.display_num) {

				//create new field all_children that stores all children to be
				//referenced in sections as the up and down arrows are selected
				d.all_children = Object.create(d._children);

				//create new field start_index that tracks where in all_children
				//to reference to put into children
				d.start_index = 0;

				//display_num-1 to make room for down arrow
				d.children = d.all_children.slice(d.start_index, d.display_num-1);

				//initialize up and down arrow objects to be referenced as needed
				d.up_arrow = deepCopy(d.all_children[d.all_children.length-1]);
				d.up_arrow.name = '^';

				d.down_arrow = deepCopy(d.up_arrow);
				d.down_arrow.name = 'v';

				d.children.push(d.down_arrow);
			
			//if there are fewer children than display_num
			} else {
				d.children = d._children;
			}

		} 
		
		d._children = null;
  	}

  	update(d);
}

function deepCopy(obj) {
	var outObj = {};

	for(var field in obj) {
		try {
			outObj[field] = Object.create(obj.field);
		} catch(err) {
			outObj[field] = obj.field;
		}
	}

	return outObj;
}

//depth first search for all instances of the part number supplied
function part_search(part) {

	function search_help(node) {
		
		var last_path = path[path.length-1];
		last_path.push(node);

		//allows matching by name and node object
		if(node.name.toUpperCase() == part || node == part) {
			//start new search with the current path as the start
			path.push(last_path.slice(0, last_path.length-1));
			return;
		}

		var children;
		
		if(node.all_children)
			children = node.all_children;
		else if(node._children)
			children = node._children;
		else if(node.children)
			children = node.children;
		else {
			path[path.length-1].pop();
			return;
		}

		for(var i=0; i < children.length; i++) {
			search_help(children[i])
		}

		path[path.length-1].pop();

	}

	path = [[]];
	search_help(root);

	if(path != [[]])
		return path.slice(0, path.length-1); //last element will always be []
	else
		console.log("Part not found");
}

function expand(node) {
	if(node.children == null)
		click(node);
}

function collapse(d) {
	if (d.children) {
		d._children = d.children;
		d._children.forEach(collapse);
		d.children = null;
	}
}

function show_select_children(parent) {

	collapse(parent);

	parent.children = parent.search_children;
	update(parent);

}

//global variable indicating the parents in a search
var mAll_parents;

//function to be run when 'Search' button is pressed
function search_input(part_number) {
	part_number = part_number.toUpperCase();
	clear_search(false);
	
	var path = part_search(part_number);

	mAll_parents = new Set();
	path.forEach(function(p) {
		p.filter(function(el) { return el.name != part_number; })
			.forEach(function(el) { mAll_parents.add(el); });
	});

	for(p of path) {
		for(var i=1; i < p.length; i++) {

			if(p[i-1].search_children) {
				if(p[i-1].search_children.indexOf(p[i]) == -1)
					p[i-1].search_children.push(p[i]);
			} else
				p[i-1].search_children = [p[i]];
		}
	}

	for(par of mAll_parents) {
  		show_select_children(par);
  	}

}

//clears the search_children field from Set of parents
function clear_search(clear_field) {

	if(clear_field)
		d3.select('#input_text').node().value = '';

	//if mAll_parents has not been initialized, then a search is not active, do nothing
	if(mAll_parents == null)
		return;

	var parent_list = [];
	for(p of mAll_parents) {
		parent_list.push(p);
	}

	for(p of parent_list.sort(function(a,b) { return b.depth - a.depth; })) {
		delete p.search_children;
		p.children = null;
	}

	mAll_parents = null;

	update(parent_list[parent_list.length-1]);

}

function zip(arrays) {
	var longest = arrays.sort(function(a,b) { return b.length - a.length; })[0];
    return longest.map(function(_,i){
        return arrays.map(function(array){return array[i]})
        		.filter(function(d) { return d != null; });
    });
}

function zoom() {
	svg.attr("transform", "translate(" + d3.event.translate +
					")scale(" + d3.event.scale + ")");
}

function tree_to_list() {
	var tree_set = new Set();
	var tree_list = [];

	function helper(node) {
		var children = [];

		tree_set.add(node.name + '\n' + node.part_name)

		if(node.all_children != null)
			children = node.all_children;
		else if(node.children != null)
			children = node.children;
		else if(node._children != null)
			children = node._children;

		children.forEach(function(d) {
			helper(d);
		});
	}

	helper(root);
	for(p of tree_set)
		tree_list.push(p);

	return tree_list.sort();
}


//Setup and render the autocomplete
function autocomplete_start() {
    var mc = autocomplete(document.getElementById('test'))
            .keys(keys)
            .placeHolder("Search Parts/Assemblies")
            .width(960)
            .height(500)
            .onSelected(function(d) {
            	search_input(d.split('\n')[0]);
            })
            .render();
}