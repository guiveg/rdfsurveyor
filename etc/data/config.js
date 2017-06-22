var config = {
	// limits
	pagesize: 10,
	// lang
	nolang: "nolang",
	// hide elements list
	hidemax: 8,
	hidebegin: 5,	
	
	// repository configurations
	repos: [
		{ "name": "DBpedia", "endpoint": "http://dbpedia.org/sparql", "graph": "http://dbpedia.org"},
		{ "name": "Linked Geo Data", "endpoint": "http://linkedgeodata.org/sparql"},
		{ "name": "Semantic Web Dog Food Corpus", "endpoint": "http://data.semanticweb.org/sparql"},
		{ "name": "Transparency International Linked Data", "endpoint": "http://transparency.270a.info/sparql"},
		{ "name": "Nobel Prizes", "endpoint": "http://data.nobelprize.org/sparql"}
	],
	
	// geo widget - Leaflet: http://leafletjs.com/
	geoenabled: false, // activate if needed
	geotemplate: 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
	geooptions: {
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
		maxZoom: 18,
		id: 'mapbox.streets',
		accessToken: '' // include your own token
	},
	
	// google analytics
	gaenabled: false, // activate if needed
	gaproperty: '' // include your own property
};
