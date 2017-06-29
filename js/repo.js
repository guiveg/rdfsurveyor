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

/****************
 CONFIGURING REPO
****************/

function configRepo() {	
	// config form
	var template =
		'<div class="container"> \
			<p><br></p> \
			<h2>'+getLiteral(dict.config)+'</h2> \
			<p><br></p> \
			<form class="form-horizontal"> \
				<div class="form-group"> \
				  <label for="sparql_uri" class="col-sm-2 control-label">'+getLiteral(dict.repoendpoint)+'</label> \
				  <div class="col-sm-10"> \
					<input class="form-control" id="sparql_uri" type="text" placeholder="'+getLiteral(dict.repoendpoint)+'..." required="true"> \
				  </div> \
				</div> \
				<div class="form-group"> \
				  <label for="graph_uri" class="col-sm-2 control-label">'+getLiteral(dict.repograph)+'</label> \
				  <div class="col-sm-10"> \
					<input class="form-control" id="graph_uri" type="text" placeholder="'+getLiteral(dict.repograph)+'... ('+getLiteral(dict.optional)+')"> \
				  </div> \
				</div> \
			</form> \
			<div class="row"> \
				<div class="col-sm-2"></div> \
				<div class="col-xs-5"><button id="survey_button" class="btn btn-primary">'+getLiteral(dict.survey)+'</button></div> \
				<div class="col-xs-2"><button id="examples_button" class="btn btn-default" \
					data-toggle="modal" data-target="#myModal">'+getLiteral(dict.importconfig)+'</button></div> \
			</div> \
			<p><br></p> \
			<div id="alerta" class="alert alert-danger esconder" role="alert"></div> \
			<!-- Modal --> \
			<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel"> \
			  <div class="modal-dialog" role="document"> \
				<div class="modal-content"> \
				  <div class="modal-header"> \
					<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button> \
					<h4 class="modal-title" id="myModalLabel">'+getLiteral(dict.chooserepo)+'</h4> \
				  </div> \
				  <div class="modal-body"> \
					<div class="list-group"> \
						{{#repos}} \
							<button type="button" class="repo list-group-item">{{name}}</button> \
						{{/repos}} \
					</div> \
				  </div> \
				</div> \
			  </div> \
			</div> <!-- Modal --> \
		</div>';
		
	// generate the mark-up
	var content = Mustache.render(template, config);
	
	// include the mark-up
	$("#contenedor").html(content);

	// handler for repo buttons
	$(".repo").click(function() {
		// close modal
		$("#myModal .close").click();
		// import config
		var reponame = $(this).html();
		var repoconf = _.find(config.repos, function(el) { return el.name === reponame; });
		$("#sparql_uri").val(repoconf.endpoint);
		var grval = repoconf.graph != undefined? repoconf.graph : "";
		$("#graph_uri").val(grval);
		// update survey button
		updateSurveyButton();
	});
	
	// begin survey!
	$("#survey_button").click(function() {
		testRepository();
	});
	
	// retrieve conf object
	var conf = null;
	if (sessionStorage.getItem("conf") != null)
		conf = JSON.parse(sessionStorage.getItem("conf"));
	
	// already a graph in the page url?
	if ('graph' in QueryDict) {
		// set graph in the form
		$("#graph_uri").val(QueryDict.graph);
	} // in other case, check the conf object
	else if (conf != null && conf.graph != undefined)
		$("#graph_uri").val(conf.graph);
	
	// already an endpoint in the page url?
	if ('repo' in QueryDict) {
		// set sparql uri in the form
		$("#sparql_uri").val(QueryDict.repo);
		// attempt to survey the repo!
		$("#survey_button").click();
	} // in other case, check the conf object
	else if (conf != null && conf.endpoint != undefined)
		$("#sparql_uri").val(conf.endpoint);
		
	// update survey button
	updateSurveyButton();
	
	// listener of changes
	$("#sparql_uri").on('input', function (e) {
		updateSurveyButton();
	});
	$("#graph_uri").on('input', function (e) {
		updateSurveyButton();
	});
	
	// report home event
	createReport("HOME", "/");
	sendEvent("landed");
}

