RDF Surveyor
==========
RDF Surveyor is an easy-to-use exploration tool of semantic datasets. It can be plugged in any CORS-enabled SPARQL 1.1 endpoint without requiring any installation.

These are some of the features of RDF Surveyor:

* Intuitive user interface that completely hides the RDF/SPARQL syntax

* It gives an overview of the repository contents, supports class navigation and individual visualization

* No installation required for exploring any RDF dataset

* Works with large datasets such as DBpedia

* Prepared to work with multilingual datasets

* The UI adapts to mobile devices

* RESTful design


Usage
==========
RDF Surveyor is a web application developed in Javascript. You can easily deploy it in your web server or just try RDF Surveyor on [http://tools.sirius-labs.no/rdfsurveyor](http://tools.sirius-labs.no/rdfsurveyor)

To begin the exploration of a repository, you only need to copy the URI of the target SPARQL endpoint (and optionally the URI of the named graph). You can also import the URIs of some well-known repositories such as DBpedia with the "Import configuration" button.


Screenshots
==========
Some screenshots of RDF Surveyor:

![screenshot](/screenshots/config.png "Config")

![screenshot](/screenshots/namespaces.png "Namespaces")

![screenshot](/screenshots/upper.png "Upper classes")

![screenshot](/screenshots/artwork.png "Artwork class")

![screenshot](/screenshots/painting0.png "The Surrender of Breda individual (1)")

![screenshot](/screenshots/painting1.png "The Surrender of Breda individual (2)")

![screenshot](/screenshots/oslo.png "Oslo")


Configuration
==========
You can edit the parameters of the configuration file at `etc/data/config.js`:

* `pagesize`: number of elements per page (default 10)

* `hidemax`: maximum number of elements to show in a list before including a *show more* button (default 8)

* `hidebegin`: element index to begin hiding (default 5)

* `repos`: preloaded configuration of repositories. Echa element should have a name, an endpoint URI, and optionally a named graph URI

* `geoenabled`: if true, RDF Surveyor will try to find geographic coordinates for individuals and show a map widget provided by [Leaflet](http://leafletjs.com/). 

* `geooptions`: the map widget provided by [Leaflet](http://leafletjs.com/) requires your own `accessToken`

* `gaenabled`: if true, RDF Surveyor will log events (requested resource, latency, and number of SPARQL queries) through [Google Analytics](https://www.google.com/analytics/)

* `gaproperty`: you have to provide your own property in order to log Google Analytics events




