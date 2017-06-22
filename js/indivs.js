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

function getInfoIndiv(induri, callback) {
	// init INDIV report
	createReport("INDIV", decodeURIComponent(location.search));
	
	// activo spinner
	$("#loader").removeClass( "esconder" );
	// creo objeto si hace falta
	if (Repo.indivs[induri] == undefined) {
		Repo.indivs[induri] = {"uri" : induri};
	}
	// request info
	getTypesIndiv(induri, function() {
		getPropsIndiv(induri, function() {			
			// pido labels y comments a clases, propiedades e individuos
			var cluris = Repo.indivs[induri].types;
			var pruris = _.union( Object.keys(Repo.indivs[induri].objprops), 
				Object.keys(Repo.indivs[induri].dataprops), 
				Object.keys(Repo.indivs[induri].invprops) );		
			var induris = [ induri ];
			for (var key in Repo.indivs[induri].objprops)
				induris = _.union(induris, Repo.indivs[induri].objprops[key]);
			for (var key in Repo.indivs[induri].invprops)
				induris = _.union(induris, Repo.indivs[induri].invprops[key]);
			// three requests
			var nrequests = 3;
			var callbackdone = false;
			// request about classes
			if (cluris.length > 0) {			
				getLabelsComments(cluris, Repo.classes, function() {
					nrequests--;
					if (nrequests <= 0) {
						// quito spinner
						$("#loader").addClass( "esconder" );
						if (callback != undefined && !callbackdone) {
							callbackdone = true;
							callback();
						}
					}
				});
			}
			else
				nrequests--;
			// request about properties				
			if (pruris.length > 0) {	
				getLabelsComments(pruris, Repo.props, function() {
					nrequests--;
					if (nrequests <= 0) {
						// quito spinner
						$("#loader").addClass( "esconder" );
						if (callback != undefined && !callbackdone) {
							callbackdone = true;
							callback();
						}
					}
				});
			}
			else
				nrequests--;
			// request about individuals				
			if (induris.length > 0) {	
				getLabelsComments(induris, Repo.indivs, function() {
					nrequests--;
					if (nrequests <= 0) {
						// quito spinner
						$("#loader").addClass( "esconder" );
						if (callback != undefined && !callbackdone) {
							callbackdone = true;
							callback();
						}
					}
				});
			}
			else
				nrequests--;
			if (nrequests <= 0 && callback != undefined && !callbackdone){
				callbackdone = true;
				callback();
			}
		});
	});
}

function getTypesIndiv(induri, callback) {
	// creo objeto si hace falta
	if (Repo.indivs[induri] == undefined) {
		Repo.indivs[induri] = {"uri" : induri};
	}
	var indiv = Repo.indivs[induri];	
	// preparo consultas por tipos
	if (indiv.types == undefined) {
		DataProv.getData('types', indiv, function(datos) {
			// initialize types
			indiv.types = [];
			_.each(datos.results.bindings, function(row) {
				var newcluri = row.type.value;
				// continue only if it is not a blank node
				if (row.type.type === "uri") {
					indiv.types.push(newcluri);
					// guardo nueva clase si no existía
					if (Repo.classes[newcluri] == undefined)
						Repo.classes[newcluri] = { "uri" : newcluri, "prefix": _.findKey(queryPrefixes, function(pu) { return newcluri.startsWith(pu); }) };
				}
			});
			// siguiente paso
			if (callback != undefined)
				callback();
		});
	}
	else if (callback != undefined) // siguiente paso
		callback();
}

