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

function searching(input) {
	// init SEARCH report
	createReport("SEARCH", decodeURIComponent(location.search) +' -> page 0');

	// activate spinner
	$("#loader").removeClass( "esconder" );
	// set input text, just in case
	$("#search_input").val(input);
	// include divs for the results
	var content = 
		'<div class="jumbotron"> \
		  <div class="container"> \
			<h2>'+getLiteral(dict.searching)+' "<i>'+input+'"</i></h2> \
		  </div> \
		</div> \
		<div class="container"> \
			<div id="search-classes" class="panel-group"> \
			</div> \
			<p><br></p> \
			<div id="search-indivs" class="panel-group"> \
			</div> \
		</div>';	
	$("#contenedor").html(content);
	
	// create search object
	if (Repo.searches[input] == undefined)
		Repo.searches[input] = {};
	
	// search classes and indivs
	searchClasses(input);
	searchIndivs(input);
}

function searchClasses(input) {
	// warning searching...
	//var tw = '<div class="alert alert-warning" role="alert">'+dict.searchclasses+'</div>';
	var tw = 
		'<div class="alert alert-warning" role="alert">' + getLiteral(dict.searchclasses) +
			'<div class="progress"> \
				<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style="width: 45%"> \
					<span class="sr-only">45% Complete</span> \
				</div> \
			</div> \
		</div>';	
	$("#search-classes").html(tw);
	// do search if not done before
	if (Repo.searches[input].classes != undefined) {
		// quito spinner
		$("#loader").addClass( "esconder" );
		//showSearchResults(results, true);
		showSearchClassResults(Repo.searches[input].classes);
	}
	else {
		// array de resultados
		var results = [];
		// hay una petición al triplestore y otra interna a las upperclasses
		var nrequests = 2;
		// mando consulta al triplestore de clases con input...
		DataProv.getData('findclasses', {'input': input}, function(datos) {
			// array resultados intermedios
			var intresults = [];	
			_.each(datos.results.bindings, function(row) {
				var resuri = row.uri.value;
				// sólo si no es un blank node
				if (row.uri.type === "uri") {
					intresults.push(resuri);
					// guardo nueva clase si no existía
					if (Repo.classes[resuri] == undefined)
						Repo.classes[resuri] = { "uri" : resuri, "prefix": _.findKey(queryPrefixes, function(pu) { return resuri.startsWith(pu); }) };
				}
			});
			// obtengo labels
			getLabelsComments(intresults, Repo.classes, function() {
				// aquí tengo resultados intermedios con labels			
				// filtro los resultados con el label adecuado (ya que pudo haber emparejamiento por otro label en la consulta sparql)
				intresults = _.filter(intresults, function(eluri) { 
					return getLiteral(Repo.classes[eluri].label, uriToLiteral(eluri)).toLowerCase().includes(input.toLowerCase()); 
				});			
				// hago la unión de los resultados
				results = _.union(results, intresults);
				// decremento peticiones
				nrequests--;
				// ¿siguiente paso?
				if (nrequests <= 0) {
					// store results
					Repo.searches[input].classes = results;
					// quito spinner
					$("#loader").addClass( "esconder" );
					//showSearchResults(results, true);
					showSearchClassResults(Repo.searches[input].classes);
				}
			});
		});	
		// si no había isolated classes hago la consulta, pero no las tendré en cuenta
		if (Repo.classes.isolated == undefined)
			getIsolatedClasses();
		// en paralelo pregunto a las upper classes (incluyendo isolated)...
		getUpperClasses(function() {
			// aquí me aseguro de que haya upper classes (y quizá isolated)
			var intresults = Repo.upperclasses;
			if (Repo.isolated != undefined)
				intresults = _.union( Repo.upperclasses, Repo.isolated );
			// tiene que haber labels...
			getLabelsComments(intresults, Repo.classes, function() {
				// aquí tengo labels para intresults			
				// filtro los resultados con el label adecuado
				intresults = _.filter(intresults, function(eluri) { 
					return getLiteral(Repo.classes[eluri].label, uriToLiteral(eluri)).toLowerCase().includes(input.toLowerCase()); 
				});			
				// hago la unión de los resultados
				results = _.union(results, intresults);
				// decremento peticiones
				nrequests--;
				// ¿siguiente paso?
				if (nrequests <= 0) {
					// store results
					Repo.searches[input].classes = results;
					// quito spinner
					$("#loader").addClass( "esconder" );
					//showSearchResults(results, true);
					showSearchClassResults(Repo.searches[input].classes);
				}
			});
		});
	}
}

