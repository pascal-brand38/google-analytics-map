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
      let init = (data[key] === undefined) ? 0 : data[key]
      data[key] = init + value
    }
  });

  fs.writeFileSync("data.json", JSON.stringify(data, null, 2))

}

runReport();