function testRepository(auth) {
	// get values from the form
	var endpoint = $("#sparql_uri").val();
	var graph = $("#graph_uri").val();
	//console.log("endpoint: " + endpoint);
	//console.log("graph: " + graph);
			
	// special case for DBpedia: set always a named graph
	if (endpoint === "http://dbpedia.org/sparql" && graph === "")
		graph = "http://dbpedia.org";
	
	// config data provider if there is endpoint
	if (endpoint !== "") {
		configDataProvider(endpoint, graph, auth);
		// check if configuration is valid
		DataProv.getData('test', {}, function(datos) { // success
			// no data??
			if (datos.results.bindings.length == 0) {
				// show alert
				var mens = getLiteral(dict.nodata);
				if (graph !== "")
					mens += getLiteral(dict.wronggraph);
				$("#alerta").html(mens);
				$("#alerta").removeClass( "esconder" );
				// survey button danger
				updateSurveyButton(true);
			}
			else { // repository working :)
				// prepare config object and update query dictionary for the redirect
				var conf = {};
				conf.endpoint = endpoint;
				QueryDict.repo = endpoint;
				if (graph !== "") {
					conf.graph = graph;
					QueryDict.graph = graph;
				}
				else
					delete QueryDict.graph;
				if (auth != undefined)
					conf.auth = auth;
				// save config object
				sessionStorage.setItem("conf", JSON.stringify(conf));
				// redirect
				location = generateUrl();
				//console.log("TODO BIEN");
			}
		}, function(jqXHR, status, errorThrown) { // error!			
			// survey button danger
			updateSurveyButton(true);
			// authorization error?
			if (errorThrown === "Unauthorized") {
				// create modal auth form if it was not created before
				if ($("#myAuthModal").length == 0) {
					// modal form 
					var modalform = '<div class="modal fade" id="myAuthModal" tabindex="-1" role="dialog" aria-labelledby="myAuthModalLabel"> \
					  <div class="modal-dialog" role="document"> \
						<div class="modal-content"> \
						  <div class="modal-header"> \
							<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button> \
							<h4 class="modal-title" id="myAuthModalLabel">'+getLiteral(dict.authreq)+'</h4> \
						  </div> \
						  <div class="modal-body"> \
			<form class="form-horizontal"> \
				<div class="form-group"> \
				  <label for="user" class="col-sm-2 control-label">'+getLiteral(dict.user)+'</label> \
				  <div class="col-sm-10"> \
					<input class="form-control" id="user" type="text" placeholder="'+getLiteral(dict.user)+'..." required="true"> \
				  </div> \
				</div> \
				<div class="form-group"> \
				  <label for="password" class="col-sm-2 control-label">'+getLiteral(dict.password)+'</label> \
				  <div class="col-sm-10"> \
					<input class="form-control" id="password" type="password" placeholder="'+getLiteral(dict.password)+'..." required="true"> \
				  </div> \
				</div> \
			</form> \
			<div class="row"> \
				<div class="col-sm-2"></div> \
				<div class="col-xs-5"><button id="cancel_auth" class="btn btn-default">'+getLiteral(dict.cancel)+'</button></div> \
				<div class="col-xs-2"><button id="init_session" class="btn btn-default">'+getLiteral(dict.initsession)+'</button></div> \
			</div> \
						  </div> \
						</div> \
					  </div> \
					</div>';					
					// append content
					$("#contenedor").append( modalform );
					// close modal listener
					$("#cancel_auth").click(function() {
						// close modal
						$("#myAuthModal .close").click();
					});
					// authorization routine
					$("#init_session").click(function() {
						var user = $("#user").val();
						var pwd = $("#password").val();
						if (user !== "" ) {						
							// close modal
							$("#myAuthModal").modal('hide');	
							// try authorization
							$('#myAuthModal').on('hidden.bs.modal', function () {
								$('#myAuthModal').off('hidden.bs.modal');
  								testRepository( btoa(user + ':' + pwd) );
							});
						}
					});					
				}
				// show modal window
				$('#myAuthModal').modal('show');			
			}
			else {
				// show alert
				var mens = getLiteral(dict.reponotworking);
				if (errorThrown !== "")
					mens += "<br>"+getLiteral(dict.repoerror)+"<br><samp>" + errorThrown + "</samp>";
				$("#alerta").html(mens);
				$("#alerta").removeClass( "esconder" );
			}
		});
	}
}

