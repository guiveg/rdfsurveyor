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

/*******************
*** QUERIES FILE ***
********************/

// query prefixes
var queryPrefixes = {
	'owl': 'http://www.w3.org/2002/07/owl#', 
	'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 
	'xml': 'http://www.w3.org/XML/1998/namespace', 
	'xsd': 'http://www.w3.org/2001/XMLSchema#', 
	'rdfs': 'http://www.w3.org/2000/01/rdf-schema#', 
	'foaf': 'http://xmlns.com/foaf/0.1/', 
	'skos': 'http://www.w3.org/2004/02/skos/core#', 
	'dc': 'http://purl.org/dc/elements/1.1/',
	'dct': 'http://purl.org/dc/terms/',
	'yago': 'http://dbpedia.org/class/yago/',
	'dbo': 'http://dbpedia.org/ontology/',
	'dbp': 'http://dbpedia.org/property/',
	'prov': 'http://www.w3.org/ns/prov#',
	'bibo': 'http://purl.org/ontology/bibo/',
	'freebase': 'http://rdf.freebase.com/ns/',
	'geo': 'http://www.w3.org/2003/01/geo/wgs84_pos#',
	'geodata': 'http://sws.geonames.org/',
	'georss': 'http://www.georss.org/georss/',	
	'geonames': 'http://www.geonames.org/ontology#',
	'lod': 'http://lod.openlinksw.com/',
	'obo': 'http://www.geneontology.org/formats/oboInOwl#',
	'opencyc': 'http://sw.opencyc.org/concept/',
	'ore': 'http://www.openarchives.org/ore/terms/',
	'schema': 'http://schema.org/',
	'umbel': 'http://umbel.org/umbel#',
	'umbel-ac': 'http://umbel.org/umbel/ac/',
	'umbel-rc': 'http://umbel.org/umbel/rc/',
	'umbel-sc': 'http://umbel.org/umbel/sc/',
	'void': 'http://rdfs.org/ns/void#',
	'wikidata': 'http://www.wikidata.org/entity/',
	'dul': 'http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#'
	};

// query array with all the queries
var queries = [];

// test endpoint
queries.push({'name': 'test',
	'query': 'SELECT * \n \
WHERE { \n \
	?s ?p ?o . \n \
} LIMIT 1'
});

// get upper classes of the triplestore
queries.push({'name': 'upperclasses',
	'prefixes': ['rdfs'],
	'query': 'SELECT DISTINCT ?class \n \
WHERE { \n \
[] rdfs:subClassOf ?class . \n \
filter not exists { \n \
  ?class rdfs:subClassOf ?super . \n \
  filter ( ?super != ?class ) \n \
} \n \
}'
});

// get isolated classes of the triplestore
queries.push({'name': 'isolatedclasses',
	'prefixes': ['rdfs'],
	'query': 'SELECT DISTINCT ?class \n \
WHERE { \n \
[] a ?class . \n \
filter not exists { \n \
  ?class rdfs:subClassOf ?super . \n \
  filter ( ?super != ?class ) \n \
} \n \
filter not exists { \n \
  ?sub rdfs:subClassOf ?class . \n \
  filter ( ?sub != ?class ) \n \
} \n \
}'
});

// get upper subclasses of a namespace
queries.push({'name': 'uppersubclassesns',
	'prefixes': ['rdfs'],
	'query': 'SELECT DISTINCT ?class \n \
WHERE { \n \
?class rdfs:subClassOf ?super . \n \
filter (STRSTARTS(STR(?super), "{{{ns}}}")) \n \
filter (!STRSTARTS(STR(?class), "{{{ns}}}")) \n \
}'
});

// get direct superclasses of a class (even with class inferences)
queries.push({'name': 'directsuperclasses',
	'prefixes': ['rdfs'],
	'query': 'SELECT distinct ?super \n \
WHERE { \n \
<{{{uri}}}> rdfs:subClassOf ?super . \n \
filter not exists { \n \
  <{{{uri}}}> rdfs:subClassOf ?osuper . \n \
  ?osuper rdfs:subClassOf ?super . \n \
  filter ( ?osuper != <{{{uri}}}> ) \n \
  filter ( ?osuper != ?super ) \n \
} \n \
  filter ( ?super != <{{{uri}}}> ) \n \
}'
});

// get direct subclasses of a class (even with class inferences)
queries.push({'name': 'directsubclasses',
	'prefixes': ['rdfs'],
	'query': 'SELECT distinct ?sub \n \
WHERE { \n \
?sub rdfs:subClassOf <{{{uri}}}> . \n \
filter not exists { \n \
  ?osub rdfs:subClassOf <{{{uri}}}> . \n \
  ?sub rdfs:subClassOf ?osub . \n \
  filter ( ?osub != <{{{uri}}}> ) \n \
  filter ( ?osub != ?sub ) \n \
} \n \
  filter ( ?sub != <{{{uri}}}> ) \n \
}'
});

// get classes with more than 1K individuales
queries.push({'name': 'thousandindivs',
	'prefixes': [],
	'query': 'SELECT ?class \n \
WHERE { \n \
?indiv a ?class . \n \
FILTER (?class IN ( {{{furis}}} )) \n \
} \n \
GROUP BY ?class \n \
HAVING (COUNT(?indiv) > 1000)'
});