function showSearchClassResults(results) {
	// filter results according to the filtered out namespaces
	results = _.filter(results, isUriEnabled);
	// set up data to show
	var sinfo = {};
	if (results.length == 0)
		sinfo.label = getLiteral(dict.classesnotfound);
	else if (results.length == 1)
		sinfo.label = getLiteral(dict.oneclassfound);
	else
		sinfo.label = results.length + " " + getLiteral(dict.classesfound);
	sinfo.results = [];
	_.each(results, function(ruri) {
		var elinfo = {};
		elinfo.a = generateUrl("class", ruri); //"index.html?class="+encodeURIComponent(ruri);
		elinfo.prefix = Repo.classes[ruri].prefix; //_.findKey(queryPrefixes, function(pu) { return tcuri.startsWith(pu); });		
		elinfo.label = firstUppercase(getLiteral(Repo.classes[ruri].label, uriToLiteral(ruri)));
		sinfo.results.push(elinfo);
	});
	sinfo.results = _.sortBy(sinfo.results, 'label');
	
	// plantilla
	var template =		
		'<div class="panel panel-info"> \
			<div class="panel-heading"> \
				{{^results.length}} \
					<h4 class="panel-title">{{label}}</h4> \
				{{/results.length}} \
				{{#results.length}} \
					<a data-toggle="collapse" href="#collapse_results_classes"> \
						<span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span> \
						<h4 class="panel-title">{{label}}</h4> \
					</a> \
				{{/results.length}} \
			</div> \
			<div id="collapse_results_classes" class="panel-collapse collapse in"> \
				<ul class="list-group"> \
					{{#results}} \
						<a href="{{{a}}}" class="list-group-item" >{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{label}}</a> \
					{{/results}} \
				</ul> \
			</div> \
		</div>';
	
	// generate the mark-up
	var content = Mustache.render(template, sinfo);
	
	// set the content
	$("#search-classes").html(content);
	
	// ajuste de los chevrons
	$("a[href='#collapse_results_classes']").click(function() {
		var $spanel = $(this).find("span");
		if ($spanel.hasClass("glyphicon-chevron-right")) {
			$spanel.removeClass("glyphicon-chevron-right")
			$spanel.addClass("glyphicon-chevron-down")
		}
		else if ($spanel.hasClass("glyphicon-chevron-down")) {
			$spanel.removeClass("glyphicon-chevron-down")
			$spanel.addClass("glyphicon-chevron-right")
		}
	});
	
	// report analytics only if search indivs has also finished
	var $alert = $("#search-indivs").find(".alert");
	if ($alert.length == 0) {
		endReport();
		sendEvent("results");
		sendElapsedTiming();
		sendNqueriesTiming();	
	}
	
	// SAVE REPOSITORIES
	//sessionStorage.setItem("repos", JSON.stringify(Repos));
	saveRepos();
}

function searchIndivs(input) {
	// warning searching...
	var tw = 
		'<div class="alert alert-warning" role="alert">' + getLiteral(dict.searchindivs) +
			'<div class="progress"> \
				<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style="width: 45%"> \
					<span class="sr-only">45% Complete</span> \
				</div> \
			</div> \
		</div>';
	
	$("#search-indivs").html(tw);
	// initialize search	
	if (Repo.searches[input].indivs == undefined) {
		Repo.searches[input].indivs = {};
		Repo.searches[input].indivs.pages = [];
	}
	// search first page of indivs
	var resultsready = false;
	// set page to 0 (global)
	Page = 0;
	getSearchPageIndivs(input, function() {		
		resultsready = true;
		// render first page of results
		renderSearchPageIndivs(input);
	});
	// count individuals in the search if not done already
	if (Repo.searches[input].indivs.count == undefined) {	
		// prepare query object
		var qobj = {};
		qobj.input = input;	
		DataProv.getData('countfindindivs', qobj, function(datos) {
			// success, initialization to 0
			Repo.searches[input].indivs.count = 0;
			// process results
			_.each(datos.results.bindings, function(row) {
				Repo.searches[input].indivs.count = row.count.value;
			});	
			// do something?
			if (resultsready) {
				// check if same class and then update indiv bar
				if (QueryDict.search != undefined && QueryDict.search === input)
					updateSearchIndivsBar(input);
					
				// SAVE REPOSITORIES
				//sessionStorage.setItem("repos", JSON.stringify(Repos));
				saveRepos();
			}
		});
	}
}