function configDataProvider(endpoint, graph, auth) {
	if (graph != undefined && graph === "")
		graph = undefined;
	DataProv = new DataProvider(endpoint, "GET", graph,
		function(jqXHR, status, errorThrown) {
			console.log("ERROR!!!!\n"+status+"\n+"+errorThrown);
		}, auth);
}

function updateSurveyButton(error) {
	if (error) {
		$("#survey_button").removeClass( "btn-primary btn-default" );
		$("#survey_button").addClass( "btn-danger" );
	}
	else {
		// hide alert
		$("#alerta").addClass( "esconder" );
		// set correct button color
		$("#survey_button").removeClass( "btn-primary btn-default btn-danger" );
		if ( $("#sparql_uri").val() === "")
			$("#survey_button").addClass( "btn-default" );
		else
			$("#survey_button").addClass( "btn-primary" );
	}
}


/************
 LOADING REPO
************/

function getInfoRepo(callback) {
	// init REPO report
	createReport("REPO", decodeURIComponent(location.search));
	
	// activate spinner
	$("#loader").removeClass( "esconder" );
	var upperfinished = false;
	// request info about isolated classes (but not wait for them, because this query is slow)
	getIsolatedClasses(function() {
		getIndividualCount(Repo.isolated, true, function() {
			// get list of classes for counting individuals 
			var countclasses = [];
			_.each(Repo.isolated, function(cluri) {
				var classindivs = Repo.classes[cluri].indivs;					
				if (Repo.classes[cluri].indivs.count != undefined || Repo.classes[cluri].indivs.more1000 == false)
					countclasses.push(cluri);											
			});
			getIndividualCount(countclasses, false, function() {
				getLabelsComments(Repo.isolated, Repo.classes, function() {
					// remove flag isopending
					delete Repo.isopending;						
					// update page if necessary
					if (upperfinished && callback != undefined) {
						// replace alert
						var newcontent = 
							'<div class="alert alert-info" role="alert"> \
								<span>' + getLiteral(dict.isoclasses) + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> \
								<span><button type="button" class="btn btn-default updateiso">' + getLiteral(dict.iosupdate) + '</button></span> \
							</div>';
						$(".alert-message").html(newcontent);
						// handler of the update classes button
						$(".updateiso").click(processNamespaces(callback));
					}
					// SAVE REPOSITORIES (to reuse the obtained data later)
					saveRepos();
				});
			});
		});
	});
	// get information about the upper classes
	getUpperClasses(function() {
		getListClasses(Repo.upperclasses, "subclasses", function() {
			getIndividualCount(Repo.upperclasses, true, function() {
				// get list of classes for counting individuals 
				var countclasses = [];
				_.each(Repo.upperclasses, function(cluri) {
					var classindivs = Repo.classes[cluri].indivs;					
					if (Repo.classes[cluri].indivs.count != undefined || Repo.classes[cluri].indivs.more1000 == false)
						countclasses.push(cluri);											
				});
				getIndividualCount(countclasses, false, function() {
					getLabelsComments(Repo.upperclasses, Repo.classes, function() {
						processNamespaces(function() {
							upperfinished = true;
							// remove spinner
							$("#loader").addClass( "esconder" );
							if (callback != undefined)
								callback();
						});						
					});
				});
			});
		});
	});
}

function getUpperClasses(callback) {
	if (Repo.upperclasses == undefined) {
		// iso pending
		Repo.isopending = true;	
		// find upper clases
		DataProv.getData('upperclasses', {}, function(datos) {
			// initialize upper classes
			Repo.upperclasses = [];
			_.each(datos.results.bindings, function(row) {
				var newcluri = row.class.value;
				// evaluate only if it's not a blank node
				if (row.class.type === "uri") {
					Repo.upperclasses.push(newcluri);
					// save new class if it does not exist
					if (Repo.classes[newcluri] == undefined)
						Repo.classes[newcluri] = { "uri": newcluri, "prefix": _.findKey(queryPrefixes, function(pu) { return newcluri.startsWith(pu); }) };
				}
			});
			if (callback != undefined)
				callback();
		});
	}
	else if (callback != undefined)
		callback();
}

