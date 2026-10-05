import { writeFile } from 'node:fs/promises';
const endpoints = {
    HKG: ['Hong Kong', '香港', 'HK', 'Hong Kong', '香港'],
    YVR: ['Vancouver', '溫哥華', 'CA', 'Canada', '加拿大'],
    SEA: ['Seattle', '西雅圖', 'US', 'United States', '美國'],
    BKK: ['Bangkok', '曼谷', 'TH', 'Thailand', '泰國'],
    DXB: ['Dubai', '杜拜', 'AE', 'United Arab Emirates', '阿拉伯聯合大公國'],
    ORD: ['Chicago', '芝加哥', 'US', 'United States', '美國'],
    LHR: ['London', '倫敦', 'GB', 'United Kingdom', '英國'],
    FRA: ['Frankfurt', '法蘭克福', 'DE', 'Germany', '德國'],
    AMS: ['Amsterdam', '阿姆斯特丹', 'NL', 'Netherlands', '荷蘭'],
    BOG: ['Bogotá', '波哥大', 'CO', 'Colombia', '哥倫比亞'],
    GRU: ['São Paulo', '聖保羅', 'BR', 'Brazil', '巴西'],
    MEX: ['Mexico City', '墨西哥城', 'MX', 'Mexico', '墨西哥'],
    CAI: ['Cairo', '開羅', 'EG', 'Egypt', '埃及'],
    AKL: ['Auckland', '奧克蘭', 'NZ', 'New Zealand', '紐西蘭'],
    SYD: ['Sydney', '雪梨', 'AU', 'Australia', '澳洲'],
    MEL: ['Melbourne', '墨爾本', 'AU', 'Australia', '澳洲'],
    LAX: ['Los Angeles', '洛杉磯', 'US', 'United States', '美國'],
};
const airport = (code) => {
    const [cityEn, cityZh, countryCode, countryEn, countryZh] = endpoints[code];
    return {
        iata: code,
        city: { en: cityEn, zhHant: cityZh },
        countryCode,
        country: { en: countryEn, zhHant: countryZh },
    };
};
const carriers = {
    CX: ['Cathay Pacific', '國泰航空'],
    EK: ['Emirates', '阿聯酋航空'],
    BA: ['British Airways', '英國航空'],
    LH: ['Lufthansa', '漢莎航空'],
    KL: ['KLM', '荷蘭皇家航空'],
    AV: ['Avianca', '哥倫比亞航空'],
    UA: ['United Airlines', '聯合航空'],
    AM: ['Aeroméxico', '墨西哥航空'],
    MS: ['EgyptAir', '埃及航空'],
    NZ: ['Air New Zealand', '紐西蘭航空'],
};
const evidence = (
    sourceURL,
    sourceType,
    sourceTitle,
    summary,
    sourcePublishedDate = null,
    validFrom = null,
    validThrough = null,
    retrieval = 'full_public_page',
) => ({
    sourceURL,
    sourceType,
    sourceTitle,
    summary,
    sourcePublishedDate,
    validFrom,
    validThrough,
    retrieval,
    referenceFlightNumbers: [],
    supportingSourceURLs: [],
});
const yvr = evidence(
    'https://news.yvr.ca/yvr-hosts-cathay-pacifics-gallery-in-the-skies-in-airlines-80th-anniversary-celebration/',
    'official_airport_operating_route_statement',
    'YVR: Cathay Pacific 80th anniversary',
    'Airport confirms present-day Cathay nonstop service between Vancouver and Hong Kong',
    '2026-03-17',
);
const sea = evidence(
    'https://news.cathaypacific.com/cathay-pacific-connects-hong-kong-and-seattle-with-a-five-times-weekly-direct-service-ov2kmi',
    'official_airline_dated_schedule',
    'Cathay: Hong Kong–Seattle service launched',
    'Airline confirms launched nonstop service and gives both directional flight rows',
    '2026-03-30',
    '2026-09-16',
    '2026-10-24',
);
const bkk = evidence(
    'https://www.emirates.com/hk/english/destinations/hkg/bkk/flights-from-hong-kong-to-bangkok/',
    'official_airline_current_route_schedule',
    'Emirates: Hong Kong–Bangkok flight schedules',
    'Current schedule displays the HKG–BKK segment and its reverse as individual Emirates flight legs',
);
const dxb = evidence(
    'https://www.emirates.com/hk/english/destinations/hkg/dxb/flights-from-hong-kong-to-dubai/',
    'official_airline_current_route_schedule',
    'Emirates: Hong Kong–Dubai flight schedules',
    'Current schedule distinguishes the short single-sector services from longer through services',
);
const ord = evidence(
    "https://www.flychicago.com/SiteCollectionDocuments/O'Hare%2F/ArchivedPDFs/MyFlight/INTLnonstops.pdf",
    'official_airport_nonstop_destination_list',
    "O'Hare International Airport Nonstop International Destinations",
    "Destination and carrier appear in the airport's explicitly nonstop international list",
    '2026-09-01',
    null,
    null,
    'full_public_pdf',
);
const australia = evidence(
    'https://www.airnewzealand.co.nz/flights/en-nz/flights-to-australia',
    'official_airline_explicit_nonstop_route_statement',
    'Air New Zealand: Flights to Australia',
    'Airline explicitly states nonstop operation from Auckland to this city',
);
const lax = evidence(
    'https://www.airnewzealand.com/en-nz/travel-info/destinations-we-fly-to',
    'official_airline_nonstop_network_table',
    'Air New Zealand: Where we fly',
    'Los Angeles is listed in the non-stop-from-Auckland network table',
);
const routes = [];
function add(from, to, carrier, source, seasonality, refs = [], support = []) {
    routes.push({
        id: from + '-' + to,
        origin: airport(from),
        destination: airport(to),
        carrier: {
            iata: carrier,
            name: { en: carriers[carrier][0], zhHant: carriers[carrier][1] },
        },
        routeType: 'nonstop',
        enabled: true,
        checkedDate: '2026-10-05',
        verificationStatus: 'verified_from_opened_official_content',
        evidence: { ...source, referenceFlightNumbers: refs, supportingSourceURLs: support },
        seasonality,
    });
}
const yvrLimit =
    'Frequency varies at peak season; no fixed daily schedule or year-round guarantee encoded';
