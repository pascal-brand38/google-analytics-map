import fs from 'fs'
import analytics from './data/analytics.json' with { type: 'json' };
const propertyId = '1234';
console.log(analytics)

const day = new Date(analytics.nextDate);
console.log(day); // Apr 30 2000

var nextDay = new Date(day);
nextDay.setDate(day.getDate() + 1);
console.log(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`); // May 01 2000



// Imports the Google Analytics Data API client library.
import {BetaAnalyticsDataClient} from '@google-analytics/data'

// Using a default constructor instructs the client to use the credentials
// specified in GOOGLE_APPLICATION_CREDENTIALS environment variable.
const analyticsDataClient = new BetaAnalyticsDataClient();

async function getLongLat(name) {
  const url = `https://nominatim.openstreetmap.org/search?q=${name},&format=json`
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Don't know ${name}`)
      return { lat: 0, lon: 0 }
    }

    const json = await response.json();
    console.log(`All right ${name}`)
    return { lat: json[0].lat, lon: json[0].lon }
  } catch (error) {
    console.log(`THROW because of ${name}`)
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
    key = key.replace(/.*, France/g, 'France')
    key = key.replace(/\(not set\)/g, '')
    key = key.replace(/^, /g, '')
    if (key !== row.dimensionValues[0].value) {
      console.log(`key replacement: ${row.dimensionValues[0].value} ==> ${key}`)
    }
    if (key !== '') {
      const value = parseInt(row.metricValues[0].value)
      if (data[key] === undefined) {
        data[key] = { value: 0}
      }
      data[key].value = data[key].value + value
    }
  });

  // add lat and long
  // await Promise.all(Object.keys(data).map(async (key) => {
  //   const geo = await getLongLat(key)
  //   data[key].lat = geo.lat
  //   data[key].lon = geo.lon
  // }))
  const keys = Object.keys(data)
  for (let i=0; i<keys.length; i++) {
    const geo = await getLongLat(keys[i])
    data[keys[i]].lat = geo.lat
    data[keys[i]].lon = geo.lon
    sleep(1000)
  }

  fs.writeFileSync("data.json", JSON.stringify(data, null, 2))

}

runReport();