function getIsolatedClasses(callback) {
	if (Repo.isolated == undefined) {
		// check if isolated classes are preloaded
		var preloaded = _.find(preloadedIsolated, function(el) {
			if (el.graph != undefined)
				return el.endpoint === Repo.endpoint && el.graph === Repo.graph;
			else if (Repo.graph == undefined)
				return el.endpoint === Repo.endpoint;
			else // there is a preloaded named graph, but not in the Repo
				return undefined;
		});
		if (preloaded != undefined) {
			Repo.isolated = preloaded.isolated;
			_.each(Repo.isolated, function(suri) {
				// save new class if it does not exist
				if (Repo.classes[suri] == undefined) {
					Repo.classes[suri] = { "uri" : suri, 
						"prefix": _.findKey(queryPrefixes, function(pu) { return suri.startsWith(pu); }),
						"subclasses": [],
						"superclasses": [] };
				}
			});
			if (callback != undefined)
				callback(Repo.isolated);
		}
		// isolated classes were not preloaded, ask the triplestore
		else {
			DataProv.getData('isolatedclasses', {}, function(datos) {
				// initialize isolated classes
				Repo.isolated = [];
				_.each(datos.results.bindings, function(row) {
					var newcluri = row.class.value;
					// evaluate only if it's not a blank node
					if (row.class.type === "uri") {
						Repo.isolated.push(newcluri);
						// save new class if it does not exist
						if (Repo.classes[newcluri] == undefined) {
							Repo.classes[newcluri] = { "uri" : newcluri, 
								"prefix": _.findKey(queryPrefixes, function(pu) { return newcluri.startsWith(pu); }),
								"subclasses": [],
								"superclasses": [] };
						}
					}
				});
				if (callback != undefined)
					callback();
			});
		}
	}
	else if (callback != undefined)
		callback();
}