function getSearchPageIndivs(input, callback) {
	if (Repo.searches[input].indivs.pages[Page] == undefined) {
		// prepare query object
		var qobj = {};
		qobj.input = input;
		qobj.limit = config.pagesize;
		qobj.offset = Page * qobj.limit;		
		DataProv.getData('findindivs', qobj, function(datos) {
			// initialize page
			Repo.searches[input].indivs.pages[Page] = [];
			_.each(datos.results.bindings, function(row) {
				var newinduri = row.uri.value;
				// continue if it is not a blank node
				if (row.uri.type === "uri") {				
					Repo.searches[input].indivs.pages[Page].push(newinduri);
					// store individual if it did not exist
					if (Repo.indivs[newinduri] == undefined)
						Repo.indivs[newinduri] = { "uri" : newinduri};
				}
			});
			// get labels
			getLabelsComments(Repo.searches[input].indivs.pages[Page], Repo.indivs, function() {
				if (callback != undefined)
					callback();
			});
		});
	}
	else if (callback != undefined)
		callback();
}

function renderSearchPageIndivs(input) {
	var indivs = Repo.searches[input].indivs;
	// set up data to show
	var sinfo = {};
	if (indivs.pages[Page].length == 0)
		sinfo.label = getLiteral(dict.indivsnotfound);
	else
		sinfo.label = firstUppercase(getLiteral(dict.indivsfound));/*
	else if (indivs.pages[Page].length == 1)
		sinfo.label = dict.oneindivfound;
	else
		sinfo.label = indivs.pages[Page].length + " " + dict.indivsfound;*/
	
	// results
	sinfo.results = [];
	_.each(indivs.pages[Page], function(ruri) {
		var elinfo = {};
		elinfo.a = generateUrl("indiv", ruri);
		elinfo.label = firstUppercase(getLiteral(Repo.indivs[ruri].label, uriToLiteral(ruri)));
		sinfo.results.push(elinfo);
	});
	//sinfo.results = _.sortBy(sinfo.results, 'label');
	
	// plantilla
	var template =		
		'<div class="panel panel-success"> \
			<div class="panel-heading"> \
				{{^results.length}} \
					<h4 class="panel-title">{{label}}</h4> \
				{{/results.length}} \
				{{#results.length}} \
					<a data-toggle="collapse" href="#collapse_results_indivs"> \
						<span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span> \
						<h4 class="panel-title">{{label}}</h4> \
					</a> \
				{{/results.length}} \
			</div> \
			<div id="collapse_results_indivs" class="panel-collapse collapse in"> \
				<ul class="list-group"> \
					{{#results.length}} \
					<li class="list-group-item"><!-- INDIVS PAGINATION AND SEARCH --> \
						<div class="row"> \
							<div class="col-sm-2"> \
								<button id="ind_page_prev_button" type="button" class="btn btn-default disabled"> \
								  <span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span> \
								</button> \
								<button id="ind_page_next_button" type="button" class="btn btn-default"> \
								  <span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span> \
								</button> \
							</div> \
							<div class="col-sm-3"> \
								<span id="ind_pages_text" style="display:none"></span> \
							</div> \
							<div class="col-sm-3"> \
								<div class="input-group"> \
								  <input id="ind_page_input" class="form-control" type="text" placeholder="'+getLiteral(dict.page)+'..." style="display:none"> \
								  <span class="input-group-btn"> \
									<button id="ind_page_go_button" class="btn btn-default" type="button" style="display:none">'+getLiteral(dict.go)+'</button> \
								  </span> \
								</div><!-- /input-group --> \
							</div> \
						</div><!-- /row --> \
					</li><!-- /INDIVS PAGINATION AND SEARCH --> \
					{{/results.length}} \
					{{#results}} \
						<a href="{{{a}}}" class="list-group-item" >{{label}}</a> \
					{{/results}} \
				</ul> \
			</div> \
		</div>';
	
	// generate the mark-up
	var content = Mustache.render(template, sinfo);
	
	// set the content
	$("#search-indivs").html(content);
	
	// ajuste de los chevrons
	$("a[href='#collapse_results_indivs']").click(function() {
		var $spanel = $(this).find("span");
		if ($spanel.hasClass("glyphicon-chevron-right")) {
			$spanel.removeClass("glyphicon-chevron-right")
			$spanel.addClass("glyphicon-chevron-down")
		}
		else if ($spanel.hasClass("glyphicon-chevron-down")) {
			$spanel.removeClass("glyphicon-chevron-down")
			$spanel.addClass("glyphicon-chevron-right")
		}
	});
	
	// adjust search indivs bar
	updateSearchIndivsBar(input);
	
	// indiv bar controls
	$("#ind_page_prev_button").click(function() {
		if (!$(this).is('.disabled')) {
			// update page
			Page = Page - 1;
			// get indivs and update
			updateSearchPageIndivs(input);/*
			
			getSearchPageIndivs(input, function() {
				renderSearchPageIndivs(input);
			});*/
		}
	});
	$("#ind_page_next_button").click(function() {
		if (!$(this).is('.disabled')) {
			// update page
			Page = Page + 1;
			// get indivs and update
			updateSearchPageIndivs(input);/*
			getSearchPageIndivs(input, function() {
				renderSearchPageIndivs(input);
			});*/
		}
	});
	$("#ind_page_input").keypress(function (e) {
		// if enter...
	    if (e.which == 13)
	    	$("#ind_page_go_button").click();
	});
	$("#ind_page_go_button").click(function() {
		if (!$(this).is('.disabled')) {
			var lastpage = Math.ceil( indivs.count / config.pagesize) - 1;		
			var inpval = $("#ind_page_input").val();
			var gotopage = Math.floor(Number(inpval)) -1;
			//$("#ind_page_input").val("");
			if (String(gotopage + 1) === inpval && gotopage >= 0 && gotopage <= lastpage ) { // OK!
				// update page
				Page = gotopage;
				// get indivs and update
				updateSearchPageIndivs(input);/*
				getSearchPageIndivs(input, function() {
					renderSearchPageIndivs(input);
				});*/		
			}
		}
	});
	
	// report analytics only if search classes has also finished
	var $alert = $("#search-classes").find(".alert");
	if ($alert.length == 0) {
		endReport();
		sendEvent("results");
		sendElapsedTiming();
		sendNqueriesTiming();	
	}
	
	// SAVE REPOSITORIES
	//sessionStorage.setItem("repos", JSON.stringify(Repos));
	saveRepos();
}

