var Promise = require('bluebird')
var fs = require('fs')
Promise.promisifyAll(fs);

var _ = require('lodash')
var turf = require('turf')
var geoJson = require('./input/Admin_0_Polygons.json')
var proj4 = require('proj4');
var reproject = require('reproject')
var geojson2svg = require('geojson2svg');


var dir = './output';

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}


    // create a million small geojsons. this makes oure operations
    // trivially parallelizable

    // TODO: only do this for like, 3 of them.
var testingFeatures = geoJson.features;
var miniGeoJsons = testingFeatures.map(function(feature) {
  return {
    type: geoJson.type,
    crs: _.cloneDeep(geoJson.crs),
    features: [feature]
  }
})



var reprojectedGeoJsons = miniGeoJsons.map(function(geoJson, index) {
  // get centroid for geometry.
  var center = turf.center(geoJson).geometry.coordinates

  // add entry to our defs
  // create name
  var projectionName = geoJson.features[0].properties.Name
  var projectionDefinition = createDefString(center[0], center[1])
  proj4.defs(projectionName, projectionDefinition)

  // attempt to reproject it
  var HAIL_MARY = 'EPSG:4326'
  var reprojectedGeoJson = reproject.reproject(geoJson, HAIL_MARY, projectionName, proj4.defs)
  var name = geoJson.features[0].properties.Name;
  fs.writeFileSync('output/' + name + '.json', JSON.stringify(reprojectedGeoJson));
  return reprojectedGeoJson
})

reprojectedGeoJsons.forEach(function(geoJson, index) {
  var name = geoJson.features[0].properties.Name;

  var extent = turf.bbox(geoJson.features[0]);
  var options = {
    // viewportSize: {width: 200, height: 100},
    mapExtent: {
      left: extent[0],bottom: extent[1],right: extent[2],top: extent[3]
    },
    output: 'svg',
    attributes: {
      'fill': "#52732E",
      'id': name,
      "transform": "translate(5,5)"
    }
  };

  var converter = geojson2svg(options);
  var path = converter.convert(geoJson);

  var svg = '<svg xmlns="http://www.w3.org/2000/svg">' + path;
  options.attributes.transform = "translate(0,0)";
  options.attributes.id = "offset";
  options.attributes.fill = "#73A041"
  var converter = geojson2svg(options);
  var path = converter.convert(geoJson);

  svg += path;

  svg += '</svg>'

  fs.writeFileSync('output/' + geoJson.features[0].properties.Name + '.svg', svg);
})

function createDefString(longitude, latitude) {
    // +proj=aeqd +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs 
    return '+proj=aeqd +lat_0=' + latitude + ' +lon_0= ' + longitude + ' +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';
}