function renderRepo() {	
	// set up data object for rendering
	var rinfo = {};
	rinfo.label = getLiteral(dict.reposurvey);
	rinfo.endpoint = Repo.endpoint;
	if (Repo.graph != undefined)
		rinfo.graph = Repo.graph;
	rinfo.namespaces = Repo.namespaces;
	rinfo.upperclasses = [];
	// classes to evaluate
	var evclasses = [];
	// add upper classes
	evclasses = _.union(evclasses, Repo.upperclasses);
	// process isolated classes if available
	if (Repo.isopending == undefined) //if (Repo.isolated != undefined)
		evclasses = _.union(evclasses, Repo.isolated);
	else // the query for finding isolated classes is still ongoing
		rinfo.isopending = true;
	// get upper subclasses of filtered namespaces
	var skipns = _.filter(Repo.namespaces, function(el){ return !el.enabled; });
	_.each(skipns, function(ns) { 
		// only those without filtered superclasses (since they can be discovered by other ways)
		var moreclasses = _.filter(ns.uppersubclasses, function(cluri) {
			var superc = _.filter(Repo.classes[cluri].superclasses, isUriEnabled);
			return superc.length == 0;		
		});
		evclasses = _.union(evclasses, moreclasses);
	});
	// filter classes by namespace
	evclasses = _.filter(evclasses, isUriEnabled);
	// process each class	
	_.each(evclasses, function(tcuri) {
		var clase = Repo.classes[tcuri];	
		var clinfo = {};
		clinfo.uri = clase.uri;
		clinfo.a = generateUrl("class", tcuri); //"index.html?class="+encodeURIComponent(tcuri);
		clinfo.prefix = Repo.classes[tcuri].prefix; //_.findKey(queryPrefixes, function(pu) { return tcuri.startsWith(pu); });		
		clinfo.label = firstUppercase(getLiteral(clase.label, uriToLiteral(tcuri)));
		//clinfo.nclasses = Repo.classes[tcuri].subclasses.length;
		clinfo.nclasses = _.filter(Repo.classes[tcuri].subclasses, isUriEnabled).length;
		if (clinfo.nclasses == 0)
			clinfo.nosubclasses = true;
		if ( (Repo.classes[tcuri].indivs.more1000 != undefined && Repo.classes[tcuri].indivs.more1000 == true) ||
				Repo.classes[tcuri].indivs.count > 1000)
			clinfo.nindivs = "+1K";
		else
			clinfo.nindivs = Repo.classes[tcuri].indivs.count;
		rinfo.upperclasses.push(clinfo);
	});
	// sort classes
	rinfo.upperclasses = _.sortBy(rinfo.upperclasses, 'label').reverse();
	rinfo.upperclasses = _.sortBy(rinfo.upperclasses, function(el) { return el.nindivs === "+1K"? (+el.nclasses*10 + 1111) : (+el.nclasses*10 + +el.nindivs); });
	rinfo.upperclasses = rinfo.upperclasses.reverse();	

	// prepare template
	var template =
		'<div class="jumbotron"> \
		  <div class="container"> \
			<h1>{{label}}</h1> \
			<p>'+getLiteral(dict.repoendpoint)+': <a href="{{{endpoint}}}" >{{{endpoint}}}</a></p> \
			{{#graph}} \
				<p>'+getLiteral(dict.repograph)+': <a href="{{{graph}}}" >{{{graph}}}</a></p> \
			{{/graph}} \
		  </div> \
		</div> \
		<div class="container"> \
			<div class="panel-group"> \
				<div class="panel panel-default"> \
					<div class="panel-heading"> \
						<a data-toggle="collapse" href="#collapse_superclasses"> \
							<span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span> \
							<h4 class="panel-title">'+getLiteral(dict.filterns)+'</h4> \
						</a> \
					</div> \
					<div id="collapse_superclasses" class="panel-collapse collapse in"> \
						<ul class="list-group"> \
							{{#namespaces}} \
								{{#enabled}} \
									<button type="button" class="list-group-item namespace"> \
										<span class="col-sm-2">{{#prefix}}<b>{{prefix}}</b>:{{/prefix}}</span> \
										<i class="ns">{{{ns}}}</i> \
										<i class="glyphicon glyphicon-ok pull-right"></i> \
									</button> \
								{{/enabled}} \
								{{^enabled}} \
									<button type="button" class="list-group-item list-group-item-danger namespace"> \
										<span class="col-sm-2">{{#prefix}}<b>{{prefix}}</b>:{{/prefix}}</span> \
										<i class="ns">{{{ns}}}</i> \
										<i class="glyphicon glyphicon-remove pull-right"></i> \
									</button> \
								{{/enabled}} \
							{{/namespaces}} \
						</ul> \
					</div> \
				</div> \
			</div> \
			<p><br></p> \
			<div class="alert-message"> \
				{{#isopending}} \
					<div class="alert alert-warning" role="alert">' + getLiteral(dict.isoclassespending)+
						'<div class="progress"> \
							<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style="width: 45%"> \
								<span class="sr-only">45% Complete</span> \
							</div> \
						</div> \
					</div> \
				{{/isopending}} \
			</div> \
			<p><br></p> \
			<div class="panel-group"> \
				<div class="panel panel-info"> \
					<div class="panel-heading"> \
						{{^upperclasses.length}} \
							<h4 class="panel-title">'+getLiteral(dict.noupperclasses)+'</h4> \
						{{/upperclasses.length}} \
						{{#upperclasses.length}} \
							<a data-toggle="collapse" href="#collapse_upperclasses"> \
								<span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span> \
								<h4 class="panel-title">'+getLiteral(dict.upperclasses)+'</h4> \
							</a> \
						{{/upperclasses.length}} \
					</div> \
					<div id="collapse_upperclasses" class="panel-collapse collapse in"> \
						<ul class="list-group"> \
							{{#upperclasses}} \
<li class="list-group-item" indent="0"> \
	<div class="row"> \
		<div class="col-sm-11"> \
			<a href="{{{a}}}" class="list-group-item"><span class="badge">{{nindivs}} I</span><span class="badge">{{nclasses}} C</span>{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{label}}</a> \
		</div> \
		{{^nosubclasses}} \
			<div class="col-sm-1"> \
				<button type="button" class="btn btn-default pull-right expandclass"> \
					<span class="glyphicon glyphicon-chevron-right" aria-hidden="true" cluri="{{{uri}}}"></span> \
				</button> \
			</div> \
		{{/nosubclasses}} \
	</div><!-- /row --> \
</li> \
							{{/upperclasses}} \
						</ul> \
					</div> \
				</div> \
			</div> \
		</div>';
	
	// generate the mark-up
	var content = Mustache.render(template, rinfo);
	
	// pongo el contenido
	$("#contenedor").html(content);
		
	// ajuste de los chevrons
	$("a[data-toggle='collapse']").click(function() {
		var $spanel = $(this).find("span");
		if ($spanel.hasClass("glyphicon-chevron-right")) {
			$spanel.removeClass("glyphicon-chevron-right");
			$spanel.addClass("glyphicon-chevron-down");
		}
		else if ($spanel.hasClass("glyphicon-chevron-down")) {
			$spanel.removeClass("glyphicon-chevron-down");
			$spanel.addClass("glyphicon-chevron-right");
		}
	});
	
	// listen to class expansion clicks
	$(".expandclass").click(handlerExpandClass);
	
	// listen to namespace filters
	$(".namespace").click(function() {
		// activate spinner
		$("#loader").removeClass( "esconder" );
	
		// update namespace info
		var ns = $(this).find(".ns").html();
		var nsel = _.find(Repo.namespaces, function(el) { return el.ns === ns; });
		nsel.enabled = !nsel.enabled;
		
		// init ENABLE-NS / DISABLE-NS report
		var reptype = nsel.enabled? "ENABLE-NS" : "DISABLE-NS";
		createReport(reptype, decodeURIComponent(location.search)+" -> "+nsel.ns);	
		
		// disable namespace buttons and show alert
		$(".namespace").attr("disabled", "disabled");
		var newcontent = 
			'<div class="alert alert-warning" role="alert">' + getLiteral(dict.nswaiting)+
				'<div class="progress"> \
					<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style="width: 45%"> \
						<span class="sr-only">45% Complete</span> \
					</div> \
				</div> \
			</div> ';
		$(".alert-message").html(newcontent);
		
		// there will be changes to be saved!
		Grabar = true;
		
		// process namespaces and render again
		processNamespaces(function() {
			// remove spinner
			$("#loader").addClass( "esconder" );
			renderRepo();
		});
		/*
		var $icon = $(this).find(".glyphicon");
		if ($(this).hasClass("list-group-item-danger")) {
			// remove filter!
			$(this).removeClass("list-group-item-danger");
			$icon.removeClass("glyphicon-remove");
			$icon.addClass("glyphicon-ok");
		}
		else {
			// include filter!
			$(this).addClass("list-group-item-danger");
			$icon.removeClass("glyphicon-ok");
			$icon.addClass("glyphicon-remove");
		}*/
	});
	
	// report loaded event and timings
	if (Report != undefined && Report.end == undefined) {
		endReport();
		sendEvent("loaded");
		sendElapsedTiming();
		sendNqueriesTiming();
	}
	
	// SAVE REPOSITORIES
	saveRepos();
}

