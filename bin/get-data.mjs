import fs from 'fs'
import geo from '../src/data/geo.json' with { type: 'json' };
import countries from '../src/data/countries.json' with { type: 'json' };

const propertyId = '1234';

// Imports the Google Analytics Data API client library.
import {BetaAnalyticsDataClient} from '@google-analytics/data'

// Using a default constructor instructs the client to use the credentials
// specified in GOOGLE_APPLICATION_CREDENTIALS environment variable.
const analyticsDataClient = new BetaAnalyticsDataClient();

async function getLongLat(name) {
  if (geo[name] && geo[name].lat && geo[name].lat!==0 && geo[name].lon && geo[name].lon!==0) {
    return geo[name]
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${name},&format=json`
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Can't find location of ${name}`)
      return { lat: 0, lon: 0 }
    }

    const json = await response.json();
    console.log(`${name} ==> ${json[0].lat} ${json[0].lon}`)
    geo[name] = { lat: json[0].lat, lon: json[0].lon }
    return geo[name]
  } catch (error) {
    console.log(`Throw an error while searching for location of ${name}`)
    return { lat: 0, lon: 0 }
  }
}

// await getLongLat()
// throw('STOP')

async function sleep(s) {
  return new Promise(r => setTimeout(r, s * 1000))
}

// Runs a simple report.
async function runReport() {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: '2025-1-1',
        // startDate: 'today',
        endDate: 'today',
      },
    ],
    dimensions: [
      // {
      //   name: 'city',
      // },
      {
        name: 'countryAndCity',
          dimensionExpression: {
            concatenate: {
                // cf. dimensions from https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema?hl=fr
                "dimensionNames": [ 'city', 'country' ],
                    // ids list:
                    //    https://developers.google.com/google-ads/api/data/geotargets
                    //    https://developers.google.com/google-ads/api/fields/v20/geo_target_constant
                "delimiter": ', '
              }
            }
          }
    ],
    metrics: [
      {
        name: 'activeUsers',
      },
    ],
  });

  console.log('Report result:');
  response.rows.forEach(row => {
    console.log(row.dimensionValues[0], row.metricValues[0]);
  });

  const data = {}
  response.rows.forEach(row => {
    let key = row.dimensionValues[0].value
    key = key.replace(/.*, France/g, 'France')    // obfuscate position in France
    key = key.replace(/\(not set\)/g, '')
    key = key.replace(/^, /g, '')
    if (key !== '') {
      const value = parseInt(row.metricValues[0].value)
      if (data[key] === undefined) {
        data[key] = { value: 0}
      }
      data[key].value = data[key].value + value
    }
  });

  const keys = Object.keys(data)
  for (let i=0; i<keys.length; i++) {
    const geo = await getLongLat(keys[i])
    data[keys[i]].lat = geo.lat
    data[keys[i]].lon = geo.lon
    sleep(1000)
  }

  // update countries location
  // const countriesKeys = Object.keys(countries)
  // for (let i=0; i<countriesKeys.length; i++) {
  //   //if (!countries[countriesKeys[i]].lat || countries[countriesKeys[i]].lat===0 || !countries[countriesKeys[i]].lon || countries[countriesKeys[i]].lon===0) {
  //     const geo = await getLongLat(countriesKeys[i])
  //     countries[countriesKeys[i]].lat = geo.lat
  //     countries[countriesKeys[i]].lon = geo.lon
  //     sleep(1000)
  //   //}
  // }
  // console.log(`Writing src/data/countries.json`)
  // fs.writeFileSync("src/data/countries.json", JSON.stringify(countries, null, 2))

  console.log(`Writing src/data/data.json`)
  fs.writeFileSync("src/data/data.json", JSON.stringify(data, null, 2))
  console.log(`Writing src/data/geo.json`)
  fs.writeFileSync("src/data/geo.json", JSON.stringify(geo, null, 2))
  console.log('written completed')
}

await runReport();
console.log('DONE')
process.exit(0)
