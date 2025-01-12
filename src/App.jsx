import { useState, useRef, useEffect } from "react";
import { Map, View, Feature } from "ol";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import Draw from "ol/interaction/Draw";
import VectorSource from "ol/source/Vector";
import { Point, LineString } from "ol/geom";
import { Style, Fill, Stroke, Circle as CircleStyle } from "ol/style";
import {
  X,
  Upload,
  EllipsisVertical,
  ArrowLeftToLine,
  ArrowRightToLine,
} from "lucide-react";
import { fromLonLat, transform } from "ol/proj";
import { getLength } from "ol/sphere";
import "ol/ol.css";
import "./App.css";

function App() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [coordinates, setCoordinates] = useState([]);
  const vectorSourceRef = useRef(new VectorSource());
  const drawRef = useRef(null);

  useEffect(() => {
    const tileLayer = new TileLayer({
      source: new OSM(),
    });

    const styles = {
      line: new Style({
        stroke: new Stroke({ color: "blue", width: 1 }),
        fill: new Fill({ color: "rgba(0, 0, 255, 0.1)" }),
      }),
      vertex: new Style({
        image: new CircleStyle({
          radius: 2,
          stroke: new Stroke({ color: "black", width: 1 }),
        }),
      }),
    };

    const styleFunction = function (feature) {
      const geometry = feature.getGeometry();
      const styles_array = [styles.line];

      if (geometry instanceof LineString) {
        geometry.getCoordinates().forEach((coord) => {
          styles_array.push(
            new Style({
              geometry: new Point(coord),
              image: new CircleStyle({
                radius: 2,
                stroke: new Stroke({ color: "black", width: 1 }),
              }),
            })
          );
        });
      }
      return styles_array;
    };

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: styleFunction,
    });

    const mapInstance = new Map({
      target: mapRef.current,
      layers: [tileLayer, vectorLayer],
      controls: [],
      view: new View({
        center: fromLonLat([77.6359508, 12.9782619]),
        zoom: 15,
      }),
    });
    setMap(mapInstance);

    return () => mapInstance.setTarget(null);
  }, []);

  const calculateDistance = (c1, c2) => {
    const line = new LineString([c1, c2]);
    return getLength(line);
  };

  const startDrawing = () => {
    if (!map) return;

    setIsDrawing(true);

    if (drawRef.current) {
      map.removeInteraction(drawRef.current);
    }

    const draw = new Draw({
      source: vectorSourceRef.current,
      type: "LineString",
      style: new Style({
        stroke: new Stroke({ color: "blue", width: 1 }),
        image: new CircleStyle({
          radius: 2,
          fill: new Fill({ color: "black" }),
        }),
      }),
    });

    draw.on("drawstart", () => {
      setCoordinates([]);
    });

    draw.on("drawend", (event) => {
      const geometry = event.feature.getGeometry();
      const coords = geometry.getCoordinates();

      // Transform coordinates and calculate distances
      const transformedCoords = coords.map((coord, index) => {
        const lonLat = transform(coord, "EPSG:3857", "EPSG:4326");
        return {
          id: coordinates.length + index, // Update ID to continue from last index
          coordinates: lonLat,
          distance:
            index > 0 ? calculateDistance(coords[index - 1], coords[index]) : 0,
        };
      });

      // Append new coordinates to existing ones
      setCoordinates((prevCoordinates) => [
        ...prevCoordinates,
        ...transformedCoords,
      ]);
      drawRef.current = null;
      map.removeInteraction(draw);
    });

    const handleKeyPress = (e) => {
      if (e.key === "Enter" && draw) {
        e.preventDefault();
        draw.finishDrawing();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    map.addInteraction(draw);
    drawRef.current = draw;

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      if (map && draw) {
        map.removeInteraction(draw);
      }
    };
  };

  return (
    <div ref={mapRef} className="container">
      <div className="overlay">
        {isDrawing ? (
          <MissionModal coordinates={coordinates} />
        ) : (
          <button className="btn" onClick={startDrawing}>
            Start
          </button>
        )}
      </div>
    </div>
  );
}

function MissionModal(props) {
  const { coordinates } = props;

  useEffect(() => {
    console.log(coordinates);
  }, [coordinates]);

  return (
    <div className="mission-modal">
      <div className="modal-header">
        <h2>Mission Creation</h2>
        <button className="action-btn">
          <X size={15} />
        </button>
      </div>
      <div className="modal-body">
        {coordinates.length === 0 ? (
          <h3>Waypoint Navigation</h3>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>
                  <input type="checkbox" />
                </th>
                <th>WP</th>
                <th>Coordinates</th>
                <th>{`Distance (m)`}</th>
                <th>
                  <Upload size={15} />
                </th>
              </tr>
            </thead>
            <tbody>
              {coordinates.map((coord, index) => (
                <TableRow coord={coord} key={index} />
              ))}
            </tbody>
          </table>
        )}
        <div className="instructions-block">
          <p>
            Click on the map to mark points of the route and then press{" "}
            <span>&#8629;</span> to complete the route.
          </p>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn">Generate Data</button>
      </div>
    </div>
  );
}

function TableRow({ coord, key }) {
  const [showActions, setShowActions] = useState(false);
  return (
    <>
      {showActions && (
        <div className="actions-popup">
          <button className="btn">
            <ArrowLeftToLine size={15} /> Insert Polygon before
          </button>
          <button className="btn">
            <ArrowRightToLine size={15} /> Insert Polygon after
          </button>
        </div>
      )}
      <tr key={key}>
        <td></td>
        <td>
          <input type="checkbox" />
        </td>
        <td>{`${String(coord.id).padStart(2, "0")}`}</td>
        <td>{`${coord.coordinates[1]}, ${coord.coordinates[0]}`}</td>
        <td>{coord.distance === 0 ? "--" : coord.distance.toFixed(1)}</td>
        <td>
          <button className="action-btn" onClick={() => setShowActions((prev) => !prev)}>
            <EllipsisVertical size={15} />
          </button>
        </td>
      </tr>
    </>
  );
}

export default App;
