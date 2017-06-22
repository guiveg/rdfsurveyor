/*
   Copyright 2017, Guillermo Vega-Gorgojo
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

function SparqlServer(uri, httpMethod, gruri) {
    var method = (httpMethod) ? httpMethod : "GET";
    var graph = (gruri) ? gruri : undefined;
    
    this.querySparql = function(query, retfunc, failfunc) {
    	// datos para la consulta
    	var qdata = {};
    	// hay graph?
		if (graph != undefined)
			qdata["default-graph-uri"] = graph;
		// resto de datos 
    	qdata.query = query;
		qdata.format = 'json';
		qdata.Accept = 'application/sparql-results+json';
    
		var jqxhr = $.ajax({
			url: uri,
			dataType: "json",
			type: method,
			data: qdata
			});
	
		jqxhr.done(function(datos) {
			// need to store data!
			Grabar = true;
			// report new query
			newQueryReport();
			// callback
			retfunc(datos);
		});
	
		jqxhr.fail((failfunc) ? failfunc :
			function(obj, status, errorThrown) {
			   console.log("ERROR\n"+ status + "\n" + errorThrown); 
			});

		return jqxhr; 
    };    
};

function DataProvider(uri, httpMethod, gruri, defaultFailFunc) {
    var sparqlserver = new SparqlServer(uri, httpMethod, gruri);
    
    /**
       queryname: name of the query
       arg: a map string=>string containing the values to be used for retrieving data (for Mustache)
       callback: a function to be called with resulting data
       failfunc: optional override of default function to run if things fail. 

       returns a deferred object, but not of any particular kind. (i.e. we 
       do not require it to be an ajax call)  The object may already be resolved. 
    */
    this.getData = function(queryname, arg, callback, failfunc) {
    	// get query object
    	var qo = _.find(queries, function(el) { return el.name === queryname; });
		// substitute parameters with mustache
		var query = Mustache.render(qo.query, arg);
		// include prefix string
		query =  getPrefixString(qo.prefixes) + query;
		// log query
		console.log(query);
		// query!
		return sparqlserver.querySparql(query, callback, (failfunc) ? failfunc : defaultFailFunc); 	
    }; 
};

function getPrefixString(prefixes) {
	var s = "";
	_.each(prefixes, function(pref) {
		s += "PREFIX " + pref + ": <" +  queryPrefixes[pref] + ">\n";
	});
	return s; 
}