// count individuals of a list of classes
queries.push({'name': 'countindivs',
	'prefixes': [],
	'query': 'SELECT ?class (COUNT(DISTINCT ?indiv) as ?count) \n \
WHERE { \n \
?indiv a ?class . \n \
FILTER (?class IN ( {{{furis}}} )) \n \
} \n \
GROUP BY ?class'
});

// get individuals of a class
queries.push({'name': 'indivs',
	'prefixes': [],
	'query': 'SELECT DISTINCT ?indiv  \n \
WHERE { \n \
?indiv a <{{{uri}}}> . \n \
} LIMIT {{limit}} \n \
OFFSET {{offset}}'
});

// get direct types of an individual
queries.push({'name': 'types',
	'prefixes': [],
	'query': 'SELECT DISTINCT ?type  \n \
WHERE { \n \
<{{{uri}}}> a ?type . \n \
}'
});

// get object and datatype properties of an individual
queries.push({'name': 'dirprops',
	'prefixes': ['rdf', 'rdfs'],
	'query': 'SELECT DISTINCT ?prop ?obj \n \
WHERE { \n \
<{{{uri}}}> ?prop ?obj . \n \
FILTER (?prop != rdf:type) \n \
FILTER (?prop != rdfs:label) \n \
FILTER (?prop != rdfs:comment) \n \
}'
});

// get inverse object type properties of an individual (max 200)
queries.push({'name': 'invprops',
	'prefixes': [],
	'query': 'SELECT DISTINCT ?prop ?sbj \n \
WHERE { \n \
?sbj ?prop <{{{uri}}}> . \n \
} LIMIT 200'
});

// get labels
queries.push({'name': 'label',
	'prefixes': ['rdfs'],
	'query': 'SELECT DISTINCT ?uri ?label \n \
WHERE { \n \
?uri rdfs:label ?label . \n \
FILTER (?uri IN ( {{{furis}}} )) }'
});

// get comments
queries.push({'name': 'comment',
	'prefixes': ['rdfs'],
	'query': 'SELECT DISTINCT ?uri ?comment \n \
WHERE { \n \
?uri rdfs:comment ?comment . \n \
FILTER (?uri IN ( {{{furis}}} )) }'
});

// find classes with label...
queries.push({'name': 'findclasses',
	'prefixes': ['rdfs'],
	'query': 'SELECT DISTINCT ?uri \n \
WHERE { \n \
?uri rdfs:subClassOf [] ; \n \
	rdfs:label ?lab . \n \
FILTER (regex(?lab, "{{input}}","i" )) }'
});

// find indivs with label...
queries.push({'name': 'findindivs',
	'prefixes': ['rdfs'],
	'query': 'SELECT DISTINCT ?uri \n \
WHERE { \n \
{ \
  ?uri a [] ; \n \
	rdfs:label ?lab . \n \
  FILTER (regex(?lab, "{{input}}","i" )) \n \
} \n \
UNION \n \
{ \n \
  ?uri a [] . \n \
  filter not exists { \n \
    ?uri rdfs:label ?lab . \n \
  } \n \
  FILTER (regex(STR(?uri), "{{input}}","i" )) \n \
} \n \
} LIMIT {{limit}} \n \
OFFSET {{offset}}'
});

// count individuals of a search
queries.push({'name': 'countfindindivs',
	'prefixes': ['rdfs'],
	'query': 'SELECT (COUNT(DISTINCT ?uri) as ?count) \n \
WHERE { \n \
{ \
  ?uri a [] ; \n \
	rdfs:label ?lab . \n \
  FILTER (regex(?lab, "{{input}}","i" )) \n \
} \n \
UNION \n \
{ \n \
  ?uri a [] . \n \
  filter not exists { \n \
    ?uri rdfs:label ?lab . \n \
  } \n \
  FILTER (regex(STR(?uri), "{{input}}","i" )) \n \
} \n \
}'
});

// find indivs of a class with label...
queries.push({'name': 'findindivsclass',
	'prefixes': ['rdfs'],
	'query': 'SELECT DISTINCT ?indiv \n \
WHERE { \n \
{ \
  ?indiv a <{{{uri}}}> ; \n \
	rdfs:label ?lab . \n \
  FILTER (regex(?lab, "{{input}}","i" )) \n \
} \n \
UNION \n \
{ \n \
  ?indiv a <{{{uri}}}> . \n \
  filter not exists { \n \
    ?indiv rdfs:label ?lab . \n \
  } \n \
  FILTER (regex(STR(?indiv), "{{input}}","i" )) \n \
} \n \
} LIMIT {{limit}} \n \
OFFSET {{offset}}'
});

// count individuals of a class search
queries.push({'name': 'countfindindivsclass',
	'prefixes': ['rdfs'],
	'query': 'SELECT (COUNT(DISTINCT ?uri) as ?count) \n \
WHERE { \n \
{ \
  ?uri a <{{{uri}}}> ; \n \
	rdfs:label ?lab . \n \
  FILTER (regex(?lab, "{{input}}","i" )) \n \
} \n \
UNION \n \
{ \n \
  ?uri a <{{{uri}}}> . \n \
  filter not exists { \n \
    ?uri rdfs:label ?lab . \n \
  } \n \
  FILTER (regex(STR(?uri), "{{input}}","i" )) \n \
} \n \
}'
});