add(
    'HKG',
    'YVR',
    'CX',
    yvr,
    yvrLimit,
    [],
    ['https://flights.cathaypacific.com/destinations/en_HK/flights-from-hong-kong-to-vancouver'],
);
add('YVR', 'HKG', 'CX', yvr, yvrLimit);
const seaLimit =
    'Evidence timetable covers 16 September–24 October 2026; service beyond that period is not asserted';
add('HKG', 'SEA', 'CX', sea, seaLimit, ['CX852']);
add('SEA', 'HKG', 'CX', sea, seaLimit, ['CX853']);
const bkkLimit =
    'Undated current route schedule; flight times, frequency, and date-specific availability are not encoded';
add('HKG', 'BKK', 'EK', bkk, bkkLimit, ['EK385']);
add('BKK', 'HKG', 'EK', bkk, bkkLimit, ['EK384']);
const dxbLimit =
    'Use only EK380/381/382/383 as route evidence; EK384/385 through Bangkok are not evidence of nonstop HKG–DXB';
add('HKG', 'DXB', 'EK', dxb, dxbLimit, ['EK381', 'EK383']);
add('DXB', 'HKG', 'EK', dxb, dxbLimit, ['EK380', 'EK382']);
for (const [dest, carrier] of [
    ['LHR', 'BA'],
    ['FRA', 'LH'],
    ['AMS', 'KL'],
    ['BOG', 'AV'],
    ['GRU', 'UA'],
    ['MEX', 'AM'],
    ['CAI', 'MS'],
])
    add(
        'ORD',
        dest,
        carrier,
        ord,
        'Snapshot dated 1 September 2026; no seasonal frequency or service on a specific day inferred',
    );
