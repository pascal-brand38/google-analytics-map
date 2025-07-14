const propertyId = '1234';

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
        startDate: 'today',
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
                "dimensionNames": [ 'city', 'country' ],
                "delimiter": ','
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
}

runReport();