function updateSearchPageIndivs(input) {
	// init SEARCH report
	createReport("SEARCH", decodeURIComponent(location.search) +' -> page '+ Page);
	
	// store position
	var pos = $(document).scrollTop();

	// disable controls
	disableSearchIndivsBar();
	
	// remove existing list of individuals
	var $li = $("#ind_page_prev_button").closest("li");
	$li.siblings().remove();
	// include progress bar
	$li.after('<li class="list-group-item"> \
		<div class="progress"> \
		  	<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style="width: 45%"> \
		    	<span class="sr-only">45% Complete</span> \
			</div> \
		</div> \
	</li>');
	
	// get the data and render
	getSearchPageIndivs(input, function() {
		renderSearchPageIndivs(input);
	});
}

function updateSearchIndivsBar(input) {
	var indivs = Repo.searches[input].indivs;
	var nextpage = Page + 1;
	// prev navigation
	if (Page > 0)
		$("#ind_page_prev_button").removeClass("disabled");
	else
		$("#ind_page_prev_button").addClass("disabled");
	// do we know the number of indivs?
	if (indivs.count != undefined) {
		// set individual count
		if (indivs.count == 1)
			$("#ind_page_prev_button").closest(".panel").find("h4").html(getLiteral(dict.oneindivfound));
		else if (indivs.count > 1)
			$("#ind_page_prev_button").closest(".panel").find("h4").html(indivs.count+" "+getLiteral(dict.indivsfound));
		// calculate last page
		var lastpage = Math.ceil( indivs.count / config.pagesize) - 1;	
		// next navigation			
		if (nextpage > lastpage)
			$("#ind_page_next_button").addClass("disabled");
		else
			$("#ind_page_next_button").removeClass("disabled");
		// number of pages text
		var infopages = getLiteral(dict.page)+" "+(1+Page)+" "+getLiteral(dict.of)+" "+(1+lastpage);
		$("#ind_pages_text").html(infopages);
		$("#ind_pages_text").removeAttr("style");
		// go to page and search
		if (lastpage > 0) {
			$("#ind_page_input").removeAttr("style");
			$("#ind_page_go_button").removeClass("disabled");
			$("#ind_page_go_button").removeAttr("style");
		}
		else {
			$("#ind_page_input").attr("style", "display:none");
			$("#ind_page_go_button").attr("style", "display:none");
		}		
	}
	else { // we don't know...
		// get number of indivs in the current page
		var nindspage = indivs.pages[Page].length;
		// next navigation
		if ( (indivs.pages[nextpage] != undefined && indivs.pages[nextpage].length==0) ||
			nindspage < config.pagesize)
			$("#ind_page_next_button").addClass("disabled");
		else
			$("#ind_page_next_button").removeClass("disabled");
		// number of pages text
		var infopages = getLiteral(dict.page)+" "+(1+Page);
		$("#ind_pages_text").html(infopages);
		$("#ind_pages_text").removeAttr("style");
		// go to page
		$("#ind_page_input").attr("style", "display:none");
		$("#ind_page_go_button").attr("style", "display:none");
	}
}

function disableSearchIndivsBar() {
	$("#ind_page_prev_button").addClass("disabled");
	$("#ind_page_next_button").addClass("disabled");
	$("#ind_page_go_button").addClass("disabled");
}