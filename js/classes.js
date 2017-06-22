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

function getInfoClass(cluri, callback) {
	// init CLASS report
	createReport("CLASS", decodeURIComponent(location.search));
	
	// activate spinner
	$("#loader").removeClass( "esconder" );
	// create class object if necessary
	if (Repo.classes[cluri] == undefined)
		Repo.classes[cluri] = {"uri" : cluri, "prefix": _.findKey(queryPrefixes, function(pu) { return cluri.startsWith(pu); }) };
		
	var clase = Repo.classes[cluri];
		
	// chain requests to get all information about the class
	var nrequests = 2; // inner requests (need to read this in the count individuals query)
	getListClasses( [cluri], "subclasses", function() {
		getListClasses( [cluri], "superclasses", function() {
			setBreadcrumbs( [cluri], function() {
				getListClasses( Repo.classes[cluri].subclasses, "subclasses", function() {				
					getIndividualCount(Repo.classes[cluri].subclasses, true, function() {
						// get list of classes for counting individuals 
						var countclasses = [];
						_.each(Repo.classes[cluri].subclasses, function(sburi) {
							var classindivs = Repo.classes[sburi].indivs;					
							if (Repo.classes[sburi].indivs.count != undefined || Repo.classes[sburi].indivs.more1000 == false)
								countclasses.push(sburi);											
						});
						getIndividualCount(countclasses, false, function() {
							getPageIndivs(cluri, 0, function() {
								// request labels and comments (both classes and individuals)
								var cluris = _.union( Repo.breadcrumbs, Repo.classes[cluri].subclasses, Repo.classes[cluri].superclasses );
								var induris = Repo.classes[cluri].indivs.pages[0];
								// make the two remaining requests				
								getLabelsComments(cluris, Repo.classes, function() {
									nrequests--;
									if (nrequests <= 0) {
										// quito spinner
										$("#loader").addClass( "esconder" );
										if (callback != undefined)
											callback();
									}
								});
								getLabelsComments(induris, Repo.indivs, function() {
									nrequests--;
									if (nrequests <= 0) {
										// quito spinner
										$("#loader").addClass( "esconder" );
										if (callback != undefined)
											callback();
									}
								});
							});
						});
					});				
				});
			});
		});		
	});
	// count the number of individuals, if not done already
	if (Repo.classes[cluri].indivs == undefined) {
		Repo.classes[cluri].indivs = {};
		Repo.classes[cluri].indivs.pages = [];
	}
	if (Repo.classes[cluri].indivs.count == undefined) {
		getIndividualCount([cluri], false, function() {
			// do something?
			if (nrequests <= 0) {
				// check if same class and then update indiv bar
				if (QueryDict.class != undefined && QueryDict.class === cluri)
					updateIndivBar(Repo.classes[cluri]);
				// SAVE REPOSITORIES
				//sessionStorage.setItem("repos", JSON.stringify(Repos));
				saveRepos();
			}
		});
	}
}

function getIndividualCount(cluris, estimation, callback) {
	// list of class uris to query
	var listuris = [];
	// check each class uri
	_.each(cluris, function(cluri) {
		// create object if necessary
		if (Repo.classes[cluri] == undefined)
			Repo.classes[cluri] = {"uri" : cluri, "prefix": _.findKey(queryPrefixes, function(pu) { return cluri.startsWith(pu); }) };
		if (Repo.classes[cluri].indivs == undefined) {
			Repo.classes[cluri].indivs = {};
			Repo.classes[cluri].indivs.pages = [];
		}	
		// no individual count or estimation?
		if (estimation && (Repo.classes[cluri].indivs.count == undefined && Repo.classes[cluri].indivs.more1000 == undefined))
			listuris.push(cluri);
		else if (!estimation && Repo.classes[cluri].indivs.count == undefined)
			listuris.push(cluri);
	});
	if (listuris.length > 0) {
		// prepare sets of 50 uris		
		var lote = 50;
		var urisets = [];
		for (var ind=0; listuris.length > ind*lote; ind++) {
			var begin = ind*lote;
			var end = (ind + 1)*lote;
			if (end > listuris.length)
				end = listuris.length;		
			urisets.push( listuris.slice( begin, end ) );		
		}
		var nrequests = urisets.length;
		
		// a request for each set
		_.each(urisets, function(uriset) {
			// format request object
			var aux = {};
			aux.uris = [];
			aux.furis = []; 
			_.each(uriset, function(uri) {
				aux.uris.push(uri);
				aux.furis.push("<"+uri+">");
			});
			if (estimation) {
				DataProv.getData("thousandindivs", aux, function(datos) {
					// success, initialization to false			
					_.each(aux.uris, function(cluri) {
						Repo.classes[cluri].indivs.more1000 = false;
					});	
					// process results
					_.each(datos.results.bindings, function(row) {
						// get data and store
						var cluri = row.class.value;
						Repo.classes[cluri].indivs.more1000 = true;
					});				
					// decrement requests
					nrequests--;
					// callback?
					if (nrequests <= 0 && callback != undefined)
						callback();
				});			
			}
			else {
				DataProv.getData("countindivs", aux, function(datos) {
					// success, initialization to 0			
					_.each(aux.uris, function(cluri) {
						Repo.classes[cluri].indivs.count = 0;
					});	
					// process results
					_.each(datos.results.bindings, function(row) {
						// get data and store
						if (row.class != undefined) { // check for Fuseki endpoints...
							var cluri = row.class.value;
							Repo.classes[cluri].indivs.count = row.count.value;
						}
					});				
					// decrement requests
					nrequests--;
					// callback?
					if (nrequests <= 0 && callback != undefined)
						callback();
				});			
			}
		});	
	}
	else if (listuris.length == 0 && callback != undefined) 			
		callback();
}

