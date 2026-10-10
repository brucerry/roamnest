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

The optional simulation uses only the 218 researched directional airport pairs in the
[route catalog](public/data/simulated-routes.json), expanded on 10 October 2026. Each route retains
its own check date. Catalog evidence links are official airport or airline sources supplied through
verified research. Reference flight numbers are retained solely as evidence; animated route IDs use
`DEMO-` labels. The arc shape, progress, and timings are illustrative. The catalog neither tracks
flights nor guarantees date-specific service; source timetable limits remain visible. Runtime uses
local bundled data and exact OurAirports endpoint joins. Disabled research candidates are not
bundled or loaded.

The earlier 144-direction catalog gave Hong Kong 18 unique outbound destinations, including
separately identified Tokyo Narita and Haneda airports, Taipei Taoyuan, Kaohsiung, Taichung, Osaka
Kansai and both Vancouver and Toronto Pearson. The 12 earlier Hong Kong additions and the two Taiwan
follow-up directions use individually opened Cathay timetable sectors sampled for 10–16 October
2026; service beyond that window is not asserted. Auckland gains six destinations from affirmative
nonstop network markers and exact-airport route pages; Bali retains the airline's seasonal-service
limit. Dubai gains three destinations and three independently verified return sectors from Emirates
flight cards. Chicago gains Paris Charles de Gaulle, Madrid and Rome Fiumicino from O'Hare's 1
September 2026 nonstop list. These counts distinguish outbound destinations from directional pairs;
the original 48 entries retain their evidence and limitations.

A further 69 independently verified directions expand the existing sparse sources, introduce Taiwan
and Macau departures and complete Hong Kong's three Taiwan destination choices. AMS, BKK, FRA, NRT,
SEA, SIN, YVR, CHC, WLG and ZQN each initially had five outbound destinations; CDG and LHR each had
four. Taiwan initially offered Taipei Taoyuan (TPE, eight), Kaohsiung (KHH, six) and Taichung (RMQ,
five). Macau (MO) offered Macau International Airport (MFM, five): Taoyuan, Kaohsiung, Taichung,
Narita and Incheon. These are airport destinations, not carrier counts; unsupported candidates and
automatic reversals are excluded. All 75 previous route objects retain their source metadata.

New evidence includes opened STARLUX and Mandarin Airlines timetables, Kaohsiung and Macau airport
sector records, matched Narita/Incheon arrivals, Lufthansa sector tables, explicit Singapore
Airlines/THAI/Air New Zealand nonstop statements, KLM's no-intermediate-stop row, Seattle's 2026
nonstop network with current operator records, and YVR's July 2026 nonstop brochure. Codeshares
identify the actual operator, including HK Express on HKG–RMQ, RMQ–HKG and NRT–HKG, Cathay Pacific
on HKG–KHH, and United on LHR–ORD. STARLUX samples cover 7–13 October; Kaohsiung samples cover 5–11
October; the selected Mandarin sector covers 1–24 October. Macau–Narita/Incheon matching sectors
establish only 10 October service. Undated statements and seasonal brochures do not guarantee
frequency or availability. Every addition was checked on 10 October 2026; each route links its
source and displays its own limit.

Independent reverse-direction research adds 74 directions, preserving all 144 earlier records. The
current catalog contains 218 unique directional pairs from 50 departure airports, including 20 Hong
Kong destinations and all three Hong Kong–Taiwan pairs in both directions. The Reverse control swaps
only to an independently researched, enabled inverse; 10 researched candidates remain excluded
because sufficient current official proof was not obtained. Absence from the catalog does not mean
an airline does not operate that route.

Reverse evidence uses the public Air New Zealand timetable feed, Cathay's published timetable,
STARLUX and Kaohsiung schedules, Mandarin's October timetable, JAL's March–October schedule,
Lufthansa's individual sector tables and explicit Singapore Airlines nonstop statements. Matched
Narita/Incheon departure and Macau arrival records establish complete Air Macau sectors; Seattle's
explicit nonstop network to and from SEA is corroborated with direction-specific own-carrier
arrivals. Lufthansa-marketed AMS/CDG/FCO–ORD sectors identify United as operator, LHR–YVR identifies
Air Canada, and Cathay-marketed HKG–FRA identifies Lufthansa. Seasonal Hobart, Cairns, Sunshine
Coast and Bali limits are retained. Individual sampled dates, approval conditions and undated-source
limitations are displayed per route; these sources do not provide live availability or confirm
completed flights.

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
