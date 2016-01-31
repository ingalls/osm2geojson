var osmium = require('osmium');
var path = require('path');
var stream = require('stream');

module.exports = osm2geojson;

function osm2geojson(filepath, options) {
  var file = new osmium.File(path.resolve(filepath));
  var locator = new osmium.LocationHandler();
  var osmiumStream = new osmium.Stream(new osmium.Reader(file, locator));
  var toGeoJSON = new stream.Transform({ objectMode: true});
  options = options || {};

  toGeoJSON._transform = function(osm, enc, callback) {
    if (osm.type === 'relation') return callback();

    var type = osm.type;
    if (type === 'area') type = osm.from_way ? 'way' : 'relation';

    var feature = {
      type: 'Feature',
      id: [type, osm.id, osm.version].join('!'),
      properties: osm.tags()
    };

    ['type', 'id', 'version', 'changeset', 'timestamp', 'user', 'uid']
      .forEach(function(key) {
        feature.properties['osm:' + key] = key === 'type' ? type : osm[key];
      });

    try {
      feature.geometry = osm.geojson();
    }
    catch (err) {
      err.osmId = feature.id;
      err.message = feature.id + ' | ' + err.message;

      if (options.failEvents) {
        toGeoJSON.emit('fail', err);
        return callback();
      }
      
      return callback(err);
    }

    callback(null, feature);
  };

  return osmiumStream.pipe(toGeoJSON);
}