function getListClasses(cluris, list, callback) {
	// NOTE: list will be either "superclasses" or "subclasses"
	// list of class uris to query
	var listuris = [];
	// check each class uri
	_.each(cluris, function(cluri) {
		// create object if necessary
		if (Repo.classes[cluri] == undefined)
			Repo.classes[cluri] = {"uri" : cluri, "prefix": _.findKey(queryPrefixes, function(pu) { return cluri.startsWith(pu); }) };
		// no super/subclasses?
		if (Repo.classes[cluri][list] == undefined)
			listuris.push(cluri);
	});
	if (listuris.length > 0) {
		// get query and target variable
		var query = list === "superclasses"? "directsuperclasses" : "directsubclasses";
		var target = list === "superclasses"? "super" : "sub";	
		// send a query for each class in the list
		var nrequests = listuris.length;
		_.each(listuris, function(uri) {
			DataProv.getData(query, { "uri" : uri}, function(datos) {
				// success, initialize subclasses
				Repo.classes[uri][list] = [];
				// process results
				_.each(datos.results.bindings, function(row) {
					// get data and store
					var cluri = row[target].value;
					// continue only if it is not a blank node
					if (row[target].type === "uri") {;
						Repo.classes[uri][list].push(cluri);
						// store new class if it did not exist
						if (Repo.classes[cluri] == undefined)
							Repo.classes[cluri] = { "uri" : cluri, "prefix": _.findKey(queryPrefixes, function(pu) { return cluri.startsWith(pu); }) };
					}
				});				
				// decrement requests
				nrequests--;
				// callback?
				if (nrequests <= 0 && callback != undefined) 
					callback();			
			});		
		});
	}
	else if (listuris.length == 0 && callback != undefined) 
		callback();
}

function setBreadcrumbs(newbreadcrumbs, callback) {
	// cojo el elemento a evaluar (el primero de la lista)
	var evuri = newbreadcrumbs[0];
	
	// obtengo superclases si no existían...
	if (Repo.classes[evuri].superclasses == undefined) {	
		getListClasses( [evuri], "superclasses", function() {
			// reintento
			setBreadcrumbs(newbreadcrumbs, callback);
		});
		return;	
	}
	
	// now there are superclasses!
	
	var superuris = _.filter(Repo.classes[evuri].superclasses, isUriEnabled);	
	
	// si no hay superclases es que hemos acabado
	if (superuris.length == 0) {
		Repo.breadcrumbs = newbreadcrumbs; // ya tenemos nuevos breadcrumbs
		
		// callback
		if (callback != undefined)
			callback();
	}
	else {
		// compruebo si alguna de las superclases estaba en los breadcrumbs anteriores
		var inter = [];
		_.each(Repo.breadcrumbs, function(bruri) {
			var eluri = _.find(superuris, function(scuri) { return scuri === bruri; });
			if (eluri != undefined)
				inter.push(eluri);
		});
		// si hay algún elemento en la intersección...
		if (inter.length > 0) {
			// tomo un elemento al azar
			var eluri = _.sample(inter);
			// ahora reconstruyo el nuevo breadcrumbs
			var indice = _.indexOf(Repo.breadcrumbs, eluri);
			for (; indice >= 0; indice--) {
				newbreadcrumbs.unshift( Repo.breadcrumbs[indice] );
			}
			// en la siguiente vuelta debería detectar que hemos acabado al no haber superclases del primer elemento (será Thing)
		}
		else { // no hay nada previo, cojo una superclase al azar
			newbreadcrumbs.unshift( _.sample(superuris) );
		}
		// volvemos a la función
		setBreadcrumbs(newbreadcrumbs, callback);
		return;	
	}
}

