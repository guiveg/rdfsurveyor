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

// Report is global and unique (only one Report at a time)
Report = undefined;
	
function createReport(cat, label) {
	Report = {};
	Report.cat = cat;
	Report.label = label;
	Report.nqueries = 0;
	Report.init = Date.now(); // timestamp in milliseconds
}

function newQueryReport() {
	if (Report != undefined)
		Report.nqueries++;
}

function endReport() {
	if (Report != undefined && Report.end == undefined)
		Report.end = Date.now(); // timestamp in milliseconds 
}

function sendEvent(action) {
	if (Report != undefined) {
		// Google analytics case
		if (config.gaenabled && config.gaproperty != undefined) {
			ga('send', 'event', Report.cat, action, Report.label);
		}
		// show log message in the console
		console.log(Report.cat + " | " + action + " | " + Report.label);
	}
}

function sendElapsedTiming() {	
	if (Report != undefined && Report.end != undefined) {
		// calculate time elapsed
		var elapsed = Report.end - Report.init;
		// Google analytics case
		if (config.gaenabled && config.gaproperty != undefined) {
			ga('send', 'timing', Report.cat, 'latency', elapsed, Report.label + ' (nqueries: '+Report.nqueries+')');
		}
		// show log message in the console
		console.log(Report.cat + " | latency: " + elapsed + " | " + Report.label + ' (nqueries: '+Report.nqueries+')');
	}
}

function sendNqueriesTiming() {	
	if (Report != undefined) {
		// Google analytics case
		if (config.gaenabled && config.gaproperty != undefined) {
			ga('send', 'timing', Report.cat, 'nqueries', Report.nqueries, Report.label);
		}
		// show log message in the console
		console.log(Report.cat + " | nqueries: " + Report.nqueries + " | " + Report.label);
	}
}