function getPropsIndiv(induri, callback) {
	var indiv = Repo.indivs[induri];
	// preparo consultas por propiedades y propiedades inversas
	var nrequests = 0;
	if (indiv.objprops == undefined || indiv.dataprops == undefined) {
		// incremento peticiones
		nrequests++;
		DataProv.getData('dirprops', indiv, function(datos) {
			// initialize object properties and datatype properties
			indiv.objprops = {};
			indiv.dataprops = {};
			_.each(datos.results.bindings, function(row) {
				// propiedad
				var propuri = row.prop.value;
				// objeto
				var obj = row.obj;
				// inicializo variable incluido
				var incluido = false;
				// object property?
				if (obj.type === "uri") {
					incluido = true;
					// inicializo array
					if (indiv.objprops[propuri] == undefined)
						indiv.objprops[propuri] = [];
					// guardo valor
					indiv.objprops[propuri].push(obj.value);
					// guardo nuevo indiv si no existía
					if (Repo.indivs[obj.value] == undefined)
						Repo.indivs[obj.value] = { "uri" : obj.value };	
				}
				// datatype property?
				else if (obj.type === "literal" || obj.type === "typed-literal") {
					incluido = true;
					// inicializo array
					if (indiv.dataprops[propuri] == undefined)
						indiv.dataprops[propuri] = {};
					// guardo valor
					var lang = obj["xml:lang"] == undefined? config.nolang : obj["xml:lang"];
					var val = obj.value;
					indiv.dataprops[propuri][lang] = val;
				}
				// no incluyo blank nodes
				// guardo propiedad si no existía
				if (incluido && Repo.props[propuri] == undefined) 
					Repo.props[propuri] = {"uri" : propuri, "prefix": _.findKey(queryPrefixes, function(pu) { return propuri.startsWith(pu); }) };
			});
			// decremento peticiones
			nrequests--;
			// ¿siguiente paso?
			if (nrequests <= 0 && callback != undefined)
				callback();
		});
	}
	if (indiv.invprops == undefined) {
		// incremento peticiones	
		nrequests++;
		DataProv.getData('invprops', indiv, function(datos) {
			// initialize inverse properties
			indiv.invprops = {};
			_.each(datos.results.bindings, function(row) {
				// propiedad
				var propuri = row.prop.value;
				// only continue if it is not a blank node
				if (row.sbj.type === "uri") {
					// inicializo array
					if (indiv.invprops[propuri] == undefined)
						indiv.invprops[propuri] = [];
					// guardo valor
					indiv.invprops[propuri].push(row.sbj.value);
					// guardo nuevo indiv si no existía
					if (Repo.indivs[row.sbj.value] == undefined)
						Repo.indivs[row.sbj.value] = { "uri" : row.sbj.value };
					// guardo propiedad si no existía
					if (Repo.props[propuri] == undefined) {
						Repo.props[propuri] = {"uri" : propuri, 
							"prefix": _.findKey(queryPrefixes, function(pu) { return propuri.startsWith(pu); }) };
					}
				}				
			});
			// decremento peticiones
			nrequests--;
			// ¿siguiente paso?
			if (nrequests <= 0 && callback != undefined)
				callback();
		});
	}
	// ¿siguiente paso?
	if (nrequests == 0 && callback != undefined)
		callback();
}