function getPageIndivs(cluri, page, callback) {
	var clase = Repo.classes[cluri];
	if (clase.indivs == undefined) {
		clase.indivs = {};
		clase.indivs.pages = [];
	}
	if (clase.indivs.pages[page] == undefined) {
		// prepare query object
		var qobj = {};
		qobj.uri = clase.uri;
		qobj.limit = config.pagesize;
		qobj.offset = page * qobj.limit;		
		DataProv.getData('indivs', qobj, function(datos) {
			// initialize page
			clase.indivs.pages[page] = [];
			_.each(datos.results.bindings, function(row) {
				var newinduri = row.indiv.value;
				// continue if it is not a blank node
				if (row.indiv.type === "uri") {				
					clase.indivs.pages[page].push(newinduri);
					// store individual if it did not exist
					if (Repo.indivs[newinduri] == undefined)
						Repo.indivs[newinduri] = { "uri" : newinduri};
				}
			});
			// callback
			if (callback != undefined)
				callback();
		});
	}
	else if (callback != undefined)
		callback();
}

function getLabelsComments(evuris, target, callback) {
	// lista de propiedades a considerar
	var props = ["label", "comment"];
	// consultas
	var nrequests = 0;
	// chequeo las clases implicadas para cada propiedad
	_.each(props, function(prop) {
		// lista de uris a obtener
		var uris = [];
		// analizo si existen las propiedades de cada objeto implicado
		_.each(evuris, function(evuri) {
			if (target[evuri][prop] == undefined) 
				uris.push(evuri);
		});
		
		// preparo lotes de 50 uris
		var lote = 50;
		var urisets = [];
		for (var ind=0; uris.length > ind*lote; ind++) {
			var begin = ind*lote;
			var end = (ind + 1)*lote;
			if (end > uris.length)
				end = uris.length;		
			urisets.push( uris.slice( begin, end ) );		
		}
		
		// incremento peticiones
		nrequests += urisets.length;
		
		// solicito cada lote
		_.each(urisets, function(uriset) {
			// preparo subconjunto de uris
			var aux = {};
			aux.uris = [];
			aux.furis = []; 
			_.each(uriset, function(uri) {
				aux.uris.push(uri);
				aux.furis.push("<"+uri+">");
			});
			DataProv.getData(prop, aux, function(datos) {
				// creo los arrays de las propiedades aquí (ya que ha habido respuesta buena)
				_.each(aux.uris, function(evuri) {
					if (target[evuri][prop] == undefined)
						target[evuri][prop] = {};
				});						
				// ahora proceso los resultados
				_.each(datos.results.bindings, function(row) {
					// obtengo datos
					var evuri = row.uri.value;
					var lang = row[prop]["xml:lang"] == undefined? config.nolang : row[prop]["xml:lang"];
					var val = row[prop].value;
					// guardo
					if (target[evuri][prop] != undefined) 
						target[evuri][prop][lang] = val;
				});				
				// decremento peticiones
				nrequests--;
				// callback?
				if (nrequests <= 0 && callback != undefined)
					callback();
			});			
		});
	});
	// no requests, callback
	if (nrequests == 0 && callback != undefined)
		callback();
}

