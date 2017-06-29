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

// RETRIEVE REPOSITORIES OBJECT (session storage)
loadRepos();
	
$(document).ready( function() {	
	// initialize store flag
	Grabar = false;
	
	// init main labels
	initMainLabels();
	
	// get query parameters from the page url
	QueryDict = {};
	var numpars = 0;
	if (location.search !== "")
		location.search.substr(1).split("&").forEach(function(item) {QueryDict[item.split("=")[0]] = item.split("=")[1]})
	// decodifico URIs http si es necesario de manera inocente
	for (var key in QueryDict) {
		numpars++; // cuento parámetros
		QueryDict[key] = decodeURIComponent(QueryDict[key]);
	}

	// load repository
	loadRepository();

	// repo handler
	$("#repo_button").click(function() {
		// redirect to repo page
		location = generateUrl("", "");
	});

	// search handler
	$("#search_button").click(processSearchInput);
	$("#search_input").keypress(function (e) {
		// if enter...
	    if (e.which == 13)
	    	processSearchInput();
	});
	
	// go to the config page if the repo is not ready
	if (Repo == undefined) {
		showNavEls(false, false);
		configRepo();
		return;	
	}
	
	// go to class...
	if ('class' in QueryDict) {
		showNavEls(true, true);
		// obtengo info y muestro llamando a renderClass
		getInfoClass(QueryDict.class, function() {	
			renderClass(QueryDict.class); 
		});
		return;
	}
	
	// go to indiv...
	if ('indiv' in QueryDict) {
		showNavEls(true, true);
		// obtengo info y muestro llamando a renderIndiv
		getInfoIndiv(QueryDict.indiv, function() {	
			renderIndiv(QueryDict.indiv); 
		});
		return;
	}
	
	// go to search...
	if ('search' in QueryDict) {
		showNavEls(true, true);
		searching(QueryDict.search);
		return;
	}
	
	// default case, repo page
	showNavEls(true, false);
	getInfoRepo(renderRepo);
});

function initMainLabels() {
	$("#repo_button").html(getLiteral(dict.repository));
	$("#search_button").html(getLiteral(dict.search));
	$("#search_input").attr("placeholder", getLiteral(dict.label)+"...");
}


function processSearchInput() {
	var input = $("#search_input").val();
	if (input !== "") {
		// redirect to search page
		location = generateUrl("search", input);
		//location = location.pathname + "?search=" + encodeURIComponent(input);
	}
}

function showNavEls(searchnav, reponav) {
	// search nav
	if (searchnav) {
		$("#search_button").closest("div").removeClass("esconder");		
		$("#myCollapse").removeClass("esconder");
	}
	else {
		$("#search_button").closest("div").addClass("esconder");		
		$("#myCollapse").addClass("esconder");
	}
	// repo nav
	if (reponav)
		$("#repo_button").removeClass("esconder");
	else
		$("#repo_button").addClass("esconder");
}

function loadRepository() {
	// declare Repo global variable
	Repo = undefined; 
	// retrieve configuration object if available
	if (sessionStorage.getItem("conf") != null) {
		var conf = JSON.parse(sessionStorage.getItem("conf"));
		// check if conf is consistent with QueryDict
		if (conf.endpoint === QueryDict.repo && 
			( (conf.graph == undefined && QueryDict.graph == undefined) 
				|| (conf.graph != undefined && QueryDict.graph != undefined && conf.graph === QueryDict.graph) ) ) {
			// OK! obtain repository		
			Repo = _.find(Repos, function(el) { return el.endpoint === conf.endpoint && 
			( (el.graph == undefined && conf.graph == undefined) 
				|| (el.graph != undefined && conf.graph != undefined && el.graph === conf.graph) ); });
			// need to create it?
			if (Repo == undefined) {
				Repo = {};
				Repo.endpoint = conf.endpoint;
				if (conf.graph != undefined)
					Repo.graph = conf.graph;
				Repo.namespaces = [];
				Repo.skipns = []; // at bootstrap no namespace is skipped
				Repo.classes = {};
				Repo.indivs = {};
				Repo.props = {};
				Repo.breadcrumbs = [];
				Repo.searches = {};	
				// include Repo in Repos
				Repos.push(Repo);			
			} 
			// config data provider
			configDataProvider(conf.endpoint, conf.graph, conf.auth);
		}
	}
}