for (const dest of ['SYD', 'MEL'])
    add(
        'AKL',
        dest,
        'NZ',
        australia,
        'Commercial page contains an explicit route statement; fares alone were not used; dates/frequency not guaranteed',
    );
add(
    'AKL',
    'LAX',
    'NZ',
    lax,
    'Source marks the route year-round; individual departures remain subject to change',
);
const catalog = {
    schemaVersion: 2,
    catalogId: 'curated-nonstop-routes-2026-10-05',
    checkedDate: '2026-10-05',
    scope: '18 enabled directional nonstop passenger airport pairs supported by opened official source content. Eight indexed candidates are separate and disabled. Bounded coverage, not exhaustive or date-specific availability.',
    routeCount: 18,
    verifiedEnabledCount: 18,
    candidateCount: 8,
    candidateFile: 'route-candidates-disabled-2026-10-05.json',
    simulation: {
        requiredLabel: { en: 'SIMULATED', zhHant: '模擬' },
        description: {
            en: 'Real researched route pairs; aircraft positions, headings, progress and animation timing are simulated.',
            zhHant: '航線端點依公開資料查核；飛機位置、方向、進度及動畫時間均為模擬。',
        },
        liveFlightTracking: false,
        realDepartureOrArrivalClaims: false,
        realFlightNumbersForAnimatedObjects: false,
        runtimeFlightAPIRequired: false,
    },
    implementationNotes: [
        'Directional whitelist: never generate arbitrary pairs or reverse directions.',
        'Reference flight numbers are audit evidence only; animated objects use demo IDs.',
        'Join exact IATA to OurAirports; never guess omitted coordinates.',
        'Country filters use endpoint countryCode. HKG–Canada sample is YVR only; YYZ remains disabled.',
        'English and Traditional Chinese city/country labels use airport codes as identity.',
        'Explicit SIMULATED / 模擬 label; limited coverage, not date-specific availability.',
        'Schedules can change; service beyond a source validity window is not asserted.',
        'Load only enabled routes; never merge disabled candidates without fully opening primary sources.',
    ],
    uiDisclosure: {
        en: '18 researched routes • checked 5 Oct 2026 • simulated traffic • limited route coverage',
        zhHant: '已查核 18 條航線 · 查核日期 2026/10/05 · 模擬動態 · 航線收錄範圍有限',
    },
    evidencePolicy: {
        accepted:
            'Directly opened official airport nonstop lists, operating statements, or individual airline sectors. Indexed content alone is insufficient.',
        marketingOnlyRejected: true,
        unverifiedThirdPartyMirrorsUsedAsPrimary: false,
        sourceValidityNotLiveStatus: true,
        indexedOnlyEntriesEnabled: false,
        fullSourceOpeningRequired: true,
    },
    exclusions: [
        {
            id: 'AKL-ORD',
            reason: 'Air New Zealand current official network marks service paused',
            sourceURL: lax.sourceURL,
            checkedDate: '2026-10-05',
        },
        {
            id: 'HKG-DXB-via-BKK',
            reason: 'Emirates EK384/385 through Bangkok are not nonstop HKG–DXB sectors',
            sourceURL: dxb.sourceURL,
            checkedDate: '2026-10-05',
        },
        {
            id: 'YVR-BKK-on-Cathay',
            reason: 'Cathay page indicates connection via Hong Kong',
            sourceURL:
                'https://flights.cathaypacific.com/destinations/en_CA/flights-from-vancouver-to-bangkok',
            checkedDate: '2026-10-05',
        },
    ],
    routes,
};
await writeFile('public/data/simulated-routes.json', JSON.stringify(catalog, null, 2) + '\n');
console.log(
    'Saved',
    routes.length,
    'directional verified routes; disabled candidates are not supplied or loaded.',
);
