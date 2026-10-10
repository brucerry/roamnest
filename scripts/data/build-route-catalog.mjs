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
    CHC: ['Christchurch', '基督城', 'NZ', 'New Zealand', '紐西蘭'],
    WLG: ['Wellington', '威靈頓', 'NZ', 'New Zealand', '紐西蘭'],
    ZQN: ['Queenstown', '皇后鎮', 'NZ', 'New Zealand', '紐西蘭'],
    BNE: ['Brisbane', '布里斯本', 'AU', 'Australia', '澳洲'],
    OOL: ['Gold Coast', '黃金海岸', 'AU', 'Australia', '澳洲'],
    ADL: ['Adelaide', '阿德萊德', 'AU', 'Australia', '澳洲'],
    PER: ['Perth', '珀斯', 'AU', 'Australia', '澳洲'],
    HBA: ['Hobart', '荷巴特', 'AU', 'Australia', '澳洲'],
    CNS: ['Cairns', '凱恩斯', 'AU', 'Australia', '澳洲'],
    MCY: ['Sunshine Coast', '陽光海岸', 'AU', 'Australia', '澳洲'],
    HNL: ['Honolulu', '檀香山', 'US', 'United States', '美國'],
    IAH: ['Houston', '休斯敦', 'US', 'United States', '美國'],
    JFK: ['New York', '紐約', 'US', 'United States', '美國'],
    SFO: ['San Francisco', '三藩市', 'US', 'United States', '美國'],
    RAR: ['Rarotonga', '拉羅湯加', 'CK', 'Cook Islands', '庫克群島'],
    NAN: ['Nadi', '楠迪', 'FJ', 'Fiji', '斐濟'],
    IUE: ['Niue', '紐埃', 'NU', 'Niue', '紐埃'],
    APW: ['Apia', '阿皮亞', 'WS', 'Samoa', '薩摩亞'],
    TBU: ["Nuku'alofa", '努庫阿洛法', 'TO', 'Tonga', '湯加'],
    PPT: ['Papeete', '帕皮提', 'PF', 'French Polynesia', '法屬玻里尼西亞'],
    SIN: ['Singapore', '新加坡', 'SG', 'Singapore', '新加坡'],
    NRT: ['Tokyo Narita', '東京成田', 'JP', 'Japan', '日本'],
    HND: ['Tokyo Haneda', '東京羽田', 'JP', 'Japan', '日本'],
    TPE: ['Taipei Taoyuan', '台北桃園', 'TW', 'Taiwan', '台灣'],
    KIX: ['Osaka Kansai', '大阪關西', 'JP', 'Japan', '日本'],
    ICN: ['Seoul Incheon', '首爾仁川', 'KR', 'South Korea', '南韓'],
    CDG: ['Paris Charles de Gaulle', '巴黎戴高樂', 'FR', 'France', '法國'],
    YYZ: ['Toronto Pearson', '多倫多皮爾遜', 'CA', 'Canada', '加拿大'],
    PVG: ['Shanghai Pudong', '上海浦東', 'CN', 'China', '中國'],
    DPS: ['Bali Denpasar', '峇里島登巴薩', 'ID', 'Indonesia', '印尼'],
    MAD: ['Madrid', '馬德里', 'ES', 'Spain', '西班牙'],
    FCO: ['Rome Fiumicino', '羅馬菲烏米奇諾', 'IT', 'Italy', '義大利'],
};
Object.assign(endpoints, {
    KHH: ['Kaohsiung', '高雄', 'TW', 'Taiwan', '台灣'],
    RMQ: ['Taichung', '台中', 'TW', 'Taiwan', '台灣'],
    MFM: ['Macau', '澳門', 'MO', 'Macau', '澳門'],
    SGN: ['Ho Chi Minh City', '胡志明市', 'VN', 'Vietnam', '越南'],
    OKA: ['Okinawa Naha', '沖繩那霸', 'JP', 'Japan', '日本'],
    TAK: ['Takamatsu', '高松', 'JP', 'Japan', '日本'],
});
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
    AA: ['American Airlines', '美國航空'],
};
Object.assign(carriers, {
    SQ: ['Singapore Airlines', '新加坡航空'],
    JX: ['STARLUX Airlines', '星宇航空'],
    BR: ['EVA Air', '長榮航空'],
    CI: ['China Airlines', '中華航空'],
    TG: ['Thai Airways', '泰國航空'],
    NX: ['Air Macau', '澳門航空'],
    JL: ['Japan Airlines', '日本航空'],
    KE: ['Korean Air', '大韓航空'],
    UO: ['HK Express', '香港快運'],
    AE: ['Mandarin Airlines', '華信航空'],
    AF: ['Air France', '法國航空'],
    AC: ['Air Canada', '加拿大航空'],
});
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
function add(
    from,
    to,
    carrier,
    source,
    seasonality,
    refs = [],
    support = [],
    checked = '2026-10-05',
) {
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
        checkedDate: checked,
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
// New directions are individually supported; the return leg is never inferred.
const addCurrent = (from, to, source, seasonality, carrier = 'NZ', refs = []) =>
    add(from, to, carrier, source, seasonality, refs, source.supportingSourceURLs, '2026-10-10');
for (const [dest, seasonality] of [
    ['BNE', 'No date-specific schedule or frequency encoded'],
    ['OOL', 'Seasonal service; exact operating dates must be checked with the airline'],
    ['ADL', 'No date-specific schedule or frequency encoded'],
    ['PER', 'No date-specific schedule or frequency encoded'],
    ['HBA', 'Seasonal October–March service; exact operating dates must be checked'],
    ['CNS', 'Seasonal April–October service; exact operating dates must be checked'],
    ['MCY', 'Seasonal June–October service; exact operating dates must be checked'],
])
    addCurrent('AKL', dest, australia, seasonality);
for (const from of ['CHC', 'WLG', 'ZQN'])
    for (const to of ['SYD', 'MEL'])
        addCurrent(
            from,
            to,
            { ...australia, summary: 'Airline explicitly identifies this nonstop city pair' },
            'No date-specific schedule or frequency encoded',
        );
const network = {
    ...lax,
    summary: 'Destination appears in the airline nonstop-from-Auckland network table',
};
const endpointEvidence = {
    JFK: 'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-auckland-to-new-york',
    IAH: 'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-auckland-to-houston',
    APW: 'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-auckland-to-apia',
};
for (const to of ['HNL', 'IAH', 'JFK', 'SFO', 'YVR', 'RAR', 'NAN', 'IUE', 'APW', 'TBU', 'PPT'])
    addCurrent(
        'AKL',
        to,
        {
            ...network,
            supportingSourceURLs: endpointEvidence[to] ? [endpointEvidence[to]] : [],
        },
        'Source lists year-round service; individual departures remain subject to change',
    );
for (const [to, slug, outbound, inbound] of [
    ['SIN', 'singapore', ['EK352'], ['EK353']],
    ['NRT', 'tokyo-narita', ['EK318'], ['EK319']],
    ['LHR', 'london-heathrow', ['EK3'], ['EK2']],
]) {
    const source = evidence(
        `https://www.emirates.com/english/destinations/dxb/${to.toLowerCase()}/flights-from-dubai-to-${slug}/`,
        'official_airline_current_route_schedule',
        `Emirates: Dubai–${endpoints[to][0]} flight schedules`,
        'Opened schedule identifies both directions as individual airport-to-airport flight sectors',
    );
    const limit =
        'Undated schedule snapshot; no date-specific frequency or availability guaranteed';
    addCurrent('DXB', to, source, limit, 'EK', outbound);
    addCurrent(to, 'DXB', source, limit, 'EK', inbound);
}
// Cathay's expanded flight details show one operating sector for each direction.
// Codeshares and connecting/through flights are excluded from this sample.
const cathaySample = evidence(
    'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
    'official_airline_sampled_individual_sector',
    'Cathay: Flight timetable, sampled 10–16 October 2026',
    'Expanded timetable detail shows one Cathay-operated airport-to-airport sector with no intermediate airport',
    null,
    '2026-10-10',
    '2026-10-16',
    'rendered_interactive_public_timetable',
);
for (const [to, ref] of [
    ['TPE', 'CX422'],
    ['NRT', 'CX524'],
    ['HND', 'CX548'],
    ['KIX', 'CX566'],
    ['ICN', 'CX434'],
    ['SIN', 'CX659'],
    ['SYD', 'CX181'],
    ['MEL', 'CX105'],
    ['AKL', 'CX113'],
    ['LHR', 'CX257'],
    ['CDG', 'CX261'],
    ['YYZ', 'CX820'],
])
    addCurrent(
        'HKG',
        to,
        cathaySample,
        'Evidence timetable covers 10–16 October 2026; service beyond that period is not asserted',
        'CX',
        [ref],
    );
// The Auckland column has an affirmative nonstop marker for each city.
// Official route pages establish exact destination airports independently.
for (const [to, slug] of [
    ['HKG', 'hong-kong'],
    ['NRT', 'tokyo'],
    ['SIN', 'singapore'],
    ['TPE', 'taipei'],
    ['PVG', 'shanghai'],
    ['DPS', 'bali-denpasar'],
])
    addCurrent(
        'AKL',
        to,
        {
            ...network,
            supportingSourceURLs: [
                `https://www.airnewzealand.co.nz/flights/en-nz/flights-from-auckland-to-${slug}`,
            ],
        },
        to === 'DPS'
            ? 'Seasonal service; exact operating dates must be checked with the airline'
            : 'No date-specific schedule or frequency encoded',
    );
for (const [to, slug, outbound, inbound] of [
    ['CDG', 'paris', ['EK71', 'EK73', 'EK75'], ['EK72', 'EK74', 'EK76']],
    ['FRA', 'frankfurt', ['EK43', 'EK45', 'EK47'], ['EK44', 'EK46', 'EK48']],
    ['AMS', 'amsterdam', ['EK145', 'EK147', 'EK149'], ['EK146', 'EK148', 'EK150']],
]) {
    const source = evidence(
        `https://www.emirates.com/english/destinations/dxb/${to.toLowerCase()}/flights-from-dubai-to-${slug}/`,
        'official_airline_current_route_schedule',
        `Emirates: Dubai–${endpoints[to][0]} flight schedules`,
        'Opened schedule identifies both directions as individual airport-to-airport flight sectors',
    );
    const limit =
        'Undated schedule snapshot; no date-specific frequency or availability guaranteed';
    addCurrent('DXB', to, source, limit, 'EK', outbound);
    addCurrent(to, 'DXB', source, limit, 'EK', inbound);
}
for (const [to, carrier] of [
    ['CDG', 'UA'],
    ['MAD', 'AA'],
    ['FCO', 'UA'],
])
    addCurrent(
        'ORD',
        to,
        ord,
        'Snapshot dated 1 September 2026; no seasonal frequency or service on a specific day inferred',
        carrier,
    );
// Independently approved outbound additions. No automatic reverse directions.
const originExpansion = [
    {
        from: 'CHC',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-christchurch-to-auckland',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Air New Zealand: CHC to AKL',
            summary:
                'Opened current official page explicitly identifies this outbound nonstop service; route page pins the exact airport codes.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'CHC',
        to: 'WLG',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-christchurch-to-wellington',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Air New Zealand: CHC to WLG',
            summary:
                'Opened current official page explicitly identifies this outbound nonstop service; route page pins the exact airport codes.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'CHC',
        to: 'ZQN',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-christchurch-to-queenstown',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Air New Zealand: CHC to ZQN',
            summary:
                'Opened current official page explicitly identifies this outbound nonstop service; route page pins the exact airport codes.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'WLG',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-wellington-to-auckland',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Air New Zealand: WLG to AKL',
            summary:
                'Opened current official page explicitly identifies this outbound nonstop service; route page pins the exact airport codes.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'WLG',
        to: 'CHC',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-wellington-to-christchurch',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Air New Zealand: WLG to CHC',
            summary:
                'Opened current official page explicitly identifies this outbound nonstop service; route page pins the exact airport codes.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'WLG',
        to: 'ZQN',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-wellington-to-queenstown',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Air New Zealand: WLG to ZQN',
            summary:
                'Opened current official page explicitly identifies this outbound nonstop service; route page pins the exact airport codes.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'ZQN',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-queenstown-to-auckland',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Air New Zealand: ZQN to AKL',
            summary:
                'Opened current official page explicitly identifies this outbound nonstop service; route page pins the exact airport codes.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality:
            'Source lists year-round service; individual departures remain subject to change',
        checked: '2026-10-10',
    },
    {
        from: 'ZQN',
        to: 'CHC',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-queenstown-to-christchurch',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Air New Zealand: ZQN to CHC',
            summary:
                'Opened current official page explicitly identifies this outbound nonstop service; route page pins the exact airport codes.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'ZQN',
        to: 'WLG',
        carrier: 'NZ',
        source: {
            sourceURL: 'https://www.airnewzealand.co.nz/flights/en-nz/flights-to-wellington',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Air New Zealand: ZQN to WLG',
            summary:
                'Opened current official page explicitly identifies this outbound nonstop service; route page pins the exact airport codes.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-queenstown-to-wellington',
            ],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'FRA',
        to: 'HKG',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/de/en/o-d/cy-cy/frankfurt-hong-kong',
            sourceType: 'official_airline_current_route_schedule',
            sourceTitle: 'Lufthansa: FRA-HKG flightplan',
            summary: '21:40 FRA–15:20 HKG, LH796, 11:40 duration',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH796'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated schedule snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'FRA',
        to: 'LHR',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/de/en/o-d/cy-cy/frankfurt-london',
            sourceType: 'official_airline_current_route_schedule',
            sourceTitle: 'Lufthansa: FRA-LHR flightplan',
            summary: '08:00 FRA–08:40 LHR, LH900, 01:40 duration',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH900'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated schedule snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'FRA',
        to: 'JFK',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/de/en/o-d/cy-cy/frankfurt-new-york',
            sourceType: 'official_airline_current_route_schedule',
            sourceTitle: 'Lufthansa: FRA-JFK flightplan',
            summary: '10:55 FRA–13:35 JFK, LH400, 08:40 duration',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH400'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated schedule snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'FRA',
        to: 'SIN',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/sg/en/o-d/cy-cy/frankfurt-singapore',
            sourceType: 'official_airline_current_route_schedule',
            sourceTitle: 'Lufthansa: FRA-SIN flightplan',
            summary: '21:50 FRA–16:30 SIN, LH780, 12:40 duration',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH780'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated schedule snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'LHR',
        to: 'ORD',
        carrier: 'UA',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/us/en/o-d/cy-cy/london-chicago',
            sourceType: 'official_airline_current_route_schedule',
            sourceTitle: 'Lufthansa: LHR-ORD flightplan',
            summary: '08:00 LHR–11:10 ORD, LH9348 explicitly operated by UA, 09:10 duration',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH9348'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated schedule snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'HKG',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TPE&arrAirport=HKG&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: TPE-HKG timetable',
            summary:
                'Opened dated timetable identifies exact TPE-HKG endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0233', 'JX0235'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'HKG',
        carrier: 'SQ',
        source: {
            sourceURL: 'https://www.singaporeair.com/sg/en/plan-travel/destinations/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Singapore Airlines: SIN-HKG nonstop service',
            summary:
                'Current origin-specific airline FAQ explicitly identifies Singapore Changi (SIN) and nonstop service; destination index identifies HKG, TPE, NRT (Tokyo HND/NRT both listed) or SYD with SQ operator.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'TPE',
        carrier: 'SQ',
        source: {
            sourceURL: 'https://www.singaporeair.com/sg/en/plan-travel/destinations/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Singapore Airlines: SIN-TPE nonstop service',
            summary:
                'Current origin-specific airline FAQ explicitly identifies Singapore Changi (SIN) and nonstop service; destination index identifies HKG, TPE, NRT (Tokyo HND/NRT both listed) or SYD with SQ operator.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'NRT',
        carrier: 'SQ',
        source: {
            sourceURL: 'https://www.singaporeair.com/sg/en/plan-travel/destinations/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Singapore Airlines: SIN-NRT nonstop service',
            summary:
                'Current origin-specific airline FAQ explicitly identifies Singapore Changi (SIN) and nonstop service; destination index identifies HKG, TPE, NRT (Tokyo HND/NRT both listed) or SYD with SQ operator.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'SYD',
        carrier: 'SQ',
        source: {
            sourceURL: 'https://www.singaporeair.com/sg/en/plan-travel/destinations/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Singapore Airlines: SIN-SYD nonstop service',
            summary:
                'Current origin-specific airline FAQ explicitly identifies Singapore Changi (SIN) and nonstop service; destination index identifies HKG, TPE, NRT (Tokyo HND/NRT both listed) or SYD with SQ operator.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'AMS',
        to: 'SIN',
        carrier: 'SQ',
        source: {
            sourceURL:
                'https://www.singaporeair.com/en_UK/nl/plan-travel/local-promotions/flights-tickets-vietnam/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'Singapore Airlines: AMS-SIN nonstop service',
            summary: 'Current airline page explicitly says Amsterdam non-stop to Singapore',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [
                'https://www.singaporeair.com/sg/en/plan-travel/destinations/flights-from-singapore-to-netherlands/',
            ],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'NRT',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TPE&arrAirport=NRT&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: TPE-NRT timetable',
            summary:
                'Opened dated timetable identifies exact TPE-NRT endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0800', 'JX0802', 'JX0804'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'KIX',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TPE&arrAirport=KIX&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: TPE-KIX timetable',
            summary:
                'Opened dated timetable identifies exact TPE-KIX endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0820', 'JX0822'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'SIN',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TPE&arrAirport=SIN&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: TPE-SIN timetable',
            summary:
                'Opened dated timetable identifies exact TPE-SIN endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0771'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'BKK',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TPE&arrAirport=BKK&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: TPE-BKK timetable',
            summary:
                'Opened dated timetable identifies exact TPE-BKK endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0741', 'JX0745'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'SEA',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TPE&arrAirport=SEA&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: TPE-SEA timetable',
            summary:
                'Opened dated timetable identifies exact TPE-SEA endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0032'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'LAX',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TPE&arrAirport=LAX&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: TPE-LAX timetable',
            summary:
                'Opened dated timetable identifies exact TPE-LAX endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0002'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'SFO',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TPE&arrAirport=SFO&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: TPE-SFO timetable',
            summary:
                'Opened dated timetable identifies exact TPE-SFO endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0012'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'RMQ',
        to: 'MFM',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=RMQ&arrAirport=MFM&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: RMQ-MFM timetable',
            summary:
                'Opened dated timetable identifies exact RMQ-MFM endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0329', 'JX0331'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'RMQ',
        to: 'OKA',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=RMQ&arrAirport=OKA&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: RMQ-OKA timetable',
            summary:
                'Opened dated timetable identifies exact RMQ-OKA endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0302', 'JX0312'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'MFM',
        to: 'TPE',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=MFM&arrAirport=TPE&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: MFM-TPE timetable',
            summary:
                'Opened dated timetable identifies exact MFM-TPE endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0202', 'JX0206'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'MFM',
        to: 'RMQ',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=MFM&arrAirport=RMQ&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: MFM-RMQ timetable',
            summary:
                'Opened dated timetable identifies exact MFM-RMQ endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0330', 'JX0332'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'SEA',
        to: 'TPE',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=SEA&arrAirport=TPE&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: SEA-TPE timetable',
            summary:
                'Opened dated timetable identifies exact SEA-TPE endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0031'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'NRT',
        to: 'TPE',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=NRT&arrAirport=TPE&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: NRT-TPE timetable',
            summary:
                'Opened dated timetable identifies exact NRT-TPE endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0801', 'JX0803', 'JX0805'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'BKK',
        to: 'TPE',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=BKK&arrAirport=TPE&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: BKK-TPE timetable',
            summary:
                'Opened dated timetable identifies exact BKK-TPE endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0742', 'JX0746'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'KHH',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_dated_sector_schedule',
            sourceTitle: 'Kaohsiung International Airport: KHH-HKG sector',
            summary:
                'Departure International 2026-10-05 ~ 2026-10-11 13:40 → 15:25 Hong Kong Cathay Pacific CX423 77W Sun●Mon●Tue●Wed●Thu●Fri●Sat●',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX423'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 5–11 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'KHH',
        to: 'NRT',
        carrier: 'BR',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_dated_sector_schedule',
            sourceTitle: 'Kaohsiung International Airport: KHH-NRT sector',
            summary:
                'Departure International 2026-10-05 ~ 2026-10-11 07:00 → 11:45 Tokyo/Narita EVA Air BR108 AC6547;NH5832 321 Sun●Mon●Tue●Wed●Thu●Fri●Sat●',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['BR108'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 5–11 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'KHH',
        to: 'KIX',
        carrier: 'BR',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_dated_sector_schedule',
            sourceTitle: 'Kaohsiung International Airport: KHH-KIX sector',
            summary:
                'Departure International 2026-10-05 ~ 2026-10-11 07:05 → 11:10 Osaka/Kansai EVA Air BR182 NH5840 321 Sun●Mon●Tue●Wed●Thu●Fri●Sat●',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['BR182'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 5–11 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'KHH',
        to: 'ICN',
        carrier: 'BR',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_dated_sector_schedule',
            sourceTitle: 'Kaohsiung International Airport: KHH-ICN sector',
            summary:
                'Departure International 2026-10-05 ~ 2026-10-11 06:55 → 10:45 Seoul/Incheon EVA Air BR146 AC6541;OZ6878 321 Sun○Mon○Tue●Wed●Thu○Fri●Sat●',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['BR146'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 5–11 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'KHH',
        to: 'SIN',
        carrier: 'CI',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_dated_sector_schedule',
            sourceTitle: 'Kaohsiung International Airport: KHH-SIN sector',
            summary:
                'Departure International 2026-10-05 ~ 2026-10-11 12:55 → 17:15 Singapore China Airlines CI757 KL4992;AE5307 73K Sun○Mon○Tue●Wed○Thu●Fri○Sat●',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CI757'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 5–11 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'KHH',
        to: 'BKK',
        carrier: 'TG',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_dated_sector_schedule',
            sourceTitle: 'Kaohsiung International Airport: KHH-BKK sector',
            summary:
                'Departure International 2026-10-05 ~ 2026-10-11 17:15 → 19:55 Bangkok/Suvarnabhumi Thai Airways TG631 TK8497 320 Sun●Mon●Tue●Wed●Thu●Fri●Sat●',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['TG631'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 5–11 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'MFM',
        to: 'KHH',
        carrier: 'NX',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_dated_sector_schedule',
            sourceTitle: 'Kaohsiung International Airport: MFM-KHH sector',
            summary:
                'Arrival International 2026-10-05 ~ 2026-10-11 21:35 → 23:00 Macau Air Macau NX658 BR2914 321 Sun●Mon●Tue●Wed●Thu●Fri●Sat●',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NX658'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 5–11 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'YVR',
        to: 'TPE',
        carrier: 'BR',
        source: {
            sourceURL:
                'https://www.yvr.ca/-/media/yvr/documents/maps/routes-brochure-2024/2026_routebrochure_july_english_adjusted.pdf',
            sourceType: 'official_airport_nonstop_destination_list',
            sourceTitle: 'YVR: 2026 nonstop destinations (updated July 2026)',
            summary:
                '2026 official nonstop brochure lists exact airport and actual selected carrier in both summer and winter rows; no codeshare or one-stop footnote attached.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [
                'https://www.yvr.ca/en/passengers/flights/airlines-and-destinations',
            ],
        },
        seasonality:
            'July 2026 seasonal snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'YVR',
        to: 'NRT',
        carrier: 'JL',
        source: {
            sourceURL:
                'https://www.yvr.ca/-/media/yvr/documents/maps/routes-brochure-2024/2026_routebrochure_july_english_adjusted.pdf',
            sourceType: 'official_airport_nonstop_destination_list',
            sourceTitle: 'YVR: 2026 nonstop destinations (updated July 2026)',
            summary:
                '2026 official nonstop brochure lists exact airport and actual selected carrier in both summer and winter rows; no codeshare or one-stop footnote attached.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [
                'https://www.yvr.ca/en/passengers/flights/airlines-and-destinations',
            ],
        },
        seasonality:
            'July 2026 seasonal snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'YVR',
        to: 'LHR',
        carrier: 'BA',
        source: {
            sourceURL:
                'https://www.yvr.ca/-/media/yvr/documents/maps/routes-brochure-2024/2026_routebrochure_july_english_adjusted.pdf',
            sourceType: 'official_airport_nonstop_destination_list',
            sourceTitle: 'YVR: 2026 nonstop destinations (updated July 2026)',
            summary:
                '2026 official nonstop brochure lists exact airport and actual selected carrier in both summer and winter rows; no codeshare or one-stop footnote attached.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [
                'https://www.yvr.ca/en/passengers/flights/airlines-and-destinations',
            ],
        },
        seasonality:
            'July 2026 seasonal snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'YVR',
        to: 'ICN',
        carrier: 'KE',
        source: {
            sourceURL:
                'https://www.yvr.ca/-/media/yvr/documents/maps/routes-brochure-2024/2026_routebrochure_july_english_adjusted.pdf',
            sourceType: 'official_airport_nonstop_destination_list',
            sourceTitle: 'YVR: 2026 nonstop destinations (updated July 2026)',
            summary:
                '2026 official nonstop brochure lists exact airport and actual selected carrier in both summer and winter rows; no codeshare or one-stop footnote attached.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [
                'https://www.yvr.ca/en/passengers/flights/airlines-and-destinations',
            ],
        },
        seasonality:
            'July 2026 seasonal snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'AMS',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'Cathay Pacific: AMS-HKG timetable',
            summary:
                'Opened public timetable identifies one operating AMS–HKG sector, 12:20 to 06:10, explicit zero stops and actual operator CX; connecting results are excluded.',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX270'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=AMS&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Evidence timetable covers 10–16 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'CDG',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'Cathay Pacific: CDG-HKG timetable',
            summary:
                'Opened public timetable identifies one operating CDG–HKG sector, 12:20 to 06:15, explicit zero stops and actual operator CX; connecting results are excluded.',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX260'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=CDG&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Evidence timetable covers 10–16 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'LHR',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'Cathay Pacific: LHR-HKG timetable',
            summary:
                'Opened public timetable identifies one operating LHR–HKG sector, 12:20 to 07:50, explicit zero stops and actual operator CX; connecting results are excluded.',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX252'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=LHR&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Evidence timetable covers 10–16 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'NRT',
        to: 'HKG',
        carrier: 'UO',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'Cathay Pacific: NRT-HKG timetable',
            summary:
                'Opened public timetable identifies one operating NRT–HKG sector, 08:00 to 11:55, explicit zero stops and actual operator UO; connecting results are excluded.',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX5857'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=NRT&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Evidence timetable covers 10–16 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'RMQ',
        to: 'HKG',
        carrier: 'UO',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'Cathay Pacific: RMQ-HKG timetable',
            summary:
                'Opened public timetable identifies one operating RMQ–HKG sector, 10:25 to 12:10, explicit zero stops and actual operator UO; connecting results are excluded.',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX5193'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=RMQ&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Evidence timetable covers 10–16 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'RMQ',
        to: 'SGN',
        carrier: 'AE',
        source: {
            sourceURL: 'https://www.mandarin-airlines.com/b2c/flightquery?query=1',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'Mandarin Airlines: October 2026 timetable',
            summary:
                'International table independently pins RMQ → SGN: AE1857 08:00 → 10:20, 3h20, daily through 24 October. The 07:55 row starts 25 October. Unlike 5xxx codeshare rows, 1857 has no codeshare operator substitution.',
            sourcePublishedDate: null,
            validFrom: '2026-10-01',
            validThrough: '2026-10-24',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['AE1857'],
            supportingSourceURLs: [
                'https://drive.google.com/file/d/1xm9GJd89o3qP7tPEUlWg1URFwIPIZeji/view',
            ],
        },
        seasonality:
            'Evidence timetable covers 1–24 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'RMQ',
        to: 'TAK',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=RMQ&arrAirport=TAK&date=2026-10-10',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'STARLUX: RMQ-TAK timetable',
            summary:
                'Opened dated timetable identifies exact RMQ-TAK endpoints, STARLUX as operator, an explicit Non-stop sector and affirmative sample-week operating days. Reference flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'rendered_interactive_public_timetable',
            referenceFlightNumbers: ['JX0300'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Evidence timetable covers 7–13 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'AMS',
        to: 'LHR',
        carrier: 'KL',
        source: {
            sourceURL: 'https://www.klm.nl/nl-nl/vliegtickets-londen',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'KL: AMS-LHR operating evidence',
            summary:
                'Opened airline route table specifies Amsterdam Schiphol (AMS) to London Heathrow (LHR), KLM, 1h20 and possible intermediate stops N/A. Other connecting rows explicitly name Amsterdam as their stop; this row identifies none. No frequency encoded.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'AMS',
        to: 'FRA',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/de/en/o-d/cy-cy/amsterdam-frankfurt',
            sourceType: 'official_airline_current_route_schedule',
            sourceTitle: 'LH: AMS-FRA operating evidence',
            summary:
                'Opened Flightplan identifies a complete individual Lufthansa sector: AMS 08:00 to FRA 09:10, LH1003. This selected row has no alternate-operator note; connecting rows and Lufthansa City Airlines rows are excluded.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH1003'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated schedule snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'CDG',
        to: 'FRA',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/de/en/o-d/cy-cy/paris-frankfurt',
            sourceType: 'official_airline_current_route_schedule',
            sourceTitle: 'LH: CDG-FRA operating evidence',
            summary:
                'Opened Flightplan identifies a complete individual Lufthansa sector: CDG 07:45 to FRA 09:00, LH1051. This selected row has no alternate-operator note; connecting rows and Lufthansa City Airlines rows are excluded.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH1051'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated schedule snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'LHR',
        to: 'FRA',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/de/en/o-d/cy-cy/london-frankfurt',
            sourceType: 'official_airline_current_route_schedule',
            sourceTitle: 'LH: LHR-FRA operating evidence',
            summary:
                'Opened Flightplan identifies a complete individual Lufthansa sector: LHR 07:30 to FRA 10:05, LH923. This selected row has no alternate-operator note; connecting rows and Lufthansa City Airlines rows are excluded.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH923'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated schedule snapshot; no date-specific frequency or availability guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'CDG',
        to: 'SIN',
        carrier: 'SQ',
        source: {
            sourceURL:
                'https://www.singaporeair.com/fr/en/plan-travel/destinations/flights-from-paris-to-singapore/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'SQ: CDG-SIN operating evidence',
            summary:
                'Opened current operating-airline page explicitly states nonstop flights from this origin to Singapore Changi (SIN). All Singapore Airlines Paris services use Charles de Gaulle (CDG).',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'BKK',
        to: 'SIN',
        carrier: 'SQ',
        source: {
            sourceURL:
                'https://www.singaporeair.com/th/en/plan-travel/destinations/flights-from-bangkok-to-singapore/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'SQ: BKK-SIN operating evidence',
            summary:
                'Opened current operating-airline page explicitly states nonstop flights from this origin to Singapore Changi (SIN). The airport FAQ states Bangkok services use Suvarnabhumi (BKK), not Don Mueang.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'NRT',
        to: 'SIN',
        carrier: 'SQ',
        source: {
            sourceURL:
                'https://www.singaporeair.com/jp/en/plan-travel/destinations/flights-from-tokyo-to-singapore/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'SQ: NRT-SIN operating evidence',
            summary:
                'Opened current operating-airline page explicitly states nonstop flights from this origin to Singapore Changi (SIN). The airport FAQ explicitly includes both Narita (NRT) and Haneda, as separately identified nonstop origins.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'BKK',
        to: 'NRT',
        carrier: 'TG',
        source: {
            sourceURL:
                'https://www.thaiairways.com/en-th/content/offers-Promotions/special-offers/getaway-for-less/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'TG: BKK-NRT operating evidence',
            summary:
                'Current THAI offer explicitly describes non-stop THAI-operated flights from Bangkok, lists Narita separately from Haneda, and uses BKK for its departure baggage rule. Sale is current through 31 October 2026. Japan fare blackouts are promotion restrictions, not assertions that the flight service is paused. No fare dates, frequency or availability are encoded.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'BKK',
        to: 'ICN',
        carrier: 'TG',
        source: {
            sourceURL:
                'https://www.thaiairways.com/en-th/content/offers-Promotions/special-offers/getaway-for-less/',
            sourceType: 'official_airline_explicit_nonstop_route_statement',
            sourceTitle: 'TG: BKK-ICN operating evidence',
            summary:
                'Current THAI offer explicitly describes non-stop THAI-operated Bangkok to Seoul service. Independently opened Incheon arrivals for 10 October identify TG652, Thai Airways International, from BANGKOK (BKK), arriving ICN 15:25 scheduled / 15:36 actual. Airport row pins exact ICN/operator; nonstop proof comes from THAI, not from a departure-time-only table.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['TG652'],
            supportingSourceURLs: ['https://www.airport.kr/ap_en/1399/subview.do'],
        },
        seasonality: 'No date-specific schedule or frequency encoded',
        checked: '2026-10-10',
    },
    {
        from: 'SEA',
        to: 'NRT',
        carrier: 'JL',
        source: {
            sourceURL: 'https://www.portseattle.org/page/nonstop-international-routes',
            sourceType: 'official_airport_nonstop_destination_list',
            sourceTitle: 'Seattle: 2026 nonstop international routes and current departures',
            summary:
                'Opened airport 2026 international network explicitly identifies nonstop routes to and from Seattle, including this exact destination. Independently opened 10 October departure status pins the actual operator and airport: JL67, Narita, 13:15, Japan Airlines. Primary operating row selected; codeshares at other flight times do not establish this carrier.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['JL67'],
            supportingSourceURLs: [
                'https://www.portseattle.org/sea/flight-status?airline=&arr_or_depart=D&arrive_city=NRT&datetime_end=&datetime_start=&flightNo=&flight_date=2026-10-10',
            ],
        },
        seasonality:
            '2026 nonstop network with 10 October flight corroboration; future frequency or availability is not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'SEA',
        to: 'CDG',
        carrier: 'AF',
        source: {
            sourceURL: 'https://www.portseattle.org/page/nonstop-international-routes',
            sourceType: 'official_airport_nonstop_destination_list',
            sourceTitle: 'Seattle: 2026 nonstop international routes and current departures',
            summary:
                'Opened airport 2026 international network explicitly identifies nonstop routes to and from Seattle, including this exact destination. Independently opened 10 October departure status pins the actual operator and airport: AF337, Charles de Gaulle, 13:30, Air France. Primary operating row selected; codeshares at other flight times do not establish this carrier.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['AF337'],
            supportingSourceURLs: [
                'https://www.portseattle.org/sea/flight-status?airline=&arr_or_depart=D&arrive_city=CDG&datetime_end=&datetime_start=&flightNo=&flight_date=2026-10-10',
            ],
        },
        seasonality:
            '2026 nonstop network with 10 October flight corroboration; future frequency or availability is not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'SEA',
        to: 'LHR',
        carrier: 'BA',
        source: {
            sourceURL: 'https://www.portseattle.org/page/nonstop-international-routes',
            sourceType: 'official_airport_nonstop_destination_list',
            sourceTitle: 'Seattle: 2026 nonstop international routes and current departures',
            summary:
                'Opened airport 2026 international network explicitly identifies nonstop routes to and from Seattle, including this exact destination. Independently opened 10 October departure status pins the actual operator and airport: BA52, Heathrow, 13:30 scheduled / 14:50 delayed, British Airways. Primary operating row selected; codeshares at other flight times do not establish this carrier.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['BA52'],
            supportingSourceURLs: [
                'https://www.portseattle.org/sea/flight-status?airline=&arr_or_depart=D&arrive_city=LHR&datetime_end=&datetime_start=&flightNo=&flight_date=2026-10-10',
            ],
        },
        seasonality:
            '2026 nonstop network with 10 October flight corroboration; future frequency or availability is not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'NRT',
        to: 'SEA',
        carrier: 'JL',
        source: {
            sourceURL: 'https://www.portseattle.org/page/nonstop-international-routes',
            sourceType: 'official_airport_nonstop_destination_list',
            sourceTitle: 'Seattle nonstop network and Narita current departures',
            summary:
                'Opened airport 2026 network explicitly covers nonstop international routes to AND from Seattle and separately includes Narita. Independent Narita outbound status for 10 October identifies Japan Airlines JL0068 departing for SEATTLE at 17:45 scheduled / 18:21 actual. This independently observed outbound flight pins the NRT origin and actual operator; the reverse is not inferred from SEA departure evidence.',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['JL0068'],
            supportingSourceURLs: [
                'https://www.narita-airport.jp/en/flight/dep-search/?keywordAirlineCodeL=JAPAN+AIRLINES&keywordAirlineCodeV=JL',
            ],
        },
        seasonality:
            '2026 nonstop network with 10 October flight corroboration; future frequency or availability is not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'MFM',
        to: 'NRT',
        carrier: 'NX',
        source: {
            sourceURL: 'https://www.macau-airport.com/en/flights/timetable/departures',
            sourceType: 'official_airport_matched_individual_sector',
            sourceTitle: 'Macau and NRT: matching current sector records',
            summary:
                'Macau current weekly departure table, updated 6 October, identifies NX862 to exact NRT. Independently opened destination-airport 10 October arrival record identifies the same flight number, origin MACAU/MFM and actual operator AIR MACAU. Together the adjacent departure and arrival records identify the complete individual sector: MFM 09:30 departure; Narita arrival 15:00 scheduled / 14:36 actual. Codeshare numbers are excluded and no extended operating schedule is inferred.',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NX862'],
            supportingSourceURLs: [
                'https://www.narita-airport.jp/en/flight/arr-search/?keywordAirlineCodeL=AIR+MACAU&keywordAirlineCodeV=NX',
            ],
        },
        seasonality:
            'Matched airport sector sampled on 10 October 2026; service on other dates is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'MFM',
        to: 'ICN',
        carrier: 'NX',
        source: {
            sourceURL: 'https://www.macau-airport.com/en/flights/timetable/departures',
            sourceType: 'official_airport_matched_individual_sector',
            sourceTitle: 'Macau and ICN: matching current sector records',
            summary:
                'Macau current weekly departure table, updated 6 October, identifies NX822 to exact ICN. Independently opened destination-airport 10 October arrival record identifies the same flight number, origin MACAU/MFM and actual operator AIR MACAU. Together the adjacent departure and arrival records identify the complete individual sector: MFM 08:35 departure; Incheon arrival 13:15 scheduled / 13:06 actual. Codeshare numbers are excluded and no extended operating schedule is inferred.',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NX822'],
            supportingSourceURLs: ['https://www.airport.kr/ap_en/1399/subview.do'],
        },
        seasonality:
            'Matched airport sector sampled on 10 October 2026; service on other dates is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'HKG',
        to: 'KHH',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'Cathay Pacific: HKG-KHH timetable',
            summary:
                'Independently opened public timetable identifies one HKG–KHH sector, 08:35 to 10:10, explicit zero stops and actual operator Cathay Pacific Airways (CX). Connecting results are excluded; marketing flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX432'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=HKG&destination=KHH&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Evidence timetable covers 10–16 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
    {
        from: 'HKG',
        to: 'RMQ',
        carrier: 'UO',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_dated_schedule',
            sourceTitle: 'Cathay Pacific: HKG-RMQ timetable',
            summary:
                'Independently opened public timetable identifies one HKG–RMQ sector, 07:55 to 09:35, explicit zero stops and actual operator HK Express (UO). Connecting results are excluded; marketing flight numbers are evidence only.',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX5192'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=HKG&destination=RMQ&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Evidence timetable covers 10–16 October 2026; service beyond that period is not asserted',
        checked: '2026-10-10',
    },
];
for (const row of originExpansion)
    add(
        row.from,
        row.to,
        row.carrier,
        row.source,
        row.seasonality,
        row.source.referenceFlightNumbers,
        row.source.supportingSourceURLs,
        row.checked,
    );
// Each reverse direction passed independent official-source research.
const reverseExpansion = [
    {
        from: 'FRA',
        to: 'ORD',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/us/en/o-d/cy-cy/frankfurt-chicago',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'LH: verified FRA-ORD operating direction',
            summary:
                'Directly opened current official airline flightplan establishes exact individual sector and actual operator; regularly changing schedule',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH430'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'AMS',
        to: 'ORD',
        carrier: 'UA',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/us/en/o-d/cy-cy/amsterdam-chicago',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'UA: verified AMS-ORD operating direction',
            summary:
                'Directly opened current official airline flightplan establishes exact individual sector and actual operator; regularly changing schedule',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH9154'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'SYD',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=SYD&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified SYD-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ110'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'MEL',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=MEL&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified MEL-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ120'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'LAX',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=LAX&destination=AKL&date=2026-10-10&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified LAX-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ5'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'BNE',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=BNE&destination=AKL&date=2026-10-10&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified BNE-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ146'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'OOL',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=OOL&destination=AKL&date=2026-10-10&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified OOL-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ188'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'ADL',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=ADL&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified ADL-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ192'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'PER',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=PER&destination=AKL&date=2026-10-10&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified PER-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ176'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'HBA',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=HBA&destination=AKL&date=2026-10-27&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified HBA-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-27',
            validThrough: '2026-10-27',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ196'],
            supportingSourceURLs: [],
        },
        seasonality: 'Seasonal October–March service; exact operating dates must be checked',
        checked: '2026-10-10',
    },
    {
        from: 'CNS',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=CNS&destination=AKL&date=2026-10-10&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified CNS-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ162'],
            supportingSourceURLs: [],
        },
        seasonality: 'Seasonal April–October service; exact operating dates must be checked',
        checked: '2026-10-10',
    },
    {
        from: 'MCY',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=MCY&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified MCY-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ168'],
            supportingSourceURLs: [],
        },
        seasonality: 'Seasonal June–October service; exact operating dates must be checked',
        checked: '2026-10-10',
    },
    {
        from: 'SYD',
        to: 'CHC',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=SYD&destination=CHC&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified SYD-CHC operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ224'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'MEL',
        to: 'CHC',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=MEL&destination=CHC&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified MEL-CHC operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ216'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'SYD',
        to: 'WLG',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=SYD&destination=WLG&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified SYD-WLG operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ248'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'MEL',
        to: 'WLG',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=MEL&destination=WLG&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified MEL-WLG operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ254'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'SYD',
        to: 'ZQN',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=SYD&destination=ZQN&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified SYD-ZQN operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ232'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'MEL',
        to: 'ZQN',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=MEL&destination=ZQN&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified MEL-ZQN operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ264'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'HNL',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=HNL&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified HNL-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ9'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'IAH',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=IAH&destination=AKL&date=2026-10-13&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified IAH-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-13',
            validThrough: '2026-10-13',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ29'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'SFO',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=SFO&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified SFO-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ7'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'YVR',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=YVR&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified YVR-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ23'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'RAR',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=RAR&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified RAR-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ945'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'NAN',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=NAN&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified NAN-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ951'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'IUE',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=IUE&destination=AKL&date=2026-10-16&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified IUE-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-16',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ937'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'APW',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=APW&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified APW-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ993'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'TBU',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=TBU&destination=AKL&date=2026-10-13&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified TBU-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-13',
            validThrough: '2026-10-13',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ975'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'PPT',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=PPT&destination=AKL&date=2026-10-16&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified PPT-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-16',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ903'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'HND',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'CX: verified HND-HKG operating direction',
            summary:
                'Opened public timetable: exact airports, one airline, explicit zero stops, no intermediate sectors and positive aircraft-day marker',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX543'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=HND&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'KIX',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'CX: verified KIX-HKG operating direction',
            summary:
                'Opened public timetable: exact airports, one airline, explicit zero stops, no intermediate sectors and positive aircraft-day marker',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX597'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=KIX&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'ICN',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'CX: verified ICN-HKG operating direction',
            summary:
                'Opened public timetable: exact airports, one airline, explicit zero stops, no intermediate sectors and positive aircraft-day marker',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX427'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=ICN&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'SYD',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'CX: verified SYD-HKG operating direction',
            summary:
                'Opened public timetable: exact airports, one airline, explicit zero stops, no intermediate sectors and positive aircraft-day marker',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX110'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=SYD&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'MEL',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'CX: verified MEL-HKG operating direction',
            summary:
                'Opened public timetable: exact airports, one airline, explicit zero stops, no intermediate sectors and positive aircraft-day marker',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX178'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=MEL&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'YYZ',
        to: 'HKG',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'CX: verified YYZ-HKG operating direction',
            summary:
                'Opened public timetable: exact airports, one airline, explicit zero stops, no intermediate sectors and positive aircraft-day marker',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX829'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=YYZ&destination=HKG&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'NRT',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=NRT&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified NRT-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ94'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=SIN&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified SIN-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ281'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'PVG',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=PVG&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified PVG-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ288'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'DPS',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=DPS&destination=AKL&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified DPS-AKL operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ291'],
            supportingSourceURLs: [],
        },
        seasonality: 'Seasonal service; exact operating dates must be checked with the airline',
        checked: '2026-10-10',
    },
    {
        from: 'CDG',
        to: 'ORD',
        carrier: 'UA',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/us/en/o-d/cy-cy/paris-chicago',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'UA: verified CDG-ORD operating direction',
            summary:
                'Directly opened current official airline flightplan establishes exact individual sector and actual operator; regularly changing schedule',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH9334'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'FCO',
        to: 'ORD',
        carrier: 'UA',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/us/en/o-d/cy-cy/rome-chicago',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'UA: verified FCO-ORD operating direction',
            summary:
                'Directly opened current official airline flightplan establishes exact individual sector and actual operator; regularly changing schedule',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH7766'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'AKL',
        to: 'CHC',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.com/feeds/flight-timetables?origin=AKL&destination=CHC&date=2026-10-11&direct=true&locale=en_US',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified AKL-CHC operating direction',
            summary:
                'Official exact-query single sector with Air New Zealand operator, no stopover or layover',
            sourcePublishedDate: null,
            validFrom: '2026-10-11',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ519'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'AKL',
        to: 'WLG',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-auckland-to-wellington',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified AKL-WLG operating direction',
            summary:
                'Opened exact-IATA official route page explicitly establishes nonstop Air New Zealand operation',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'AKL',
        to: 'ZQN',
        carrier: 'NZ',
        source: {
            sourceURL:
                'https://www.airnewzealand.co.nz/flights/en-nz/flights-from-auckland-to-queenstown',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'NZ: verified AKL-ZQN operating direction',
            summary:
                'Opened exact-IATA official route page explicitly establishes nonstop Air New Zealand operation',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'HKG',
        to: 'FRA',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'LH: verified HKG-FRA operating direction',
            summary:
                'Opened public timetable: exact airports, one airline, explicit zero stops, no intermediate sectors and positive aircraft-day marker',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX6799'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=HKG&destination=FRA&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'JFK',
        to: 'FRA',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/us/en/o-d/cy-cy/new-york-frankfurt',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'LH: verified JFK-FRA operating direction',
            summary:
                'Directly opened current official airline flightplan establishes exact individual sector and actual operator; regularly changing schedule',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH405'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'FRA',
        carrier: 'SQ',
        source: {
            sourceURL:
                'https://www.singaporeair.com/sg/en/plan-travel/destinations/flights-from-singapore-to-frankfurt/',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'SQ: verified SIN-FRA operating direction',
            summary:
                'Directly opened official airline FAQ explicitly establishes nonstop operating service, with exact IATA airports in title',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'SYD',
        to: 'SIN',
        carrier: 'SQ',
        source: {
            sourceURL:
                'https://www.singaporeair.com/au/en/plan-travel/destinations/flights-from-sydney-to-singapore/',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'SQ: verified SYD-SIN operating direction',
            summary:
                'Directly opened official airline FAQ explicitly establishes nonstop operating service, with exact IATA airports in title',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'AMS',
        carrier: 'SQ',
        source: {
            sourceURL:
                'https://www.singaporeair.com/sg/en/plan-travel/destinations/flights-from-singapore-to-amsterdam/',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'SQ: verified SIN-AMS operating direction',
            summary:
                'Directly opened official airline FAQ explicitly establishes nonstop operating service, with exact IATA airports in title',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'KIX',
        to: 'TPE',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'CX: verified KIX-TPE operating direction',
            summary:
                'Opened public timetable: exact airports, one airline, explicit zero stops, no intermediate sectors and positive aircraft-day marker',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX565'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=KIX&destination=TPE&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'LAX',
        to: 'TPE',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=LAX&arrAirport=TPE&date=2026-10-10',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'JX: verified LAX-TPE operating direction',
            summary:
                'Opened exact-airport STARLUX timetable with operating carrier, Non-stop and positive Flight available day markers',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['JX0001'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Official timetable snapshot; subject to operating approval and schedule changes',
        checked: '2026-10-10',
    },
    {
        from: 'SFO',
        to: 'TPE',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=SFO&arrAirport=TPE&date=2026-10-10',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'JX: verified SFO-TPE operating direction',
            summary:
                'Opened exact-airport STARLUX timetable with operating carrier, Non-stop and positive Flight available day markers',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['JX0011'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Official timetable snapshot; subject to operating approval and schedule changes',
        checked: '2026-10-10',
    },
    {
        from: 'OKA',
        to: 'RMQ',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=OKA&arrAirport=RMQ&date=2026-10-10',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'JX: verified OKA-RMQ operating direction',
            summary:
                'Opened exact-airport STARLUX timetable with operating carrier, Non-stop and positive Flight available day markers',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['JX0303', 'JX0313'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Official timetable snapshot; subject to operating approval and schedule changes',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'MFM',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TPE&arrAirport=MFM&date=2026-10-10',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'JX: verified TPE-MFM operating direction',
            summary:
                'Opened exact-airport STARLUX timetable with operating carrier, Non-stop and positive Flight available day markers',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['JX0201', 'JX0205'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Official timetable snapshot; subject to operating approval and schedule changes',
        checked: '2026-10-10',
    },
    {
        from: 'NRT',
        to: 'KHH',
        carrier: 'BR',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'BR: verified NRT-KHH operating direction',
            summary:
                'Opened airport weekly schedule gives exact named airports, own operating carrier/flight and both sector times',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['BR107'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'KIX',
        to: 'KHH',
        carrier: 'BR',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'BR: verified KIX-KHH operating direction',
            summary:
                'Opened airport weekly schedule gives exact named airports, own operating carrier/flight and both sector times',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['BR181'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'ICN',
        to: 'KHH',
        carrier: 'BR',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'BR: verified ICN-KHH operating direction',
            summary:
                'Opened airport weekly schedule gives exact named airports, own operating carrier/flight and both sector times',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['BR145'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'KHH',
        carrier: 'CI',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'CI: verified SIN-KHH operating direction',
            summary:
                'Opened airport weekly schedule gives exact named airports, own operating carrier/flight and both sector times',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CI758'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'BKK',
        to: 'KHH',
        carrier: 'TG',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'TG: verified BKK-KHH operating direction',
            summary:
                'Opened airport weekly schedule gives exact named airports, own operating carrier/flight and both sector times',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['TG630'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'KHH',
        to: 'MFM',
        carrier: 'NX',
        source: {
            sourceURL: 'https://www.kia.gov.tw/EN/FLIPLAN.html',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'NX: verified KHH-MFM operating direction',
            summary:
                'Opened airport weekly schedule gives exact named airports, own operating carrier/flight and both sector times',
            sourcePublishedDate: null,
            validFrom: '2026-10-05',
            validThrough: '2026-10-11',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NX657'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'NRT',
        to: 'YVR',
        carrier: 'JL',
        source: {
            sourceURL: 'https://www.jal.co.jp/flights/en-us/flight-resumption',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'JL: verified NRT-YVR operating direction',
            summary:
                'Opened current JAL operating schedule gives exact Narita-Vancouver sector with departure and arrival times',
            sourcePublishedDate: null,
            validFrom: '2026-03-29',
            validThrough: '2026-10-24',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['JL018'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Official timetable snapshot; subject to operating approval and schedule changes',
        checked: '2026-10-10',
    },
    {
        from: 'LHR',
        to: 'YVR',
        carrier: 'AC',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/gb/en/o-d/cy-cy/london-vancouver',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'AC: verified LHR-YVR operating direction',
            summary:
                'Directly opened current official airline flightplan establishes exact individual sector and actual operator; regularly changing schedule',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH6812'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'HKG',
        to: 'AMS',
        carrier: 'CX',
        source: {
            sourceURL: 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/timetable.html',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'CX: verified HKG-AMS operating direction',
            summary:
                'Opened public timetable: exact airports, one airline, explicit zero stops, no intermediate sectors and positive aircraft-day marker',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-16',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['CX271'],
            supportingSourceURLs: [
                'https://api.cathaypacific.com/flightinformation/flightschedule/v2/flightTimetable?carrierCode=CX&lang=en&countryCode=HK&sortBy=2&tripType=O&origin=HKG&destination=AMS&departAt=2026-10-10&multiOrigin=false&multiDestination=false',
            ],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'SGN',
        to: 'RMQ',
        carrier: 'AE',
        source: {
            sourceURL: 'https://drive.google.com/file/d/1xm9GJd89o3qP7tPEUlWg1URFwIPIZeji/view',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'AE: verified SGN-RMQ operating direction',
            summary:
                'Downloaded official airline-linked October PDF is byte-identical to the extracted full-sector timetable',
            sourcePublishedDate: null,
            validFrom: '2026-10-01',
            validThrough: '2026-10-31',
            retrieval: 'full_public_pdf',
            referenceFlightNumbers: ['AE1858'],
            supportingSourceURLs: ['https://www.mandarin-airlines.com/b2c/flightquery?query=1'],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'TAK',
        to: 'RMQ',
        carrier: 'JX',
        source: {
            sourceURL:
                'https://www.starlux-airlines.com/en-US/timetable/search-result?depAirport=TAK&arrAirport=RMQ&date=2026-10-10',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'JX: verified TAK-RMQ operating direction',
            summary:
                'Opened exact-airport STARLUX timetable with operating carrier, Non-stop and positive Flight available day markers',
            sourcePublishedDate: null,
            validFrom: '2026-10-07',
            validThrough: '2026-10-13',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['JX0301'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Official timetable snapshot; subject to operating approval and schedule changes',
        checked: '2026-10-10',
    },
    {
        from: 'FRA',
        to: 'AMS',
        carrier: 'LH',
        source: {
            sourceURL: 'https://www.lufthansa.com/lhg/de/en/o-d/cy-cy/frankfurt-amsterdam',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'LH: verified FRA-AMS operating direction',
            summary:
                'Directly opened current official airline flightplan establishes exact individual sector and actual operator; regularly changing schedule',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH986'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'FRA',
        to: 'CDG',
        carrier: 'LH',
        source: {
            sourceURL:
                'https://www.lufthansa.com/lhg/de/en/o-d/cy-cy/frankfurt-paris?consent=no_consent',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'LH: verified FRA-CDG operating direction',
            summary:
                'Directly opened current official airline flightplan establishes exact individual sector and actual operator; regularly changing schedule',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['LH1028'],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'CDG',
        carrier: 'SQ',
        source: {
            sourceURL:
                'https://www.singaporeair.com/sg/en/plan-travel/destinations/flights-from-singapore-to-paris/',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'SQ: verified SIN-CDG operating direction',
            summary:
                'Directly opened official airline FAQ explicitly establishes nonstop operating service, with exact IATA airports in title',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'SIN',
        to: 'BKK',
        carrier: 'SQ',
        source: {
            sourceURL:
                'https://www.singaporeair.com/sg/en/plan-travel/destinations/flights-from-singapore-to-bangkok/',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'SQ: verified SIN-BKK operating direction',
            summary:
                'Directly opened official airline FAQ explicitly establishes nonstop operating service, with exact IATA airports in title',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'CDG',
        to: 'SEA',
        carrier: 'AF',
        source: {
            sourceURL:
                'https://www.portseattle.org/sea/flight-status?arr_or_depart=A&arrive_city=CDG&flight_date=2026-10-10',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'AF: verified CDG-SEA operating direction',
            summary:
                'Opened official nonstop network states routes to and from SEA; matched current exact-airport arrival identifies own operator, not codeshare. Combined directional/nonstop evidence',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['AF338'],
            supportingSourceURLs: ['https://www.portseattle.org/page/nonstop-international-routes'],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'LHR',
        to: 'SEA',
        carrier: 'BA',
        source: {
            sourceURL:
                'https://www.portseattle.org/sea/flight-status?arr_or_depart=A&arrive_city=LHR&flight_date=2026-10-10',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'BA: verified LHR-SEA operating direction',
            summary:
                'Opened official nonstop network states routes to and from SEA; matched current exact-airport arrival identifies own operator, not codeshare. Combined directional/nonstop evidence',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['BA53'],
            supportingSourceURLs: ['https://www.portseattle.org/page/nonstop-international-routes'],
        },
        seasonality:
            'Dated official sector snapshot; schedules can change and individual departures are not guaranteed',
        checked: '2026-10-10',
    },
    {
        from: 'NRT',
        to: 'MFM',
        carrier: 'NX',
        source: {
            sourceURL: 'https://www.macau-airport.com/en/flights/timetable/arrivals',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'NX: verified NRT-MFM operating direction',
            summary:
                'Matched official Narita departure and Macau weekly arrival for the same Air Macau NX861 establish the complete NRT-MFM sector, not arrival alone',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NX861'],
            supportingSourceURLs: [
                'https://www.narita-airport.jp/en/flight/dep-search/?keywordAirlineCodeL=AIR+MACAU&keywordAirlineCodeV=NX',
            ],
        },
        seasonality:
            'Matched official airport sector records; status changes and cancellations are not live availability',
        checked: '2026-10-10',
    },
    {
        from: 'ICN',
        to: 'MFM',
        carrier: 'NX',
        source: {
            sourceURL: 'https://www.macau-airport.com/en/flights/timetable/arrivals',
            sourceType: 'official_airport_sector_records',
            sourceTitle: 'NX: verified ICN-MFM operating direction',
            summary:
                'Matched official ICN own-flight departure/detail and Macau weekly arrival for NX825 establish complete exact-airport operating sector; not arrival alone or live operation guarantee',
            sourcePublishedDate: null,
            validFrom: '2026-10-10',
            validThrough: '2026-10-10',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NX825'],
            supportingSourceURLs: ['https://www.airport.kr/ap_en/1396/subview.do'],
        },
        seasonality:
            'Matched official airport sector records; status changes and cancellations are not live availability',
        checked: '2026-10-10',
    },

    {
        from: 'JFK',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL: 'https://www.airnewzealand.com/destination-auckland',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'Air New Zealand: verified JFK-AKL operating direction',
            summary:
                'Directly opened current official operating table explicitly names JFK to AKL and Non-stop; duration/days are illustrative, not date-specific availability',
            sourcePublishedDate: null,
            validFrom: null,
            validThrough: null,
            retrieval: 'full_public_page',
            referenceFlightNumbers: [],
            supportingSourceURLs: [],
        },
        seasonality:
            'Undated current official operating statement; schedules and availability can change',
        checked: '2026-10-10',
    },
    {
        from: 'TPE',
        to: 'AKL',
        carrier: 'NZ',
        source: {
            sourceURL: 'https://www.airnewzealand.com.tw/flight-deals-to-new-zealand',
            sourceType: 'official_airline_operating_sector',
            sourceTitle: 'Air New Zealand: verified TPE-AKL operating direction',
            summary:
                'Directly opened official NZ78 operating timetable with both sector times and affirmative nonstop service; linked official booking route explicitly identifies TPE and AKL, not city-only fare inference',
            sourcePublishedDate: null,
            validFrom: '2026-09-18',
            validThrough: '2026-10-23',
            retrieval: 'full_public_page',
            referenceFlightNumbers: ['NZ78'],
            supportingSourceURLs: [
                'https://flightbookings.airnewzealand.com.tw/vbook/actions/ext-search?adults=1&bookingClass=economy&searchLegs%5B0%5D.destinationPoint=AKL&searchLegs%5B0%5D.originPoint=TPE&searchType=flexible&tripType=return',
            ],
        },
        seasonality:
            'Official timetable snapshot; subject to operating approval and schedule changes',
        checked: '2026-10-10',
    },
];
for (const row of reverseExpansion)
    add(
        row.from,
        row.to,
        row.carrier,
        row.source,
        row.seasonality,
        row.source.referenceFlightNumbers,
        row.source.supportingSourceURLs,
        row.checked,
    );
const catalog = {
    schemaVersion: 2,
    catalogId: 'curated-nonstop-routes-2026-10-10',
    checkedDate: '2026-10-10',
    scope: `${routes.length} enabled directional nonstop passenger airport pairs supported by opened official source content. Each route retains its own check date and source limits. Bounded coverage, not exhaustive or date-specific availability.`,
    routeCount: routes.length,
    verifiedEnabledCount: routes.length,
    historicalCandidateResearch: {
        checkedDate: '2026-10-05',
        indexedCount: 8,
        promotedRouteIds: ['HKG-YYZ'],
        note: 'Historical indexed research count, not a current unresolved total. YYZ was subsequently verified from the opened Cathay timetable. Candidate research is not bundled or loaded.',
    },
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
        'Country filters use endpoint countryCode. HKG–Canada includes separately verified YVR and YYZ destinations.',
        'English and Traditional Chinese city/country labels use airport codes as identity.',
        'Explicit SIMULATED / 模擬 label; limited coverage, not date-specific availability.',
        'Schedules can change; service beyond a source validity window is not asserted.',
        'Load only enabled routes; never merge disabled candidates without fully opening primary sources.',
    ],
    uiDisclosure: {
        en: `${routes.length} researched routes • expanded 10 Oct 2026 • simulated traffic • limited route coverage`,
        zhHant: `已查核 ${routes.length} 條航線 · 擴充日期 2026/10/10 · 模擬動態 · 航線收錄範圍有限`,
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