function generateUrl(type, input) {
	// set up query parameters
	var npars = 0;
	var qpars = {};
	if ('repo' in QueryDict) {
		qpars.repo = QueryDict.repo;
		npars++;
	}
	if ('graph' in QueryDict) {
		qpars.graph = QueryDict.graph;
		npars++;
	}
	if (type != undefined && input != undefined) {
		if (type !== "") {
			qpars[type] = input;
			npars++;
		}
	}
	else {
		if (qpars.class == undefined && qpars.indiv == undefined && qpars.search == undefined && QueryDict.class != undefined) {
			qpars.class = QueryDict.class;
			npars++;
		}
		else if (qpars.class == undefined && qpars.indiv == undefined && qpars.search == undefined && QueryDict.indiv != undefined) {
			qpars.indiv = QueryDict.indiv;
			npars++;
		}
		else if (qpars.class == undefined && qpars.indiv == undefined && qpars.search == undefined && QueryDict.search != undefined) {
			qpars.search = QueryDict.search;
			npars++;
		}
	}
	
	// prepare url to return
	//var url = "index.html";
	var url = "";
	if (npars > 0) {
		url += "?";
		var ret = [];
		for (var par in qpars)
    		ret.push(par + '=' + encodeURIComponent(qpars[par]));
		url += ret.join('&');
	}	
	return url;
}

function getLiteral(litobj, def) {
	// obtain list of language tags of the literal
	var ltags = Object.keys(litobj);
	// obtain list of user's preferred languages
	var preflangs = window.navigator.languages || [window.navigator.language || window.navigator.userLanguage];
	// return string with the preferred language, if exists
	for (var ind = 0 ; ind < preflangs.length; ind++) {
		var ltag = preflangs[ind];
		if (litobj[ltag] != undefined) 
			return litobj[ltag];
		// no luck, but maybe there is a language variant that serves (check with substrings)
		var lang = ltag.substring(0, 2);
		var tag = _.find(ltags, function(el) { return el !== config.nolang && el.substring(0, 2) ===  lang;});
		if (tag != undefined)
			return litobj[tag];			
	}
	// no preferred language, try with English
	var entag = _.find(ltags, function(el) { return el !== config.nolang && el.substring(0, 2) ===  'en';}); 
	if (entag != undefined) 
		return litobj[entag];
	// en otro caso devuelvo la cadena sin etiqueta de idioma
	if (litobj[config.nolang] != undefined) 
		return litobj[config.nolang];	
	// por última opción devuelvo la cadena por defecto
	return def;
}

function uriToLiteral(uri) {
	// extraigo la última parte de la uri
	var lit = "";
	if (uri.split("#").length > 1)
		lit = uri.split("#")[uri.split("#").length -1];
	else {
		lit = uri.split("/")[uri.split("/").length -1];
		if (lit === "")
			lit = uri.split("/")[uri.split("/").length -2];
	}
	// sustituyo - y _ por espacio
	lit = lit.replace(/-/g, " "); 
	lit = lit.replace(/_/g, " ");
	return lit;
}

function firstUppercase(lit) {
	if (lit != undefined && lit.length > 0)
		return lit.charAt(0).toUpperCase() + lit.slice(1);
		//return lit.charAt(0).toUpperCase() + lit.slice(1).toLowerCase();
	else
		return lit;
}

function loadRepos() {
	Repos = [];
	if (sessionStorage.getItem("repos") != null) {
		// load repos
		console.log("LOADING REPOS");	
		//Repos = JSON.parse(sessionStorage.getItem("repos"));
		Repos = JSON.parse( LZString.decompress(sessionStorage.getItem("repos")) );
	}
}

function saveRepos() {
	/*if (Grabar) {		
		console.log("SAVING REPOS");
		sessionStorage.setItem("repos", JSON.stringify(Repos) );
		Grabar = false;
	}*/
	if (Grabar) {		
		console.log("SAVING REPOS");
		var cad = JSON.stringify(Repos);
		var compCad = LZString.compress(cad);
		var cr = cad.length == 0? "" : 100*(cad.length - compCad.length)/cad.length;
		sessionStorage.setItem("repos", compCad);
		console.log("Size of the repos: "+cad.length+"B - Compressed: "+compCad.length+"B - Compression rate: " +cr+"%");
		Grabar = false;
	}
}