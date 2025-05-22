import osmtogeojson from 'osmtogeojson'
import axios from 'axios'
import path from 'path'
import fs from 'fs'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

const overpassQuery = `
[out:json][timeout:300];
area["ISO3166-1"="SG"][admin_level=2]->.singapore;
(
  way[highway~"^(service|footway)$"](area.singapore);
);
out body;
>;
out skel qt;
`

// const buildingQuery = `
// [out:json][timeout:90];
// area["name"="Singapore"]->.searchArea;
// (
//   way["building"](area.searchArea);
//   relation["building"](area.searchArea);
// );
// out body;
// >;
// out skel qt;
// `;

// const importantbuildingsQuery = `
// [out:json][timeout:120];
// area["name"="Singapore"]->.searchArea;
// (
//   way["building"~"yes|commercial|retail|apartments|office|civic|government"]
//     (if:geometry:area() >= 500)(area.searchArea);
//   relation["building"~"yes|commercial|retail|apartments|office|civic|government"]
//     (if:geometry:area() >= 500)(area.searchArea);
// );
// out body;
// >;
// out skel qt;
// `;

async function fetchSingaporeOverpassData(query: string, fileName: string) {
    console.log('Fetching Singapore data from Overpass API...');

    const response = await axios.post(
        OVERPASS_API, `data=${encodeURIComponent(query)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const geojson = osmtogeojson(response.data)
    fs.writeFileSync(fileName, JSON.stringify(geojson))

    console.log('Successfully saved Singapore road data to ', fileName)
    return geojson
}

try {
    fetchSingaporeOverpassData(
        overpassQuery,
        path.resolve(__dirname, "Output.json")
    )
} catch (err) {
    console.error("Error while fetching from Overpass API: ", (err as Error).message)
}
