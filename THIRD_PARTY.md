# Third-party data and software

Roamnest uses these redistributable assets; their licenses remain separate from the project's MIT
license.

| Component                                                                                                                                         | License / permission                                      | Included notice                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [OurAirports](https://ourairports.com/data/) airport catalog                                                                                      | Public domain                                             | [Source snapshot](public/data/provenance.json)                                                       |
| [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) land and generalized country boundaries                                     | Public domain                                             | [Source snapshot](public/data/provenance.json)                                                       |
| [Natural Earth](https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-rivers-lake-centerlines/) 1:110m river and lake centerlines | Public domain                                             | [Source and derivation](public/data/geography-provenance.json)                                       |
| [RESOLVE Ecoregions 2017](https://ecoregions.appspot.com/), Dinerstein et al. (2017)                                                              | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Source, attribution and simplification](public/data/geography-provenance.json)                      |
| [airportsdata](https://github.com/mborsetti/airportsdata) IANA timezones                                                                          | MIT                                                       | [License](public/vendor/airportsdata/LICENSE), [snapshot](public/data/city-timezone-provenance.json) |
| [Leaflet](https://leafletjs.com/) 1.9.4                                                                                                           | BSD-2-Clause                                              | [License](public/vendor/leaflet/LICENSE)                                                             |
| [D3 geo](https://d3js.org/d3-geo) 3.1.1 / array 3.2.4                                                                                             | ISC                                                       | [geo license](public/vendor/d3/d3-geo-LICENSE), [array license](public/vendor/d3/d3-array-LICENSE)   |
| [Tabler icons](https://github.com/tabler/tabler-icons)                                                                                            | MIT                                                       | [License](public/vendor/tabler/LICENSE)                                                              |

City labels use representative airport coordinates. Timezones are matched by exact airport code;
unknown codes omit the clock. Browser Intl supplies DST rules. The globe uses the seven-continent
convention with Oceania; continent labels are cartographic anchors, not country or city coordinates.

The permanent vegetation layer shows generalized forest and woodland biome regions from RESOLVE
Ecoregions 2017, not current tree cover or individual trees. Source boundaries are simplified and
tiny rings omitted for globe rendering. Rivers retain Natural Earth's generalized major-waterway
coordinates; coverage is limited.

The optional simulation uses only the 48 researched directional airport pairs in the
[route catalog](public/data/simulated-routes.json), expanded on 10 October 2026. Each route retains
its own check date. Catalog evidence links are official airport or airline sources supplied through
verified research. Reference flight numbers are retained solely as evidence; animated route IDs use
`DEMO-` labels. The arc shape, progress, and timings are illustrative. The catalog neither tracks
flights nor guarantees date-specific service; source timetable limits remain visible. Runtime uses
local bundled data and exact OurAirports endpoint joins. Disabled research candidates are not
bundled or loaded.

External services are optional or disclosed in the interface. Ordinary street tiles follow the
[OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) with visible
[OSM attribution](https://www.openstreetmap.org/copyright); valid itineraries load viewed tiles.
Explicit private road requests use [FOSSGIS](https://routing.openstreetmap.de/about.html), with rate
and size limits; public/commercial routing needs a separately approved suitable service.
[GeoJS](https://www.geojs.io/docs/v1/endpoints/geo/) supplies approximate IP centering with
[privacy disclosure](https://www.geojs.io/privacy/) and opt-out. Explicit directions use
[Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) open directly
in Maps. Maps resolves the current device origin or offers manual choice; adjacent legs use the
entered attraction as origin.