function renderClass(cluri) {
	// set page to 0 (global)
	Page = 0;
	// init indiv search (global)
	IndivSearch = false;
	IndivPage = 0;
	
	// preparo datos para mostrar
	var clase = Repo.classes[cluri];	
	var clinfo = {};
	clinfo.uri = cluri;
	clinfo.label = firstUppercase(getLiteral(clase.label, uriToLiteral(cluri)));
	clinfo.comment = firstUppercase(getLiteral(clase.comment, getLiteral(dict.defclasscomment)));
	clinfo.prefix = clase.prefix;
	
	// superclasses
	clinfo.superclasses = [];
	var superuris = _.filter(clase.superclasses, isUriEnabled);
	_.each(superuris, function(superuri) {
		var spobj = {};
		spobj.a = generateUrl("class", superuri); //"index.html?class="+encodeURIComponent(superuri);
		spobj.prefix = Repo.classes[superuri].prefix;
		spobj.label = firstUppercase(getLiteral(Repo.classes[superuri].label, uriToLiteral(superuri)));
		clinfo.superclasses.push(spobj);
	});
	clinfo.superclasses = _.sortBy(clinfo.superclasses, 'label');
	
	// subclasses
	clinfo.subclasses = [];
	var subruris = _.filter(clase.subclasses, isUriEnabled);
	_.each(subruris, function(suburi) {
		/*var sbobj = {};
		sbobj.a = generateUrl("class", suburi); //"index.html?class="+encodeURIComponent(suburi);
		sbobj.prefix = Repo.classes[suburi].prefix;
		sbobj.label = firstUppercase(getLiteral(Repo.classes[suburi].label, uriToLiteral(suburi)));
		clinfo.subclasses.push(sbobj);*/
		var sbobj = {};
		sbobj.uri = suburi;
		sbobj.a = generateUrl("class", suburi);
		sbobj.prefix = Repo.classes[suburi].prefix;
		sbobj.label = firstUppercase(getLiteral(Repo.classes[suburi].label, uriToLiteral(suburi)));		
		sbobj.nclasses = _.filter(Repo.classes[suburi].subclasses, isUriEnabled).length;
		if (sbobj.nclasses == 0)
			sbobj.nosubclasses = true;
		if ( (Repo.classes[suburi].indivs.more1000 != undefined && Repo.classes[suburi].indivs.more1000 == true) ||
				Repo.classes[suburi].indivs.count > 1000)
			sbobj.nindivs = "+1K";
		else
			sbobj.nindivs = Repo.classes[suburi].indivs.count;
		clinfo.subclasses.push(sbobj);		
	});
	// sort subclasses
	clinfo.subclasses = _.sortBy(clinfo.subclasses, 'label').reverse();
	clinfo.subclasses = _.sortBy(clinfo.subclasses, function(el) { return el.nindivs === "+1K"? (+el.nclasses*10 + 1111) : (+el.nclasses*10 + +el.nindivs); });
	clinfo.subclasses = clinfo.subclasses.reverse();
	//clinfo.subclasses = _.sortBy(clinfo.subclasses, 'label');
	// show more button
	if (clinfo.subclasses.length > config.hidemax) {
		// include fake element for the button
		clinfo.subclasses.splice(config.hidebegin, 0, { "botonesconder" : true});
		for (var ind = config.hidebegin + 1; ind < clinfo.subclasses.length; ind++)
			clinfo.subclasses[ind].esconder = true;						
	}	
	
	// indivs
	clinfo.indivs = [];
	_.each(clase.indivs.pages[Page], function(induri) {
		var indobj = {};
		indobj.a = generateUrl("indiv", induri); //"index.html?indiv="+encodeURIComponent(induri);
		indobj.label = firstUppercase(getLiteral(Repo.indivs[induri].label, uriToLiteral(induri)));
		clinfo.indivs.push(indobj);
	});
	//clinfo.indivs = _.sortBy(clinfo.indivs, 'label');	
	//clinfo.repouri = generateUrl("", "");
	clinfo.breadcrumbs = [];
	_.each(Repo.breadcrumbs, function(bruri) {
		if (bruri !== cluri) {
			var brobj = {};
			brobj.a = generateUrl("class", bruri); //"index.html?class="+encodeURIComponent(bruri);
			brobj.prefix = Repo.classes[bruri].prefix;
			brobj.label = firstUppercase(getLiteral(Repo.classes[bruri].label, uriToLiteral(bruri)));
			clinfo.breadcrumbs.push(brobj);
		}
	});

	// plantilla
	var template =
		'<div class="jumbotron"> \
		  <div class="container"> \
			<h1>{{label}}</h1> \
			<p><a href="{{{uri}}}" >{{{uri}}}</a></p> \
			<p>{{comment}}</p> \
		  </div> \
		</div> \
		<div class="container"> \
			<ol class="breadcrumb"> \
				{{#breadcrumbs}} \
					<li><a href="{{{a}}}" >{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{label}}</a></li> \
				{{/breadcrumbs}} \
				<li class="active">{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{label}}</li> \
			</ol> \
			<div class="panel-group"> \
				<div class="panel panel-info"> \
					<div class="panel-heading"> \
						{{^superclasses.length}} \
							<h4 class="panel-title">'+getLiteral(dict.nosuper)+'</h4> \
						{{/superclasses.length}} \
						{{#superclasses.length}} \
							<a data-toggle="collapse" href="#collapse_superclasses"> \
								<span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span> \
								<h4 class="panel-title">'+getLiteral(dict.super)+'</h4> \
							</a> \
						{{/superclasses.length}} \
					</div> \
					<div id="collapse_superclasses" class="panel-collapse collapse in"> \
						<ul class="list-group"> \
							{{#superclasses}} \
								<a href="{{{a}}}" class="list-group-item" >{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{label}}</a> \
							{{/superclasses}} \
						</ul> \
					</div> \
				</div> \
			</div> \
			<div class="panel-group"> \
				<div class="panel panel-info"> \
					<div class="panel-heading"> \
						{{^subclasses.length}} \
							<h4 class="panel-title">'+getLiteral(dict.nosub)+'</h4> \
						{{/subclasses.length}} \
						{{#subclasses.length}} \
							<a data-toggle="collapse" href="#collapse_subclasses"> \
								<span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span> \
								<h4 class="panel-title">'+getLiteral(dict.sub)+'</h4> \
							</a> \
						{{/subclasses.length}} \
					</div> \
					<div id="collapse_subclasses" class="panel-collapse collapse in"> \
						<ul class="list-group"> \
							{{#subclasses}} \
	<li class="list-group-item {{#esconder}}esconder{{/esconder}}" indent="0"> \
		{{#botonesconder}} \
			<button type="button" class="btn btn-default showmore">'+getLiteral(dict.showmore)+'</button> \
		{{/botonesconder}} \
		{{^botonesconder}} \
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
		{{/botonesconder}} \
	</li> \
							{{/subclasses}} \
						</ul> \
					</div> \
				</div> \
			</div> \
			<div class="panel-group"> \
				<div class="panel panel-success"> \
					<div class="panel-heading"> \
						{{^indivs.length}} \
							<h4 class="panel-title">'+getLiteral(dict.noindiv)+'</h4> \
						{{/indivs.length}} \
						{{#indivs.length}} \
							<a data-toggle="collapse" href="#collapse_indivs"> \
								<span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span> \
								<h4 class="panel-title">'+getLiteral(dict.indiv)+'</h4> \
							</a> \
						{{/indivs.length}} \
					</div> \
					<div id="collapse_indivs" class="panel-collapse collapse in"> \
						<ul class="list-group"> \
							{{#indivs.length}} \
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
									<div class="col-sm-1"> \
									</div> \
									<div class="col-sm-3"> \
										<div class="input-group"> \
										  <input id="ind_search_input"  type="text" class="form-control" placeholder="'+getLiteral(dict.label)+'..." style="display:none"> \
										  <span class="input-group-btn"> \
											<button id="ind_search_button" class="btn btn-default" type="button" style="display:none">'+getLiteral(dict.search)+'</button> \
										  </span> \
										</div><!-- /input-group --> \
									</div> \
								</div><!-- /row --> \
							</li><!-- /INDIVS PAGINATION AND SEARCH --> \
							{{#indivs}} \
								<a href="{{{a}}}" class="list-group-item" >{{label}}</a> \
							{{/indivs}} \
							{{/indivs.length}} \
						</ul> \
					</div> \
				</div> \
			</div> \
		</div>';
	
	// generate the mark-up
	var content = Mustache.render(template, clinfo);
	
	// include the mark-up
	$("#contenedor").html(content);
	
	// adjust chevrons
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
	
	// listen to show more clicks
	$(".showmore").click(handlerShowmore);	
	
	// adjust indiv bar
	updateIndivBar(clase);
	
	// indiv bar controls
	$("#ind_page_prev_button").click(function() {
		if (!$(this).is('.disabled')) {
			// update page
			Page = Page - 1;
			// get indivs and update
			getPageIndivsRender(clase);
		}
	});
	$("#ind_page_next_button").click(function() {
		if (!$(this).is('.disabled')) {
			// update page
			Page = Page + 1;
			// get indivs and update
			getPageIndivsRender(clase);
		}
	});
	$("#ind_page_input").keypress(function (e) {
		// if enter...
	    if (e.which == 13)
	    	$("#ind_page_go_button").click();
	});
	$("#ind_page_go_button").click(function() {
		if (!$(this).is('.disabled')) {
			var lastpage = Math.ceil( clase.indivs.count / config.pagesize) - 1;		
			var input = $("#ind_page_input").val();
			var gotopage = Math.floor(Number(input)) -1;
			//$("#ind_page_input").val("");
			if (String(gotopage + 1) === input && gotopage >= 0 && gotopage <= lastpage ) { // OK!
				// update page
				Page = gotopage;
				// get indivs and update
				getPageIndivsRender(clase);				
			}
		}
	});
	$("#ind_search_input").keypress(function (e) {
		if (!$(this).attr( "readonly" )) {
			// if enter...
			if (e.which == 13)
				$("#ind_search_button").click();
			else if (IndivSearch) {// clear search results
				// show elements in indiv bar
				$("#ind_page_prev_button").show();
				$("#ind_page_next_button").show();
				$("#ind_pages_text").show();
				$("#ind_page_input").show();
				$("#ind_page_go_button").show();
				// render page of indivs again
				getPageIndivsRender(clase);	
				// no indiv search
				IndivSearch = false;
				IndivPage = 0;
			}
	    }
	});
	$("#ind_search_button").click(function() {
		if (!$(this).is('.disabled')) {
			var input = $("#ind_search_input").val();
			if (input !== "") {
				getSearchPageIndivsRender(clase, input);
			}
		}
	});
	
	// report loaded event and timings
	endReport();
	sendEvent("loaded");
	sendElapsedTiming();
	sendNqueriesTiming();
	
	// SAVE REPOSITORIES
	//sessionStorage.setItem("repos", JSON.stringify(Repos));
	saveRepos();		
}

function updateIndivBar(clase) {
	var nextpage = Page + 1;
	// prev navigation
	if (Page > 0)
		$("#ind_page_prev_button").removeClass("disabled");
	else
		$("#ind_page_prev_button").addClass("disabled");
	// do we know the number of indivs?
	if (clase.indivs.count != undefined) {
		var lastpage = Math.ceil( clase.indivs.count / config.pagesize) - 1;	
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
			$("#ind_search_input").removeAttr("style");
			$("#ind_search_button").removeClass("disabled");
			$("#ind_search_button").removeAttr("style");
		}
		else {
			$("#ind_page_input").attr("style", "display:none");
			$("#ind_page_go_button").attr("style", "display:none");
			$("#ind_search_input").attr("style", "display:none");
			$("#ind_search_button").attr("style", "display:none");
		}		
	}
	else { // we don't know...
		// get number of indivs in the current page
		var nindspage = clase.indivs.pages[Page].length;
		// next navigation
		if ( (clase.indivs.pages[nextpage] != undefined && clase.indivs.pages[nextpage].length==0) ||
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
		// search
		if (Page == 0 && nindspage < config.pagesize) {
			$("#ind_search_input").attr("style", "display:none");
			$("#ind_search_button").attr("style", "display:none");
		}
		else {
			$("#ind_search_input").removeAttr("style");
			$("#ind_search_button").removeClass("disabled");
			$("#ind_search_button").removeAttr("style");
		}
	}
}

function disableIndivBar() {
	$("#ind_page_prev_button").addClass("disabled");
	$("#ind_page_next_button").addClass("disabled");
	$("#ind_page_go_button").addClass("disabled");
	$("#ind_search_button").addClass("disabled");
}

function getPageIndivsRender(clase) {
	// init INDIV-PAGE report
	if (Report != undefined && Report.end != undefined)
		createReport("INDIV-PAGE", decodeURIComponent(location.search)+' -> page '+Page );

	// store position
	var pos = $(document).scrollTop();

	// disable controls
	disableIndivBar();
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
	// get page of individuals
	getPageIndivs(clase.uri, Page, function() {
		// request labels and comments of individuals
		getLabelsComments(clase.indivs.pages[Page], Repo.indivs, function() {
			// remove progress bar
			$li.siblings().remove();
			// set new individuals
			var newindivs = [];
			_.each(clase.indivs.pages[Page], function(induri) {
				var indobj = {};
				indobj.a = generateUrl("indiv", induri); //"index.html?indiv="+encodeURIComponent(induri);
				indobj.label = firstUppercase(getLiteral(Repo.indivs[induri].label, uriToLiteral(induri)));
				newindivs.push(indobj);
			});
			var template = '{{#.}}<a href="{{{a}}}" class="list-group-item" >{{label}}</a>{{/.}}';
			var newcontent = Mustache.render(template, newindivs);
			$li.after(newcontent);					
			// update indiv bar
			updateIndivBar(clase);
			
			// back to previous position
			$(document).scrollTop(pos);
			
			// report loaded event and timings			
			if (Report != undefined && Report.cat === "INDIV-PAGE") {
				endReport();
				sendEvent("loaded");
				sendElapsedTiming();
				sendNqueriesTiming();	
			}
			
			// SAVE REPOSITORIES
			//sessionStorage.setItem("repos", JSON.stringify(Repos));
			saveRepos();
		});
	});
}


function getSearchPageIndivsRender(clase, input) {
	// init INDIV-SEARCH report
	createReport("INDIV-SEARCH", decodeURIComponent(location.search)+' -> query: "'+input+'" -> page '+IndivPage );

	// store position
	var pos = $(document).scrollTop();
	
	// disable controls
	disableIndivBar();
	// readonly input
	$("#ind_search_input").attr( "readonly", "readonly" );
	// hide rest of the elements in the indiv bar
	$("#ind_page_prev_button").hide();
	$("#ind_page_next_button").hide();
	$("#ind_pages_text").hide();
	$("#ind_page_input").hide();
	$("#ind_page_go_button").hide();				
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
	// search page of individuals
	getSearchPageIndivsClass(clase.uri, input, IndivPage, function() {
		// request labels and comments of individuals
		getLabelsComments(clase.indivsearches[input].indivs.pages[IndivPage], Repo.indivs, function() {
			// everything ready!
			IndivSearch = true;
			// adjust input
			$("#ind_search_input").removeAttr( "readonly" );
			// remove progress bar
			$li.siblings().remove();
			// include found individuals
			var newindivs = [];
			_.each(clase.indivsearches[input].indivs.pages[IndivPage], function(induri) {
				var indobj = {};
				indobj.a = generateUrl("indiv", induri); //"index.html?indiv="+encodeURIComponent(induri);
				indobj.label = firstUppercase(getLiteral(Repo.indivs[induri].label, uriToLiteral(induri)));
				newindivs.push(indobj);
			});
			var template = '{{#.}}<a href="{{{a}}}" class="list-group-item" >{{label}}</a>{{/.}}';
			var newcontent = Mustache.render(template, newindivs);
			$li.after(newcontent);
			// search indiv bar
			var indivsearchbar = '<li class="list-group-item list-group-item-success"> \
					<div class="row"> \
						<div class="col-sm-2"> \
							<button id="ind_search_page_prev_button" type="button" class="btn btn-default disabled"> \
							  <span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span> \
							</button> \
							<button id="ind_search_page_next_button" type="button" class="btn btn-default"> \
							  <span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span> \
							</button> \
						</div> \
						<div class="col-sm-3"> \
							<span id="ind_search_pages_text" style="line-height: 2.4em;display:none"></span> \
						</div> \
						<div class="col-sm-3"> \
							<div class="input-group"> \
							  <input id="ind_search_page_input" class="form-control" type="text" placeholder="'+getLiteral(dict.page)+'..." style="display:none"> \
							  <span class="input-group-btn"> \
								<button id="ind_search_page_go_button" class="btn btn-default" type="button" style="display:none">'+getLiteral(dict.go)+'</button> \
							  </span> \
							</div><!-- /input-group --> \
						</div> \
						<div class="col-sm-1"> \
						</div> \
						<div class="col-sm-3"> \
							<span id="ind_search_found" style="line-height: 2.4em;"></span> \
						</div> \
					</div><!-- /row --> \
				</li>';
			$li.after(indivsearchbar);
		
			// indiv search bar controls
			$("#ind_search_page_prev_button").click(function() {
				if (!$(this).is('.disabled')) {
					// update page
					IndivPage = IndivPage - 1;
					// get indivs and update
					getSearchPageIndivsRender(clase, input);
				}
			});
			$("#ind_search_page_next_button").click(function() {
				if (!$(this).is('.disabled')) {
					// update page
					IndivPage = IndivPage + 1;
					// get indivs and update
					getSearchPageIndivsRender(clase, input);
				}
			});
			$("#ind_search_page_input").keypress(function (e) {
				// if enter...
				if (e.which == 13)
					$("#ind_search_page_go_button").click();
			});
			$("#ind_search_page_go_button").click(function() {
				if (!$(this).is('.disabled')) {
					var lastpage = Math.ceil( clase.indivsearches[input].indivs.count / config.pagesize) - 1;		
					var inp = $("#ind_search_page_input").val();
					var gotopage = Math.floor(Number(inp)) -1;
					if (String(gotopage + 1) === inp && gotopage >= 0 && gotopage <= lastpage ) { // OK!
						// update page
						IndivPage = gotopage;
						// get indivs and update
						getSearchPageIndivsRender(clase, input);
					}
				}
			});		
		
			// update search indiv bar
			updateSearchIndivBar(clase, input);
			
			// back to previous position
			$(document).scrollTop(pos);
			
			// report results event and timings
			endReport();
			sendEvent("results");
			sendElapsedTiming();
			sendNqueriesTiming();
			
			// SAVE REPOSITORIES
			saveRepos();		
		});	
	});
	// count individuals in the search if not done already
	if (clase.indivsearches[input].indivs.count == undefined) {	
		// prepare query object
		var qobj = {};
		qobj.uri = clase.uri;
		qobj.input = input;	
		DataProv.getData('countfindindivsclass', qobj, function(datos) {
			// success, initialization to 0
			clase.indivsearches[input].indivs.count = 0;
			// process results
			_.each(datos.results.bindings, function(row) {
				clase.indivsearches[input].indivs.count = row.count.value;
			});	
			
			// update search indiv bar!!!
			updateSearchIndivBar(clase, input);
			
			// SAVE REPOSITORIES
			saveRepos();
		});
	}
}

function getSearchPageIndivsClass(cluri, input, page, callback) {
	// get class object
	var clase = Repo.classes[cluri];
	// initialize
	if (clase.indivsearches == undefined)
		clase.indivsearches = {};
	if (clase.indivsearches[input] == undefined)
		clase.indivsearches[input] = {};
	if (clase.indivsearches[input].indivs == undefined) {
		clase.indivsearches[input].indivs = {};
		clase.indivsearches[input].indivs.pages = [];
	}
	// obtain results
	if (clase.indivsearches[input].indivs.pages[page] == undefined) {
		// prepare query object	
		var qobj = {};
		qobj.uri = clase.uri;
		qobj.input = input;
		qobj.limit = config.pagesize;
		qobj.offset = page * qobj.limit;		
		DataProv.getData('findindivsclass', qobj, function(datos) {
			// initialize page
			clase.indivsearches[input].indivs.pages[page] = [];
			_.each(datos.results.bindings, function(row) {
				var newinduri = row.indiv.value;
				// continue if it is not a blank node
				if (row.indiv.type === "uri") {				
					clase.indivsearches[input].indivs.pages[page].push(newinduri);
					// store individual if it did not exist
					if (Repo.indivs[newinduri] == undefined)
						Repo.indivs[newinduri] = { "uri" : newinduri};
				}
			});
			// callback
			if (callback != undefined)
				callback();
		});
	}
	else if (callback != undefined)
		callback();
}

function updateSearchIndivBar(clase, input) {
	var nextpage = IndivPage + 1;
	// prev navigation
	if (IndivPage > 0)
		$("#ind_search_page_prev_button").removeClass("disabled");
	else
		$("#ind_search_page_prev_button").addClass("disabled");
	// do we know the number of indivs?
	if (clase.indivsearches[input].indivs.count != undefined) {
		// set individual count		
		if (clase.indivsearches[input].indivs.count == 0)
			$("#ind_search_found").html(getLiteral(dict.indivsnotfound));
		else if (clase.indivsearches[input].indivs.count == 1)
			$("#ind_search_found").html(getLiteral(dict.oneindivfound));
		else if (clase.indivsearches[input].indivs.count > 1)
			$("#ind_search_found").html(clase.indivsearches[input].indivs.count+" "+getLiteral(dict.indivsfound));
		var lastpage = Math.ceil( clase.indivsearches[input].indivs.count / config.pagesize) - 1;	
		// next navigation			
		if (nextpage > lastpage)
			$("#ind_search_page_next_button").addClass("disabled");
		else
			$("#ind_search_page_next_button").removeClass("disabled");
		// number of pages text
		var infopages = getLiteral(dict.page)+" "+(1+IndivPage)+" "+getLiteral(dict.of)+" "+(1+lastpage);
		$("#ind_search_pages_text").html(infopages);
		$("#ind_search_pages_text").removeAttr("style");
		$("#ind_search_pages_text").attr("style", "line-height: 2.4em");
		// go to page and search
		if (lastpage > 0) {
			$("#ind_search_page_input").removeAttr("style");
			$("#ind_search_page_go_button").removeClass("disabled");
			$("#ind_search_page_go_button").removeAttr("style");
		}
		else {
			$("#ind_search_page_input").attr("style", "display:none");
			$("#ind_search_page_go_button").attr("style", "display:none");
		}
		// no page info with less than a page of individuals...
		if (clase.indivsearches[input].indivs.count < config.pagesize) {
			$("#ind_search_pages_text").attr("style", "display:none");
			$("#ind_search_page_next_button").attr("style", "display:none");
			$("#ind_search_page_prev_button").attr("style", "display:none");
		}
	}
	else { // we don't know...
		// get number of indivs in the current page
		var nindspage = clase.indivsearches[input].indivs.pages[IndivPage].length;
		// next navigation
		if ( (clase.indivsearches[input].indivs.pages[nextpage] != undefined && clase.indivsearches[input].indivs.pages[nextpage].length==0) ||
			nindspage < config.pagesize)
			$("#ind_search_page_next_button").addClass("disabled");
		else
			$("#ind_search_page_next_button").removeClass("disabled");
		// number of pages text
		var infopages = getLiteral(dict.page)+" "+(1+IndivPage);
		$("#ind_search_pages_text").html(infopages);
		$("#ind_search_pages_text").removeAttr("style");
		$("#ind_search_pages_text").attr("style", "line-height: 2.4em");
		// go to page
		$("#ind_search_page_input").attr("style", "line-height: 2.4em; display:none");
		$("#ind_search_page_go_button").attr("style", "display:none");
	}
}