function handlerExpandClass() {
	var $spanel = $(this).find("span");
	var $liel = $(this).closest("li");
	if ($spanel.hasClass("glyphicon-chevron-right")) {
		// EXPANSION
		// button
		$(this).removeClass("btn-default");
		$(this).addClass("btn-primary");
		$spanel.removeClass("glyphicon-chevron-right");
		$spanel.addClass("glyphicon-chevron-down");
		// include progress bar
		$liel.after('<li class="list-group-item"> \
			<div class="progress"> \
				<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style="width: 45%"> \
					<span class="sr-only">45% Complete</span> \
				</div> \
			</div> \
		</li>');
		// get subclasses
		var cluri = $spanel.attr("cluri");
		var newindent = +$liel.attr("indent") + 1;
		var indentspace = "";
		for (var ind = 0; ind < newindent; ind++) 
			indentspace += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
				
		// init CLASS-EXPAND report
		createReport("CLASS-EXPAND", decodeURIComponent(location.search)+" -> "+cluri);
			
		/*{
			if (ind == newindent -1)
				indentspace += '&nbsp;&nbsp;<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>&nbsp;&nbsp;';
			else
				indentspace += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
		}*/
		getListClasses(Repo.classes[cluri].subclasses, "subclasses", function() {
			getIndividualCount(Repo.classes[cluri].subclasses, true, function() {
				// get list of classes for counting individuals 
				var countclasses = [];
				_.each(Repo.classes[cluri].subclasses, function(scuri) {
					var classindivs = Repo.classes[scuri].indivs;					
					if (Repo.classes[scuri].indivs.count != undefined || Repo.classes[scuri].indivs.more1000 == false)
						countclasses.push(scuri);											
				});
				getIndividualCount(countclasses, false, function() {
					getLabelsComments(Repo.classes[cluri].subclasses, Repo.classes, function() {
						// remove progress bar
						$liel.next().remove();						
						
						// generate aux object for the template
						var scobj = [];	
						var suburis = _.filter(Repo.classes[cluri].subclasses, isUriEnabled);						
						_.each(suburis, function(scuri) {
							var clase = Repo.classes[scuri];	
							var clinfo = {};
							clinfo.uri = clase.uri;
							clinfo.a = generateUrl("class", scuri);
							clinfo.prefix = Repo.classes[scuri].prefix;
							clinfo.label = firstUppercase(getLiteral(clase.label, uriToLiteral(scuri)));
							clinfo.nclasses = _.filter(Repo.classes[scuri].subclasses, isUriEnabled).length;
							if (clinfo.nclasses == 0)
								clinfo.nosubclasses = true;
							if ( (Repo.classes[scuri].indivs.more1000 != undefined && Repo.classes[scuri].indivs.more1000 == true) ||
									Repo.classes[scuri].indivs.count > 1000)
								clinfo.nindivs = "+1K";
							else
								clinfo.nindivs = Repo.classes[scuri].indivs.count;
							scobj.push(clinfo);
						});
						
						// sort elements
						scobj = _.sortBy(scobj, 'label').reverse();
						scobj = _.sortBy(scobj, function(el) { return el.nindivs === "+1K"? (+el.nclasses*10 + 1111) : (+el.nclasses*10 + +el.nindivs); });
						scobj =	scobj.reverse();
						
						// show more button
						if (scobj.length > config.hidemax) {
							// include fake element for the button
							scobj.splice(config.hidebegin, 0, { "botonesconder" : true});
							for (var ind = config.hidebegin + 1; ind < scobj.length; ind++)
								scobj[ind].esconder = true;						
						}
												
						var template = 
'{{#.}} \
	<li class="list-group-item {{#esconder}}esconder{{/esconder}}" indent="'+newindent+'"> \
		{{#botonesconder}} \
			<div><span>'+indentspace+'</span><span><button type="button" class="btn btn-default showmore">'+getLiteral(dict.showmore)+'</button></span></div> \
		{{/botonesconder}} \
		{{^botonesconder}} \
			<div class="row"> \
				<div class="col-sm-11"> \
					<a href="{{{a}}}" class="list-group-item"><span class="badge">{{nindivs}} I</span><span class="badge">{{nclasses}} C</span>'+indentspace+'{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{label}}</a> \
				</div> \
				{{^nosubclasses}} \
					<div class="col-sm-1"> \
						<button type="button" class="btn btn-default pull-right expandclass"> \
							<span class="glyphicon glyphicon-chevron-right" aria-hidden="true" cluri="{{{uri}}}"></span> \
						</button> \
					</div> \
				{{/nosubclasses}} \
			</div><!-- /row --> \
		{{/botonesconder}} \
	</li> \
{{/.}}';
						// generate content and add	to the DOM
						var newcontent = Mustache.render(template, scobj);							
						$liel.after(newcontent);
						
						// recreate handlers of the expand/collapse buttons
						$(".expandclass").off('click');
						$(".expandclass").click(handlerExpandClass);
						
						// recreate handlers of the showmore buttons
						$(".showmore").off('click');
						$(".showmore").click(handlerShowmore);
						
						// report expanded event and timings
						endReport();
						sendEvent("expanded");
						sendElapsedTiming();
						sendNqueriesTiming();
						
						// SAVE REPOSITORIES
						saveRepos();
					});
				});
			});
		});
	}
	else if ($spanel.hasClass("glyphicon-chevron-down")) {
		// COLLAPSE
		$(this).removeClass("btn-primary");
		$(this).addClass("btn-default");
		$spanel.removeClass("glyphicon-chevron-down");
		$spanel.addClass("glyphicon-chevron-right");
		// iterate to remove the next lis
		var indent = +$liel.attr("indent");
		do {
			var $nextliel = $liel.next();
			var fin = true;
			if (+$nextliel.attr("indent") > indent) {
				$nextliel.remove();
				fin = false;
			}				
		} while (!fin);			
	}
}

