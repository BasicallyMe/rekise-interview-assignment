import Vector from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import {bbox} from 'ol/loadingstrategy.js';

const vectorSource = new Vector({
  format: new GeoJSON(),
  loader: function(extent, resolution, projection, success, failure) {
     const proj = projection.getCode();
     const url = 'https://ahocevar.com/geoserver/wfs?service=WFS&' +
         'version=1.1.0&request=GetFeature&typename=osm:water_areas&' +
         'outputFormat=application/json&srsname=' + proj + '&' +
         'bbox=' + extent.join(',') + ',' + proj;
     const xhr = new XMLHttpRequest();
     xhr.open('GET', url);
     const onError = function() {
       vectorSource.removeLoadedExtent(extent);
       failure();
     }
     xhr.onerror = onError;
     xhr.onload = function() {
       if (xhr.status == 200) {
         const features = vectorSource.getFormat().readFeatures(xhr.responseText);
         vectorSource.addFeatures(features);
         success(features);
       } else {
         onError();
       }
     }
     xhr.send();
   },
   strategy: bbox,
 });

export default vectorSource;