function renderIndiv(induri) {	
	// try to find url images
	Urlimgs = [];	
	var testurl = induri.split(/[?#]/)[0];
	if (testurl.match(/\.(jpeg|JPEG|jpg|JPG|gif|GIF|png|PNG|svg|SVG)$/) != null)
		Urlimgs = _.union(Urlimgs, [induri]);
	
	// preparo datos para mostrar
	var indiv = Repo.indivs[induri];	
	var indinfo = {};
	indinfo.uri = induri;
	indinfo.label = firstUppercase(getLiteral(indiv.label, uriToLiteral(induri)));
	indinfo.comment = firstUppercase(getLiteral(indiv.comment, getLiteral(dict.defindivcomment)));
	indinfo.repouri = generateUrl("", "");
	
	// types
	indinfo.types = [];
	var typeuris = _.filter(indiv.types, isUriEnabled);
	_.each(typeuris, function(tpuri) {
		var tpobj = {};
		tpobj.a = generateUrl("class", tpuri); //"index.html?class="+encodeURIComponent(tpuri);
		tpobj.prefix = Repo.classes[tpuri].prefix;
		//tpobj.uri = tpuri;
		tpobj.label = firstUppercase(getLiteral(Repo.classes[tpuri].label, uriToLiteral(tpuri)));
		indinfo.types.push(tpobj);
	});
	indinfo.types = _.sortBy(indinfo.types, 'label');	
	
	// literals
	indinfo.literals = [];
	for (var key in indiv.dataprops) {
		var dpobj = {};
		dpobj.a = key;
		//dpobj.pruri = key;
		dpobj.prlabel = getLiteral(Repo.props[key].label, uriToLiteral(key));
		dpobj.prefix = Repo.props[key].prefix;
		dpobj.value = firstUppercase(getLiteral(indiv.dataprops[key], uriToLiteral(key)));
		indinfo.literals.push(dpobj);
	}
	indinfo.literals = _.sortBy(indinfo.literals, function(el) { return el.prlabel.toLowerCase(); } );
	
	// direct props
	indinfo.objprops = [];
	_.each(_.keys(indiv.objprops), function(key) {
		var opobj = {};
		opobj.a = key;
		//opobj.pruri = key;
		opobj.prlabel = getLiteral(Repo.props[key].label, uriToLiteral(key));
		opobj.prefix = Repo.props[key].prefix;
		opobj.values = [];
		_.each(indiv.objprops[key], function(val) {
			var indobj = {};
			indobj.a = generateUrl("indiv", val); //"index.html?indiv="+encodeURIComponent(val);
			indobj.uri = val;
			indobj.label = firstUppercase(getLiteral(Repo.indivs[val].label, ""));
			if (indobj.label === "")
				indobj.label = val;
			//indobj.externo = Object.keys(Repo.indivs[val].label).length == 0 && Object.keys(Repo.indivs[val].comment).length == 0;				
			opobj.values.push(indobj);			
			// try to find url images
			var testurl = val.split(/[?#]/)[0];
			if (testurl.match(/\.(jpeg|JPEG|jpg|JPG|gif|GIF|png|PNG|svg|SVG)$/) != null)
				Urlimgs = _.union(Urlimgs, [val]);
		});
		// sort values
		opobj.values = _.sortBy(opobj.values, function(el) { return el.label.toLowerCase(); } );
		// show more button
		if (opobj.values.length > config.hidemax) {
			// include fake element for the button
			opobj.values.splice(config.hidebegin, 0, { "botonesconder" : true});
			for (var ind = config.hidebegin + 1; ind < opobj.values.length; ind++)
				opobj.values[ind].esconder = true;						
		}
		// add element
		indinfo.objprops.push(opobj);
	});
	indinfo.objprops = _.sortBy(indinfo.objprops, function(el) { return el.prlabel.toLowerCase(); } );
	
	// images
	if (Urlimgs.length > 0)
		indinfo.img = Urlimgs[0];
	
	// geo (only if Leaflet is configured and there is latitude and longitude data)
	if (config.geoenabled &&
		indiv.dataprops["http://www.w3.org/2003/01/geo/wgs84_pos#lat"] != undefined &&
		indiv.dataprops["http://www.w3.org/2003/01/geo/wgs84_pos#long"] != undefined &&
		config.geooptions != undefined && config.geooptions.accessToken != undefined && 
		config.geooptions.accessToken !== "") {
		indinfo.geo = {};
		indinfo.geo.lat = getLiteral(indiv.dataprops["http://www.w3.org/2003/01/geo/wgs84_pos#lat"]);
		indinfo.geo.long = getLiteral(indiv.dataprops["http://www.w3.org/2003/01/geo/wgs84_pos#long"]);
	}
	
	// inverse props
	indinfo.invprops = [];
	_.each(_.keys(indiv.invprops), function(key) {
		var ipobj = {};
		ipobj.a = key;		
		//ipobj.pruri = key;
		ipobj.prlabel = getLiteral(Repo.props[key].label, uriToLiteral(key));
		ipobj.prefix = Repo.props[key].prefix;
		ipobj.values = [];
		_.each(indiv.invprops[key], function(val) {
			var indobj = {};
			indobj.a = generateUrl("indiv", val); //"index.html?indiv="+encodeURIComponent(val);
			indobj.uri = val;
			indobj.label = firstUppercase(getLiteral(Repo.indivs[val].label, ""));
			if (indobj.label === "")
				indobj.label = val;
			//indobj.externo = Object.keys(Repo.indivs[val].label).length == 0 && Object.keys(Repo.indivs[val].comment).length == 0;				
			ipobj.values.push(indobj);
		});
		// sort
		ipobj.values = _.sortBy(ipobj.values, function(el) { return el.label.toLowerCase(); } );
		// show more button
		if (ipobj.values.length > config.hidemax) {
			// include fake element for the button
			ipobj.values.splice(config.hidebegin, 0, { "botonesconder" : true});
			for (var ind = config.hidebegin + 1; ind < ipobj.values.length; ind++)
				ipobj.values[ind].esconder = true;						
		}
		// add element
		indinfo.invprops.push(ipobj);
	});
	indinfo.invprops = _.sortBy(indinfo.invprops, function(el) { return el.prlabel.toLowerCase(); } );
			
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
			<div id="imageid"> \
				<img src="{{{img}}}" height="300" onerror="imageError(0);"> \
			</div> \
			{{#geo}} \
				<p><br></p> \
				<div id="mapid"></div> \
			{{/geo}} \
			{{#types.length}} \
				<h2>'+getLiteral(dict.types)+'</h2> \
				<div class="btn-group" role="group" aria-label="Types"> \
					{{#types}} \
						<a href="{{{a}}}" type="button" class="btn btn-info" >{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{label}}</a> \
					{{/types}} \
				</div> \
				<p><br></p> \
			{{/types.length}} \
			{{#literals.length}} \
				<h2>'+getLiteral(dict.literals)+'</h2> \
				<div class="panel-group"> \
					<div class="panel panel-default"> \
						<div class="panel-heading"> \
							<a data-toggle="collapse" href="#collapse_literals"> \
								<div class="row"> \
									<div class="col-xs-3">'+getLiteral(dict.property)+'</div> \
									<div class="col-xs-9"><span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span>'+getLiteral(dict.value)+'</div> \
								</div> \
							</a> \
						</div> \
						<div id="collapse_literals" class="panel-collapse collapse in"> \
							<ul class="list-group"> \
								{{#literals}} \
									<li class="list-group-item"> \
										<div class="row"> \
											<div class="col-sm-3"><a href="{{{a}}}" >{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{prlabel}}</a></div> \
											<div class="col-sm-9">{{value}}</div> \
										</div> \
									</li> \
								{{/literals}} \
							</ul> \
						</div> \
					</div> \
				</div> \
				<p><br></p> \
			{{/literals.length}} \
			{{#objprops.length}} \
				<h2>'+getLiteral(dict.outgoing)+'</h2> \
				<div class="panel-group"> \
					<div class="panel panel-success"> \
						<div class="panel-heading"> \
							<a data-toggle="collapse" href="#collapse_objps"> \
								<div class="row"> \
									<div class="col-xs-3">'+getLiteral(dict.property)+'</div> \
									<div class="col-xs-9"><span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span>'+getLiteral(dict.target)+'</div> \
								</div> \
							</a> \
						</div> \
						<div id="collapse_objps" class="panel-collapse collapse in"> \
							<ul class="list-group"> \
								{{#objprops}} \
									<li class="list-group-item"> \
										<div class="row"> \
											<div class="col-sm-3"><a href="{{{a}}}" >{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{{prlabel}}}</a></div> \
											<div class="col-sm-9"> \
												{{#values}} \
													{{#botonesconder}} \
														<button type="button" class="btn btn-default showmoreindivs">'+getLiteral(dict.showmore)+'</button> \
													{{/botonesconder}} \
													{{^botonesconder}} \
														<a href="{{{a}}}" class="list-group-item {{#esconder}}esconder{{/esconder}}" >{{label}}</a> \
													{{/botonesconder}} \
												{{/values}} \
											</div> \
										</div> \
									</li> \
								{{/objprops}} \
							</ul> \
						</div> \
					</div> \
				</div> \
				<p><br></p> \
			{{/objprops.length}} \
			{{#invprops.length}} \
				<h2>'+getLiteral(dict.incoming)+'</h2> \
				<div class="panel-group"> \
					<div class="panel panel-success"> \
						<div class="panel-heading"> \
							<a data-toggle="collapse" href="#collapse_iobjps"> \
								<div class="row"> \
									<div class="col-xs-3">'+getLiteral(dict.is)+' '+getLiteral(dict.property)+' '+getLiteral(dict.of)+'</div> \
									<div class="col-xs-9"><span class="glyphicon glyphicon-chevron-down pull-right" aria-hidden="true"></span>'+getLiteral(dict.source)+'</div> \
								</div> \
							</a> \
						</div> \
						<div id="collapse_iobjps" class="panel-collapse collapse in"> \
							<ul class="list-group"> \
								{{#invprops}} \
									<li class="list-group-item"> \
										<div class="row"> \
											<div class="col-sm-3">'+getLiteral(dict.is)+' <a href="{{{a}}}" >{{#prefix}}<small>{{prefix}}:</small>{{/prefix}}{{{prlabel}}}</a> '+getLiteral(dict.of)+'</div> \
											<div class="col-sm-9"> \
												{{#values}} \
													{{#botonesconder}} \
														<button type="button" class="btn btn-default showmoreindivs">'+getLiteral(dict.showmore)+'</button> \
													{{/botonesconder}} \
													{{^botonesconder}} \
														<a href="{{{a}}}" class="list-group-item {{#esconder}}esconder{{/esconder}}" >{{label}}</a> \
													{{/botonesconder}} \
												{{/values}} \
											</div> \
										</div> \
									</li> \
								{{/invprops}} \
							</ul> \
						</div> \
					</div> \
				</div> \
			{{/invprops.length}} \
		</div>';
	
	// generate the mark-up
	var content = Mustache.render(template, indinfo);
	
	// pongo el contenido
	$("#contenedor").html(content);
	
	// ajuste de los chevrons
	$("a[data-toggle='collapse']").click(function() {
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
	
	// listen to showmoreindivs clicks
	$(".showmoreindivs").click(function() {
		// show elements
		$(this).siblings().removeClass("esconder");		
		// remove show more indivs button
		$(this).remove();
	});
	
	// geo
	if (indinfo.geo != undefined) {
		var mymap = L.map('mapid').setView([indinfo.geo.lat, indinfo.geo.long], 5);	
		L.tileLayer(config.geotemplate, config.geooptions).addTo(mymap);
		var marker = L.marker([indinfo.geo.lat, indinfo.geo.long]).addTo(mymap);
	}
	
	// report loaded event and timings
	endReport();
	sendEvent("loaded");
	sendElapsedTiming();
	sendNqueriesTiming();

	// SAVE REPOSITORIES
	saveRepos();	
}

function imageError(inderror) {
	// image failed, try with the following one
	var newind = inderror + 1;
	if (newind < Urlimgs.length) {
		var content = '<img src="'+Urlimgs[newind]+'" height="300" onerror="imageError('+newind+');">';
		$("#imageid").html(content);
	}
	else // no more images available!
		$("#imageid").html("");
}