function handlerShowmore() {
	var $liel = $(this).closest("li");
	var indent = +$liel.attr("indent");
	// show elements
	var $aux = $liel;
	do {
		var $aux = $aux.next();
		var fin = true;
		if (+$aux.attr("indent") == indent && $aux.hasClass("esconder")) {
			$aux.removeClass("esconder");
			fin = false;
		}				
	} while (!fin);	
	// remove show more button
	$liel.remove();
}


/***********
 NAMESPACES
***********/
function processNamespaces(callback) {
	// get the list of namespaces from the classes object
	var listns = _.map( Object.keys(Repo.classes), getNamespace );
	listns = _.unique(listns);
	// handle each namespace element
	_.each(listns, function(ns) {
		// try to find a match in the list of named namespaces
		var prefix = _.findKey(queryPrefixes, function(pu) { return ns.startsWith(pu); });
		if (prefix != undefined)
			ns = queryPrefixes[prefix]; // this is to reduce the list of namespaces, e.g. http://dbpedia.org/class/yago/WikicatHIV/ is converted into http://dbpedia.org/class/yago/
		// not in the repo?
		if (_.find(Repo.namespaces, function(el) {return el.ns === ns;} ) == undefined) {
			var nsobj = { "ns": ns, "enabled": true };
			if (prefix != undefined)
				nsobj.prefix = prefix;
			Repo.namespaces.push(nsobj);
		}	
	});
	// sort namespaces in the repo
	Repo.namespaces = _.sortBy(Repo.namespaces, 'ns'); // last option by namespace uri
	Repo.namespaces = _.sortBy(Repo.namespaces, 'prefix'); // first by prefix label
	
	// prepare list of namespaces to skip
	Repo.skipns = _.pluck( _.filter(Repo.namespaces, function(el){ return !el.enabled; }), 'ns');
	
	// get upper subclasses of skipped namespaces if not done yet
	var procns = _.filter(Repo.namespaces, function(el){ return !el.enabled && el.uppersubclasses == undefined; });
	if (procns.length > 0) {
		var nrequests = procns.length; // number of requests
		var newclasses = []; // new classes found in this process
		_.each(procns, function(nsel) {
			DataProv.getData("uppersubclassesns", nsel, function(datos) {
				// success, initialization
				nsel.uppersubclasses = [];
				_.each(datos.results.bindings, function(row) {
					var newcluri = row.class.value;
					// evaluate only if it's not a blank node
					if (row.class.type === "uri") {
						nsel.uppersubclasses.push(newcluri);
						// save new class if it does not exist
						if (Repo.classes[newcluri] == undefined)
							Repo.classes[newcluri] = { "uri": newcluri, "prefix": _.findKey(queryPrefixes, function(pu) { return newcluri.startsWith(pu); }) };
					}
				});
				// include classes found
				newclasses = _.union(newclasses, nsel.uppersubclasses);			
				// decrement requests
				nrequests--;
				// finished?
				if (nrequests <= 0) {
					// process the classes found
					getListClasses(newclasses, "subclasses", function() {
						getListClasses(newclasses, "superclasses", function() {
							getIndividualCount(newclasses, true, function() {
								// get list of classes for counting individuals 
								var countclasses = [];
								_.each(newclasses, function(cluri) {
									var classindivs = Repo.classes[cluri].indivs;					
									if (Repo.classes[cluri].indivs.count != undefined || Repo.classes[cluri].indivs.more1000 == false)
										countclasses.push(cluri);											
								});
								getIndividualCount(countclasses, false, function() {
									getLabelsComments(newclasses, Repo.classes, function() {
										processNamespaces(function() {
											if (callback != undefined)
												callback();
										});						
									});
								});
							});
						});
					});
				}
			});		
		});	
	}
	else if (callback != undefined) 
		callback();
}

function getNamespace(uri) {
	if ( uri.split("#").length == 2)
		return uri.split("#")[0] + "#";
	else if ( uri.split("/").length > 1) {
		var parts = uri.split("/");
		var ns = "";
		for (var ind = 0; ind < parts.length - 1; ind++)
			ns += parts[ind] + "/";
		return ns;
	}
}

function isUriEnabled(uri) {
	for (var ind = 0; ind < Repo.skipns.length; ind++) {
		if (uri.startsWith(Repo.skipns[ind]))
			return false;	
	}
	return true;
}