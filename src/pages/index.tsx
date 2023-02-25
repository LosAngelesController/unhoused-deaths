import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, createRef } from "react";
import Slider from "rc-slider";
import { titleCase } from "title-case";

import { computeclosestcoordsfromevent } from "../components/getclosestcoordsfromevent";
import { CloseButton } from "../components/CloseButton";
import { signintrack, uploadMapboxTrack } from "../components/mapboxtrack";
import TooltipSlider, { handleRender } from "../components/TooltipSlider";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import MapboxLanguage from "@mapbox/mapbox-gl-language";
import Nav from "../components/nav";
//import { CloseButton } from "@/components/CloseButton";
import { MantineProvider, Checkbox } from "@mantine/core";
import React, { useEffect, useState, useRef } from "react";
import { initializeApp } from "firebase/app";

import Icon from "@mdi/react";
import { mdiPlay } from "@mdi/js";
import { mdiPause, mdiSkipNext, mdiSkipPrevious } from "@mdi/js";

import CouncilDist from "./CouncilDistricts.json";
import { auth, signInWithGoogle, signOutOfApp } from "./../components/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const councildistricts = require("./CouncilDistricts.json");
const citybounds = require("./citybounds.json");
// @ts-ignore: Unreachable code error
import * as turf from "@turf/turf";
import { datadogRum } from "@datadog/browser-rum";

// added the following 6 lines.
import mapboxgl from "mapbox-gl";

import { assertDeclareExportAllDeclaration } from "@babel/types";

import { GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
import { Set } from "typescript";

function isTouchScreen() {
  return window.matchMedia("(hover: none)").matches;
}

var cacheofcdsfromnames: any = {};

function getLang() {
  if (navigator.languages != undefined) return navigator.languages[0];
  return navigator.language;
}

var councilareasdistrict: any = {
  "1": 39172374.513557486,
  "2": 56028687.75752604,
  "3": 91323827.86998883,
  "4": 127051659.05853269,
  "5": 85492955.75895034,
  "6": 70583244.58359845,
  "7": 140330608.52718654,
  "8": 41642747.81303825,
  "9": 33854278.76005373,
  "10": 38455731.29742687,
  "11": 165241605.83628467,
  "12": 149947134.17462063,
  "13": 42095086.21254906,
  "14": 63974277.0096737,
  "15": 83429528.39743595,
};

var councilpopulations: any = {
  "1": 248124,
  "2": 250535,
  "3": 257098,
  "4": 269290,
  "5": 269182,
  "6": 261114,
  "7": 266276,
  "8": 257597,
  "9": 255988,
  "10": 270703,
  "11": 270691,
  "12": 259564,
  "13": 252909,
  "14": 264741,
  "15": 258310,
};

const councilcount: any = {
  "1":	152,
  "2":	49,
  "3":	35,
  "4":	41,
  '5':57,
  '6':84,
  '7':44,
  '8':55,
  '9':60,
  '10':	45,
  '11':	48,
  '12':	28,
  "13":	84,
  "14":	323,
  "15":	62
  
};

const filterableraces: any = {
  "AMERICAN INDIAN":	3,
"ARMENIAN":	1,
"ASIAN":	8,
"BLACK":	355,
"CAUCASIAN":	348,
"EAST INDIAN":	1,
"FILIPINO":	5,
"HAWAIIAN":	3,
"HISPANIC/LATIN AMERICAN"	:422,
"KOREAN":	1,
"MIDDLE EASTERN":	6,
"PACIFIC ISLANDER"	:1,
"UNKNOWN":	12,
"VIETNAMESE" :1,
}

const createdbycount: any = {
  BOE: 1,
  BSS: 73,
  "Council's Office": 2142,
  ITA: 2978,
  LASAN: 5518,
  "Proactive Insert": 3,
  "Self Service": 46007,
  "Self Service_SAN": 1509,
};

const Home: NextPage = () => {
  var councilBounds: any = {
    features: CouncilDist.features,
    type: "FeatureCollection",
  };

  const calculateifboxisvisible = () => {
    if (typeof window != "undefined") {
      return window.innerWidth > 640;
    } else {
      return true;
    }
  };

  const calculateIntensityCoefficient = () => {
    const monthdomain = sliderMonth[1] - sliderMonth[0];

    if (monthdomain === 0) {
      return 12;
    } else {
      const coefficient = 12 / monthdomain;

      return coefficient;
    }
  };

  const listofcreatedbyoptions = [
    "Self Service",
    "LASAN",
    "Council's Office",
    "Self Service_SAN",
    "ITA",
    "BSS",
    "Proactive Insert",
    "BOE",
  ];

  const listofcouncildists = Array.from({ length: 15 }, (_, i) => i + 1).map(
    (eachItem) => String(eachItem)
  );

  const [createdby, setcreatedby] = useState<string[]>(listofcreatedbyoptions);
  const [filteredcouncildistricts, setfilteredcouncildistricts] =
    useState<string[]>(listofcouncildists);

  const shouldfilteropeninit =
    typeof window != "undefined" ? window.innerWidth >= 640 : false;
  const [showtotalarea, setshowtotalarea] = useState(false);
  let [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const touchref = useRef<any>(null);
  const isLoggedInRef = useRef(false);
  let [housingaddyopen, sethousingaddyopen] = useState(false);
  var mapref: any = useRef(null);
  const okaydeletepoints: any = useRef(null);
  var [metric, setmetric] = useState(false);
  const [showInitInstructions, setshowInitInstructions] = useState(true);
  const [doneloadingmap, setdoneloadingmap] = useState(false);
  const [sliderMonth, setsliderMonthAct] = useState<any>([1, 12]);
  const [selectedfilteropened, setselectedfilteropened] = useState("race");
  const [deletemaxoccu, setdeletemaxoccu] = useState(false);
  const [datasetloaded, setdatasetloaded] = useState(false);
  const refismaploaded = useRef(false);
  const [sheltersperdist, setsheltersperdist] = useState<any>({});
  const [filteredraces, setfilteredraces] = useState<string[]>(Object.entries(filterableraces).map((eachrace)=>eachrace[0]));
  const [totalbedsperdist, settotalbedsperdist] = useState<any>({});
  const [bedsavailableperdist, setbedsavailableperdist] = useState<any>({});
  const [filterpanelopened, setfilterpanelopened] =
    useState(shouldfilteropeninit);

  const [mapboxloaded, setmapboxloaded] = useState(false);

  const setfilteredcouncildistrictspre = (input: string[]) => {
    console.log("inputvalidator", input);
    if (input.length === 0) {
      setfilteredcouncildistricts(["99999"]);
    } else {
      setfilteredcouncildistricts(input);
    }
  };

  const sheltersperdistcompute = (data: any) => {
    const sheltersperdist: any = {};

    const locationcountperdist: any = {};

    data.rows.forEach((eachrow: any) => {
      if (typeof sheltersperdist[eachrow.cd] === "undefined") {
        sheltersperdist[eachrow.cd] = new Set();
      }

      sheltersperdist[eachrow.cd].add(String(eachrow.address));
    });

    Object.entries(sheltersperdist).forEach(
      ([cdnumber, shelterset]: [string, any]) => {
        locationcountperdist[cdnumber] = shelterset.size;
      }
    );

    setsheltersperdist(locationcountperdist);

    const shelterbedstotal = data.rows.reduce((acc: any, obj: any) => {
      const key = String(obj.cd);

      if (!acc[key]) {
        acc[key] = obj.total_beds;
      }
      acc[key] = acc[key] + obj.total_beds;

      return acc;
    }, {});

    settotalbedsperdist(shelterbedstotal);

    const shelterbedsavaliable = data.rows.reduce((acc: any, obj: any) => {
      const key = String(obj.cd);

      if (!acc[key]) {
        acc[key] = obj.beds_available;
      }
      acc[key] = acc[key] + obj.beds_available;

      return acc;
    }, {});

    setbedsavailableperdist(shelterbedsavaliable);
  };

  const [shelterselected, setshelterselected] = useState<any>(null);

  const [user, loading, error] = useAuthState(auth);

  const datadogconfig: any = {
    applicationId: "54ed9846-68b0-4811-a47a-7330cf1828a0",
    clientToken: "pub428d48e3143310cf6a9dd00003773f12",
    site: "datadoghq.com",
    service: "beds",
    env: "prod",
    // Specify a version number to identify the deployed version of your application in Datadog
    // version: '1.0.0',

    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "allow",
  };

  datadogRum.init(datadogconfig);

  datadogRum.startSessionReplayRecording();

  const setsliderMonth = (event: Event, newValue: number | number[]) => {
    setsliderMonthAct(newValue as number[]);
  };

  const setsliderMonthVerTwo = (input: any) => {
    console.log(input);
    setsliderMonthAct(input);
  };

  function turfify(polygon: any) {
    var turffedpolygon;

    console.log("polygon on line 100", polygon);

    if (polygon.geometry.type == "Polygon") {
      turffedpolygon = turf.polygon(polygon.geometry.coordinates);
    } else {
      turffedpolygon = turf.multiPolygon(polygon.geometry.coordinates);
    }

    return turffedpolygon;
  }

  function polygonInWhichCd(polygon: any) {
    if (typeof polygon.properties.name === "string") {
      if (cacheofcdsfromnames[polygon.properties.name]) {
        return cacheofcdsfromnames[polygon.properties.name];
      } else {
        var turffedpolygon = turfify(polygon);

        const answerToReturn = councildistricts.features.find(
          (eachItem: any) => {
            //turf sucks for not having type checking, bypasses compile error Property 'booleanIntersects' does not exist on type 'TurfStatic'.
            //yes it works!!!! it's just missing types
            // @ts-ignore: Unreachable code error
            return turf.booleanIntersects(turfify(eachItem), turffedpolygon);
          }
        );

        cacheofcdsfromnames[polygon.properties.name] = answerToReturn;

        return answerToReturn;
      }
    }
  }

  var [hasStartedControls, setHasStartedControls] = useState(false);

  useEffect(() => {
    
  let arrayoffilterables: any = [];

  arrayoffilterables.push([
    "match",
    ["get", "CD#"],
    filteredcouncildistricts.map((x) => String(x)),
    true,
    false,
  ]);

  arrayoffilterables.push([
    "match",
    ["get", "Race"],
    filteredraces.map((x) => String(x)),
    true,
    false,
  ]);

  if (mapref.current) {
    if (doneloadingmap) {
      const filterinput = JSON.parse(
        JSON.stringify(["all", ...arrayoffilterables])
      );

      console.log(filterinput);

      if (doneloadingmap === true) {
        mapref.current.setFilter("deathsheatmap", filterinput);
        mapref.current.setFilter("deathsdots", filterinput);
      }
    }
  }


  }, [filteredcouncildistricts, filteredraces])

  function checkHideOrShowTopRightGeocoder() {
    var toprightbox = document.querySelector(".mapboxgl-ctrl-top-right");
    if (toprightbox) {
      var toprightgeocoderbox: any = toprightbox.querySelector(
        ".mapboxgl-ctrl-geocoder"
      );
      if (toprightgeocoderbox) {
        if (typeof window != "undefined") {
          if (window.innerWidth >= 768) {
            console.log("changing to block");
            toprightgeocoderbox.style.display = "block";
          } else {
            toprightgeocoderbox.style.display = "none";
            console.log("hiding");
          }
        } else {
          toprightgeocoderbox.style.display = "none";
        }
      }
    }
  }

  const handleResize = () => {
    checkHideOrShowTopRightGeocoder();
  };

  const divRef: any = React.useRef<HTMLDivElement>(null);

  function convertDataFromBackend(data: any) {
    /*
        var featuresarray = data.rows.map((eachRow:any) => {
          return {
            "type": "Feature",
      "properties": {
        ...eachRow
      },
      "geometry": {
        "coordinates": [
          eachRow.lng,
         eachRow.lat
        ],
        "type": "Point"
          }

        }*/

    var objectbylocation: any = {};

    data.rows.forEach((eachRow: any) => {
      const uniq = `${eachRow.lat}` + `${eachRow.lng}`;

      if (objectbylocation[uniq] === undefined) {
        objectbylocation[uniq] = {};
      }

      if (eachRow.total_beds === null) {
        eachRow.total_beds = 0;
      }

      if (eachRow.beds_available === null) {
        eachRow.beds_available = 0;
      }

      if (objectbylocation[uniq].total_beds === undefined) {
        objectbylocation[uniq].total_beds = eachRow.total_beds;
      } else {
        objectbylocation[uniq].total_beds += eachRow.total_beds;
      }

      if (objectbylocation[uniq].beds_available === undefined) {
        objectbylocation[uniq].beds_available = eachRow.beds_available;
      } else {
        objectbylocation[uniq].beds_available += eachRow.beds_available;
      }

      objectbylocation[uniq].occper =
        1 -
        objectbylocation[uniq].beds_available /
          objectbylocation[uniq].total_beds;

      objectbylocation[uniq].organization_name = eachRow.organization_name;
      objectbylocation[uniq].lat = eachRow.lat;
      objectbylocation[uniq].lng = eachRow.lng;
      objectbylocation[uniq].address = eachRow.address;
      objectbylocation[uniq].spa = eachRow.spa;
      objectbylocation[uniq].cd = eachRow.cd;

      if (objectbylocation[uniq].shelterarray === undefined) {
        objectbylocation[uniq].shelterarray = [];
      }
      objectbylocation[uniq].shelterarray.push(eachRow);
    });

    console.log(objectbylocation);

    const featuresarray = Object.values(objectbylocation).map(
      (eachLocation: any) => {
        return {
          type: "Feature",
          properties: {
            ...eachLocation,
          },
          geometry: {
            coordinates: [eachLocation.lng, eachLocation.lat],
            type: "Point",
          },
        };
      }
    );

    console.log(featuresarray);

    const geojsonsdflsf: any = {
      type: "FeatureCollection",
      features: featuresarray,
    };

    return geojsonsdflsf;
  }

  useEffect(() => {
    console.log("map div", divRef);

    if (divRef.current) {
      console.log("app render");
    }

    // mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default;
    //import locations from './features.geojson'

    mapboxgl.accessToken =
      "pk.eyJ1IjoiY29tcmFkZWt5bGVyIiwiYSI6ImNrdjBkOXNyeDdscnoycHE2cDk4aWJraTIifQ.77Gid9mgpEdLpFszO5n4oQ";

    const formulaForZoom = () => {
      if (typeof window != "undefined") {
        if (window.innerWidth > 700) {
          return 10;
        } else {
          return 9.1;
        }
      }
    };

    const urlParams = new URLSearchParams(
      typeof window != "undefined" ? window.location.search : ""
    );
    const latParam = urlParams.get("lat");
    const lngParam = urlParams.get("lng");
    const zoomParam = urlParams.get("zoom");
    const debugParam = urlParams.get("debug");

    var mapparams: any = {
      container: divRef.current, // container ID
      //affordablehousing2022-dev-copy
      style: "mapbox://styles/comradekyler/cld95p0s6004001qibmrpbjgd", // style URL (THIS IS STREET VIEW)
      //mapbox://styles/comradekyler/cl5c3eukn00al15qxpq4iugtn
      //affordablehousing2022-dev-copy-copy
      //  style: 'mapbox://styles/comradekyler/cl5c3eukn00al15qxpq4iugtn?optimize=true', // style URL
      center: [-118.41, 34], // starting position [lng, lat]
      zoom: formulaForZoom(), // starting zoom
    };

    const map = new mapboxgl.Map(mapparams);
    mapref.current = map;

    var rtldone = false;

    try {
      if (rtldone === false && hasStartedControls === false) {
        setHasStartedControls(true);
        //multilingual support
        //right to left allows arabic rendering
        mapboxgl.setRTLTextPlugin(
          "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.10.1/mapbox-gl-rtl-text.js",
          (callbackinfo: any) => {
            console.log(callbackinfo);
            rtldone = true;
          }
        );
      }

      const language = new MapboxLanguage();
      map.addControl(language);
    } catch (error) {
      console.error(error);
    }

    window.addEventListener("resize", handleResize);

    map.on("load", () => {
      map.addSource("deathssource", {
        type: "geojson",
        data: "/unhouseddeaths.geojson",
      });

      map.addLayer({
        id: "deathsheatmap",
        type: "heatmap",
        source: "deathssource",
        paint: {
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0, 0, 255, 0)",
            0.1,
            "royalblue",
            0.3,
            "cyan",
            0.5,
            "lime",
            0.7,
            "yellow",
            1,
            "red",
          ],
          "heatmap-opacity": 1,
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.1,
            
            7,
            2,
            11.6,
            7,
            15.76,
            17,
            22,
            17,
          ],
          "heatmap-weight": 1,
          "heatmap-intensity": 1,
        },
      });

      map.addLayer({
        id: "deathsdots",
        type: "circle",
        source: "deathssource",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            7,
            22,
            12,
            30,
            15,
          ],
          "circle-color": "hsl(60, 0%, 100%)",
          "circle-opacity": 0,
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            "hsl(0, 0%, 58%)",
            22,
            "hsl(0, 4%, 60%)",
          ],
          "circle-stroke-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11.46,
            0,
            13,
            0.17,
            15,
            1,
          ],
        },
        layout: {},
      });

      //create mousedown trigger
      map.on("mousedown", "deathsdots", (e) => {
        console.log("mousedown", e, e.features);
        if (e.features) {
          const closestcoords = computeclosestcoordsfromevent(e);

          const filteredfeatures = e.features.filter((feature: any) => {
            return (
              feature.geometry.coordinates[0] === closestcoords[0] &&
              feature.geometry.coordinates[1] === closestcoords[1]
            );
          });

          if (filteredfeatures.length > 0) {
          }
        }
      });

      // Create a popup, but don't add it to the map yet.
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      });

      map.on("mousemove", "deathsdots", (e) => {
        console.log("mousemove", e, e.features);

        if (e.features) {
          map.getCanvas().style.cursor = "pointer";
          const closestcoords: any = computeclosestcoordsfromevent(e);

          const filteredfeatures = e.features.filter((feature: any) => {
            return (
              feature.geometry.coordinates[0] === closestcoords[0] &&
              feature.geometry.coordinates[1] === closestcoords[1]
            );
          });

          // Copy coordinates array.
          const coordinates = closestcoords.slice();

          // Ensure that if the map is zoomed out such that multiple
          // copies of the feature are visible, the popup appears
          // over the copy being pointed to.
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          if (filteredfeatures.length > 0) {
            if (filteredfeatures[0]) {
              if (filteredfeatures[0].properties) {
                if (filteredfeatures[0].properties["Death Address"]) {
                  const address =
                    filteredfeatures[0].properties["Death Address"];
                  console.log("filteredfeatures", filteredfeatures);

                  const allthelineitems = filteredfeatures.map((eachdeath) => {
                    if (eachdeath.properties?.["Death Date"]) {
                      return `<li>${eachdeath.properties["Death Date"]}
                  ${
                    eachdeath.properties.Age &&
                    eachdeath.properties.Age != "UNKNOWN"
                      ? `<span class="text-teal-200">${eachdeath.properties.Age} yrs</span>`
                      : ""
                  }
                  ${" "}
                  ${
                    eachdeath.properties.Gender &&
                    eachdeath.properties.Gender != "UNKNOWN"
                      ? `<span class="text-sky-400">${eachdeath.properties.Gender}</span>`
                      : ""
                  }${" "}
                  ${
                    eachdeath.properties.Race &&
                    eachdeath.properties.Race != "UNKNOWN"
                      ? `<span class="text-blue-200">${titleCase(
                          eachdeath.properties.Race.toLowerCase()
                        ).replace(/ american/gi, "")}</span>`
                      : ""
                  }

                  ${
                    eachdeath.properties["Death Place"]
                      ? `<br/><span class="text-pink-200">${eachdeath.properties[
                          "Death Place"
                        ].toLowerCase()}</span>`
                      : ""
                  }${" "}${
                        eachdeath.properties["Event Place"]
                          ? `<span class="text-pink-400">${eachdeath.properties[
                              "Event Place"
                            ].toLowerCase()}</span>`
                          : ""
                      }

                  ${
                    eachdeath.properties["Mode"]
                      ? `<br/><span class="text-red-200">${eachdeath.properties[
                          "Mode"
                        ].toLowerCase()}</span> `
                      : " "
                  }
                  </li>`;
                    }
                  });

                  popup
                    .setLngLat(coordinates)
                    .setHTML(
                      ` <div>
                <p class="font-semibold">${titleCase(address.toLowerCase())}</p>
                <p>${filteredfeatures.length} Death${
                        filteredfeatures.length > 1 ? "s" : ""
                      }</p>

                <ul class='list-disc'>${
                  allthelineitems.length <= 7
                    ? allthelineitems.join("")
                    : allthelineitems.splice(0, 7).join("")
                }</ul>
                
                ${
                  allthelineitems.length >= 7
                    ? `<p class="text-xs text-gray-300">Showing 10 of ${allthelineitems.length} deaths</p>`
                    : ""
                }
                <p >Click for more info</p>
              </div><style>
              .mapboxgl-popup-content {
                background: #212121ee;
                color: #fdfdfd;
              }
    
              .flexcollate {
                row-gap: 0.5rem;
                display: flex;
                flex-direction: column;
              }
              </style>`
                    )
                    .addTo(map);
                }
              }
            }
          }
        }
      });

      map.on("mouseleave", "deathsdots", () => {
        //check if the url query string "stopmouseleave" is true
        //if it is, then don't do anything
        //if it is not, then do the following
        /*
  map.getCanvas().style.cursor = '';
  popup.remove();*/

        if (urlParams.get("stopmouseleave") === null) {
          map.getCanvas().style.cursor = "";
          popup.remove();
        }
      });

      setdoneloadingmap(true);
      setshowtotalarea(window.innerWidth > 640 ? true : false);

      okaydeletepoints.current = () => {
        try {
          var affordablepoint: any = map.getSource("selected-home-point");
          affordablepoint.setData(null);
        } catch (err) {
          console.error(err);
        }
      };

      const processgeocodereventresult = (eventmapbox: any) => {
        var singlePointSet: any = map.getSource("single-point");

        singlePointSet.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: eventmapbox.result.geometry,
            },
          ],
        });

        console.log("event.result.geometry", eventmapbox.result.geometry);
        console.log("geocoderesult", eventmapbox);
      };

      const processgeocodereventselect = (object: any) => {
        var coord = object.feature.geometry.coordinates;
        var singlePointSet: any = map.getSource("single-point");

        singlePointSet.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: object.feature.geometry,
            },
          ],
        });
      };

      const geocoder: any = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: map,
        proximity: {
          longitude: -118.41,
          latitude: 34,
        },
        marker: true,
      });

      setdatasetloaded(true);

      map.on("mousedown", "councildistrictsselectlayer", (e: any) => {
        var sourceofcouncildistselect: any = map.getSource(
          "selected-council-dist"
        );

        var clickeddata = e.features[0].properties.district;

        var councildistpolygonfound = councildistricts.features.find(
          (eachDist: any) => eachDist.properties.district === clickeddata
        );

        if (sourceofcouncildistselect) {
          if (councildistpolygonfound) {
            sourceofcouncildistselect.setData(councildistpolygonfound);
          }
        }
      });

      map.on("mouseenter", "shelterslayer", (e: any) => {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = "pointer";

        var arrayOfSheltersText: any = [];

        console.log("properties", e.features[0].properties);

        console.log(JSON.parse(e.features[0].properties.shelterarray));

        JSON.parse(e.features[0].properties.shelterarray).forEach(
          (eachShelter: any) => {
            arrayOfSheltersText.push(`
          <div class="rounded-sm bg-slate-700 bg-opacity-70 px-1 py-1">
          <strong>${eachShelter.projectname}</strong><br/>
          ${eachShelter.type ? `Type: ${eachShelter.type}<br/>` : ""}
         
          ${eachShelter.total_beds} beds<br/>
          ${eachShelter.beds_available} beds available<br/>
          ${
            eachShelter.male_available
              ? `  ${eachShelter.male_available} male beds available<br/>`
              : ""
          }
          
          ${
            eachShelter.female_available
              ? `  ${eachShelter.female_available} female beds available<br/>`
              : ""
          }

          ${
            eachShelter.criteria ? `Criteria: ${eachShelter.criteria}<br/>` : ""
          }
          ${
            eachShelter.last_updated &&
            `
            <span class='italic font-semibold'>Last Updated ${new Date(
              eachShelter.last_updated
            ).toLocaleDateString("default", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            </span>
          `
          }

        
          </div>
            `);
          }
        );

        var collateshelters = arrayOfSheltersText.join("");

        // Copy coordinates array.
        const coordinates = e.features[0].geometry.coordinates.slice();
        const description = `
          ${e.features[0].properties.organization_name}<br/>
          ${e.features[0].properties.address}<br/>
          <div className='flexcollate'
          style="
    display: flex;
    flex-direction: column;
    row-gap: 0.3rem;
"
          >${collateshelters}</div>
          <p>Click dot for more info</p>
          <style>
          .mapboxgl-popup-content {
            background: #212121ee;
            color: #fdfdfd;
          }

          .flexcollate {
            row-gap: 0.5rem;
            display: flex;
            flex-direction: column;
          }
          </style>
          `;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Populate the popup and set its coordinates
        // based on the feature found.
        popup.setLngLat(coordinates).setHTML(description).addTo(map);
      });

      var colormarker = new mapboxgl.Marker({
        color: "#41ffca",
      });

      const geocoderopt: any = {
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
        marker: {
          color: "#41ffca",
        },
      };

      const geocoder2 = new MapboxGeocoder(geocoderopt);
      const geocoder3 = new MapboxGeocoder(geocoderopt);

      geocoder.on("result", (event: any) => {
        processgeocodereventresult(event);
      });

      geocoder.on("select", function (object: any) {
        processgeocodereventselect(object);
      });

      var geocoderId = document.getElementById("geocoder");

      if (geocoderId) {
        console.log("geocoder div found");

        if (!document.querySelector(".geocoder input")) {
          geocoderId.appendChild(geocoder3.onAdd(map));

          var inputMobile = document.querySelector(".geocoder input");

          try {
            var loadboi = document.querySelector(
              ".mapboxgl-ctrl-geocoder--icon-loading"
            );
            if (loadboi) {
              var brightspin: any = loadboi.firstChild;
              if (brightspin) {
                brightspin.setAttribute("style", "fill: #e2e8f0");
              }
              var darkspin: any = loadboi.lastChild;
              if (darkspin) {
                darkspin.setAttribute("style", "fill: #94a3b8");
              }
            }
          } catch (err) {
            console.error(err);
          }

          if (inputMobile) {
            inputMobile.addEventListener("focus", () => {
              //make the box below go away
            });
          }
        }

        geocoder2.on("result", (event: any) => {
          processgeocodereventresult(event);
        });

        geocoder2.on("select", function (object: any) {
          processgeocodereventselect(object);
        });

        geocoder3.on("result", (event: any) => {
          processgeocodereventresult(event);
        });

        geocoder3.on("select", function (object: any) {
          processgeocodereventselect(object);
        });
      }

      map.addSource("single-point", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      if (true) {
        map.addLayer({
          id: "point",
          source: "single-point",
          type: "circle",
          paint: {
            "circle-radius": 10,
            "circle-color": "#41ffca",
          },
        });
      }

      if (debugParam) {
        map.showTileBoundaries = true;
        map.showCollisionBoxes = true;
        map.showPadding = true;
      }

      if (urlParams.get("terraindebug")) {
        map.showTerrainWireframe = true;
      }

      map.addSource("selected-shelter-point", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addSource("selected-park-area", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      if (false) {
        map.addLayer({
          id: "selected-park-areas",
          source: "selected-park-area",
          type: "line",
          paint: {
            "line-color": "#7dd3fc",
            "line-width": 5,
            "line-blur": 0,
          },
        });

        map.addLayer({
          id: "selected-park-areasfill",
          source: "selected-park-area",
          type: "fill",
          paint: {
            "fill-color": "#7dd3fc",
            "fill-opacity": 0.2,
          },
        });
      }

      map.loadImage("/map-marker.png", (error, image: any) => {
        if (error) throw error;

        // Add the image to the map style.
        map.addImage("map-marker", image);

        if (true) {
          map.addLayer({
            id: "points-selected-shelter-layer",
            type: "symbol",
            source: "selected-shelter-point",
            paint: {
              "icon-color": "#41ffca",
              "icon-translate": [0, -13],
            },
            layout: {
              "icon-image": "map-marker",
              // get the title name from the source's "title" property
              "text-allow-overlap": true,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "text-ignore-placement": true,

              "icon-size": 0.4,
              "icon-text-fit": "both",
            },
          });
        }
      });

      if (
        !document.querySelector(
          ".mapboxgl-ctrl-top-right > .mapboxgl-ctrl-geocoder"
        )
      ) {
        map.addControl(geocoder2);
      }

      checkHideOrShowTopRightGeocoder();

      if (true) {
        map.addLayer(
          {
            id: "citybound",
            type: "line",
            source: {
              type: "geojson",
              data: citybounds,
            },
            paint: {
              "line-color": "#dddddd",
              "line-opacity": 1,
              "line-width": 3,
            },
          },
          "road-label"
        );

        map.addSource("citycouncildist", {
          type: "geojson",
          data: councildistricts,
        });

        map.addLayer(
          {
            id: "councildistrictslayer",
            type: "line",
            source: "citycouncildist",
            paint: {
              "line-color": "#bbbbbb",
              "line-opacity": 1,
              "line-width": 2,
            },
          },
          "road-label"
        );

        map.addLayer(
          {
            id: "councildistrictsselectlayer",
            type: "fill",
            source: "citycouncildist",
            paint: {
              "fill-color": "#000000",
              "fill-opacity": 0,
            },
          },
          "road-label"
        );

        map.addSource("selected-council-dist", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer(
          {
            id: "selected-council-dist-layer",
            type: "fill",
            source: "selected-council-dist",
            paint: {
              "fill-color": "#bdbdeb",
              "fill-opacity": 0.1,
            },
          },
          "road-label"
        );

        map.addLayer(
          {
            id: "selected-council-dist-layer",
            type: "fill",
            source: "selected-council-dist",
            paint: {
              "fill-color": "#bdbdeb",
              "fill-opacity": 0.09,
            },
          },
          "aeroway-polygon"
        );
      }

      if (hasStartedControls === false) {
        // Add zoom and rotation controls to the map.
        map.addControl(new mapboxgl.NavigationControl());

        // Add geolocate control to the map.
        map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
            },
            // When active the map will receive updates to the device's location as it changes.
            trackUserLocation: true,
            // Draw an arrow next to the location dot to indicate which direction the device is heading.
            showUserHeading: true,
          })
        );
      }

      checkHideOrShowTopRightGeocoder();

      var mapname = "beds";

      map.on("dragstart", (e) => {
        uploadMapboxTrack({
          mapname,
          eventtype: "dragstart",
          globallng: map.getCenter().lng,
          globallat: map.getCenter().lat,
          globalzoom: map.getZoom(),
        });
      });

      map.on("dragend", (e) => {
        uploadMapboxTrack({
          mapname,
          eventtype: "dragend",
          globallng: map.getCenter().lng,
          globallat: map.getCenter().lat,
          globalzoom: map.getZoom(),
        });
      });

      map.on("zoomstart", (e) => {
        uploadMapboxTrack({
          mapname,
          eventtype: "dragstart",
          globallng: map.getCenter().lng,
          globallat: map.getCenter().lat,
          globalzoom: map.getZoom(),
        });
      });

      map.on("zoomend", (e) => {
        uploadMapboxTrack({
          mapname,
          eventtype: "zoomend",
          globallng: map.getCenter().lng,
          globallat: map.getCenter().lat,
          globalzoom: map.getZoom(),
        });
      });

      //end of load
    });

    var getmapboxlogo: any = document.querySelector(".mapboxgl-ctrl-logo");

    if (getmapboxlogo) {
      getmapboxlogo.remove();
    }
  }, []);


  return (
    <div className="flex flex-col h-full w-screen absolute">
      <MantineProvider
        theme={{ colorScheme: "dark" }}
        withGlobalStyles
        withNormalizeCSS
      >
        <Head>
          <link
            rel="icon"
            href="https://mejiaforcontroller.com/wp-content/uploads/2020/12/cropped-favicon-1-32x32.png"
            sizes="32x32"
          />
          <link
            rel="icon"
            href="https://mejiaforcontroller.com/wp-content/uploads/2020/12/cropped-favicon-1-192x192.png"
            sizes="192x192"
          />
          <link
            rel="apple-touch-icon"
            href="https://mejiaforcontroller.com/wp-content/uploads/2020/12/cropped-favicon-1-180x180.png"
          />
          <meta
            name="msapplication-TileImage"
            content="https://mejiaforcontroller.com/wp-content/uploads/2020/12/cropped-favicon-1-270x270.png"
          />

          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          />
          <title>Unhoused Deaths in Los Angeles | Map</title>
          <meta property="og:type" content="website" />
          <meta name="twitter:site" content="@lacontroller" />
          <meta name="twitter:creator" content="@lacontroller" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:title"
            key="twittertitle"
            content="Unhoused Deaths in Los Angeles | Map"
          ></meta>
          <meta
            name="twitter:description"
            key="twitterdesc"
            content="Criteria, Capacity and Occupancy of Los Angeles Homeless Shelters."
          ></meta>
          <meta
            name="twitter:image"
            key="twitterimg"
            content="https://shelterbeds.lacontroller.io/shelter-thumbnail-min.png"
          ></meta>
          <meta
            name="description"
            content="Criteria, Capacity and Occupancy of Los Angeles Homeless Shelters."
          />

          <meta
            property="og:url"
            content="https://unhouseddeaths.lacontroller.io/"
          />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="Shelter Beds Occupancy | Map" />
          <meta
            property="og:description"
            content="Criteria, Capacity and Occupancy of Los Angeles Homeless Shelters."
          />
          <meta
            property="og:image"
            content="https://shelterbeds.lacontroller.io/shelter-thumbnail-min.png"
          />
        </Head>

        <div className="flex-none">
          <Nav />
        </div>

        <div className="flex-initial h-content flex-col flex z-50">
          <div className="   max-h-screen flex-col flex z-5">
            <div
              className="absolute mt-[3em] md:mt-[3.7em] md:ml-3 top-0 z-5 titleBox  ml-2 text-base bold md:semi-bold break-words bg-[#212121]"
              style={{
                backgroundColor: "#212121",
                color: "#ffffff",
              }}
            >
              <strong className="">Unhoused Deaths in LA</strong>
            </div>

            <div
              className={`geocoder absolute mt-[2.7em] md:mt-[4.1em] ml-1 left-1 md:hidden xs:text-sm sm:text-base md:text-lg`}
              id="geocoder"
            ></div>
            <div className="w-content"></div>

            <div className="fixed mt-[6em] ml-2 sm:hidden flex flex-row">
              {filterpanelopened === false && (
                <button
                  onClick={() => {
                    setfilterpanelopened(true);
                  }}
                  className={` md:hidden mt-2 rounded-full px-3 pb-1.5 pt-0.5 text-sm bold md:text-base 
                  bg-gray-800 bg-opacity-80 text-white border-white border-2`}
                >
                  <svg
                    style={{
                      width: "20px",
                      height: "20px",
                    }}
                    viewBox="0 0 24 24"
                    className="inline align-middle mt-0.5"
                  >
                    <path
                      fill="currentColor"
                      d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z"
                    />
                  </svg>
                  <span>Filter</span>
                </button>
              )}
            </div>

            <div
              className="filterandinfobox  fixed
 top-auto bottom-0 left-0 right-0
   sm:max-w-sm sm:absolute sm:mt-[6em] md:mt-[3em] sm:ml-3 
  sm:top-auto sm:bottom-auto sm:left-auto 
  sm:right-auto flex flex-col gap-y-2"
            >
              {filterpanelopened === false && (
                <div className=" flex flex-row">
                  <button
                    onClick={() => {
                      setfilterpanelopened(true);
                    }}
                    className={`hidden md:block mt-2 rounded-full px-3 pb-1.5 pt-0.5 text-sm bold md:text-base 
                  bg-gray-800 bg-opacity-80 text-white border-white border-2`}
                  >
                    <svg
                      style={{
                        width: "20px",
                        height: "20px",
                      }}
                      viewBox="0 0 24 24"
                      className="inline align-middle mt-0.5"
                    >
                      <path
                        fill="currentColor"
                        d="M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,3.56 20.13,4.19 19.79,4.62L14.03,12H14Z"
                      />
                    </svg>
                    <span>Filter</span>
                  </button>
                </div>
              )}
              <div
                className={`
              ${
                filterpanelopened
                  ? "relative bg-zinc-900 w-content bg-opacity-90 px-2 py-1 mt-1 sm:rounded-lg"
                  : "hidden"
              }
              `}
              >
                <CloseButton
                  onClose={() => {
                    setfilterpanelopened(false);
                  }}
                />
                <div className="gap-x-0 flex flex-row w-full pr-8">
                  <button
                    onClick={() => {
                      setselectedfilteropened("race");
                    }}
                    className={`px-2 border-b-2 py-1  font-semibold ${
                      selectedfilteropened === "race"
                        ? "border-[#41ffca] text-[#41ffca]"
                        : "hover:border-white border-transparent text-gray-50"
                    }`}
                  >
                    Race
                  </button>

                  <button
                    onClick={() => {
                      setselectedfilteropened("cd");
                    }}
                    className={`px-2 border-b-2  py-1  font-semibold ${
                      selectedfilteropened === "cd"
                        ? "border-[#41ffca] text-[#41ffca]"
                        : "hover:border-white border-transparent text-gray-50"
                    }`}
                  >
                    CD #
                  </button>
                </div>
                <div className="flex flex-col">
                  {selectedfilteropened === "race" && (
                    <div className="mt-2">
                      <div className="flex flex-row gap-x-1">
                        <div className="flex items-center">
                        <Checkbox.Group
                        value={filteredraces}
                        onChange={setfilteredraces}
                      >
                        {" "}
                        <div
                          className={`grid grid-cols-3
                          } gap-x-4 `}
                        >
                          {Object.entries(filterableraces).map((eachEntry) => (
                            <Checkbox
                              value={eachEntry[0]}
                              label={
                                <span className="text-nowrap text-xs">
                                  <span className="text-white">{titleCase(eachEntry[0].toLowerCase())}</span>{" "}
                                  <span>{eachEntry[1]}</span>
                                </span>
                              }
                              key={eachEntry[0]}
                            />
                          ))}
                        </div>
                      </Checkbox.Group>
                       
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedfilteropened === "cd" && (
                    <div className="mt-2">
                      <div className="flex flex-row gap-x-1">
                        <button
                          className="align-middle bg-gray-800 rounded-lg px-1  border border-gray-400 text-sm md:text-base"
                          onClick={() => {
                            setfilteredcouncildistrictspre(listofcouncildists);
                          }}
                        >
                          Select All
                        </button>
                        <button
                          className="align-middle bg-gray-800 rounded-lg px-1 text-sm md:text-base border border-gray-400"
                          onClick={() => {
                            setfilteredcouncildistrictspre([]);
                          }}
                        >
                          Unselect All
                        </button>
                        <button
                          onClick={() => {
                            setfilteredcouncildistrictspre(
                              listofcouncildists.filter(
                                (n) => !filteredcouncildistricts.includes(n)
                              )
                            );
                          }}
                          className="align-middle bg-gray-800 rounded-lg px-1 text-sm md:text-base  border border-gray-400"
                        >
                          Invert
                        </button>
                      </div>
                      <Checkbox.Group
                        value={filteredcouncildistricts}
                        onChange={setfilteredcouncildistrictspre}
                      >
                        {" "}
                        <div
                          className={`grid grid-cols-3
                          } gap-x-4 `}
                        >
                          {listofcouncildists.map((item, key) => (
                            <Checkbox
                              value={item}
                              label={
                                <span className="text-nowrap text-xs">
                                  <span className="text-white">{item}</span>{" "}<span>{councilcount[String(item)]}</span>
                                </span>
                              }
                              key={key}
                            />
                          ))}
                        </div>
                      </Checkbox.Group>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`text-sm ${
                  shelterselected != null
                    ? `px-3 pt-2 pb-3 
 bg-gray-900 sm:rounded-xl 
   bg-opacity-80 sm:bg-opacity-80 text-white 
   border-t-2  sm:border border-teal-500 sm:border-grey-500
   relative overflow-y-auto  scrollbar-thin scrollbar-thumb-gray-900 scrollbar-track-gray-100 scrollbar-thumb-rounded
   `
                    : "hidden"
                }  ${
                  typeof window != "undefined"
                    ? `${
                        window.innerHeight < 1200 && window.innerWidth >= 500
                          ? "max-h-96"
                          : "max-h-[500px]"
                      }
                      
                      ${window.innerWidth < 500 ? "max-h-48 text-xs" : ""}
                      `
                    : ""
                }`}
              >
                <CloseButton
                  onClose={() => {
                    setshelterselected(null);

                    if (mapref.current) {
                      var affordablepoint: any = mapref.current.getSource(
                        "selected-shelter-point"
                      );
                      if (affordablepoint) {
                        affordablepoint.setData(null);

                        mapref.current.setLayoutProperty(
                          "points-selected-shelter-layer",
                          "visibility",
                          "none"
                        );
                      }
                    } else {
                      console.log("no ref current");
                    }
                  }}
                />

              
              </div>
            </div>
          </div>
        </div>

        <div className="hidden">
          <span className="text-teal-200"></span>
          <span className="text-blue-200"></span>
          <span className="text-amber-200"></span>
          <span className="text-red-200"></span>
          <span className="text-purple-200"></span>

          <span className="text-pink-200"></span>
          <ul className="list-disc"></ul>
        </div>

        <div ref={divRef} style={{}} className="map-container w-full h-full " />

        {(typeof window !== "undefined" ? window.innerWidth >= 640 : false) && (
          <>
            <div
              className={`absolute md:mx-auto z-9 bottom-2 left-1 md:left-1/2 md:transform md:-translate-x-1/2`}
            >
              <a
                href="https://controller.lacontroller.gov/"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src="https://controller.lacity.gov/images/KennethMejia-logo-white-elect.png"
                  className="h-9 md:h-10 z-40"
                  alt="Kenneth Mejia LA City Controller Logo"
                />
              </a>
            </div>
          </>
        )}
      </MantineProvider>
    </div>
  );
};

export default Home;
