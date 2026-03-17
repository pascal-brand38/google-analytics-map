import fs from 'fs'
import geo from '../src/data/geo.json' with { type: 'json' };
import countries from '../src/data/countries.json' with { type: 'json' };
import prevVisitedCountries from '../src/data/visited-countries.json' with { type: 'json' };
import githubUsers from '../src/data/github-users.json' with { type: 'json' };

const _token = 'ghp'
const repos = [
  'astro-splide',
  'astro-swiper',
  'astro-lightgallery',
  'astro-leaflet',
  'astro-dev',
  'astro-sprite',
  'astro-build-time-constants',
  'py-responsiveimage',
]

const propertyId = '1234';

// Imports the Google Analytics Data API client library.
import { BetaAnalyticsDataClient } from '@google-analytics/data'

// Using a default constructor instructs the client to use the credentials
// specified in GOOGLE_APPLICATION_CREDENTIALS environment variable.
const analyticsDataClient = new BetaAnalyticsDataClient();

async function getLongLat(name) {
  if (geo[name] && geo[name].lat && geo[name].lat !== 0 && geo[name].lon && geo[name].lon !== 0) {
    return geo[name]
  }

  sleep(1000)
  const url = `https://nominatim.openstreetmap.org/search?q=${name},&format=json`
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Can't find location of ${name}`)
      return { lat: '0', lon: '0' }
    }

    const json = await response.json();
    console.log(`${name} ==> ${json[0].lat} ${json[0].lon}`)
    geo[name] = { lat: json[0].lat, lon: json[0].lon }
    return geo[name]
  } catch (error) {
    console.log(`Throw an error while searching for location of ${name}`)
    return { lat: '0', lon: '0' }
  }
}

async function getGithubStargazers(user, repo) {
  const url = `https://api.github.com/repos/${user}/${repo}/stargazers`
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github.v3.star+json",
        // create token at https://github.com/settings/tokens
        "Authorization": `Bearer ${_token}`,
      }
    });
    if (!response.ok) {
      console.log(`Can't find stargazers of ${user}/${repo}:`, response)
      console.log('This may come from a wrong/expired token. Regenerate it at https://github.com/settings/tokens')
      console.log(`Throw an error while searching for stargazers of ${user}/${repo}`)
    }

    const json = await response.json();
    // console.log(json)
    return json
  } catch (error) {
    console.log(`Throw an error while searching for stargazers of ${user}/${repo}`)
  }
}

async function getGithubUser(user) {
  const url = `https://api.github.com/users/${user}`
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github.v3.star+json",
        // create token at https://github.com/settings/tokens
        "Authorization": `Bearer ${_token}`,
      }
    });
    if (!response.ok) {
      console.log(`Can't find user ${user}:`, response)
      console.log('This may come from a wrong/expired token. Regenerate it at https://github.com/settings/tokens')
      console.log(`Throw an error while searching for users of ${user}`)
    }

    const json = await response.json();
    // console.log(json)
    return json
  } catch (error) {
    console.log(`Throw an error while searching for users of ${user}`)
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
        startDate: '2024-1-1',
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
            "dimensionNames": ['city', 'country'],
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

  const data = {}
  const visitedCountries = {}
  response.rows.forEach(row => {
    let key = row.dimensionValues[0].value
    key = key.replace(/.*, France/g, 'France')    // obfuscate position in France
    key = key.replace(/\(not set\)/g, '')
    key = key.replace(/^, /g, '')
    key = key.replace(/&/g, 'and')
    key = key.replace(/ Municipality/g, '')
    key = key.replace(/ District/g, '')
    if (key !== '') {
      const value = parseInt(row.metricValues[0].value)
      if (data[key] === undefined) {
        data[key] = { value: 0 }
      }
      data[key].value = data[key].value + value

      const thisCountry = key.replace(/.*, /g, '')  // extract the country
      if (visitedCountries[thisCountry] === undefined) {
        visitedCountries[thisCountry] = { value: 0 }
        if (!prevVisitedCountries[thisCountry]) {
          console.log(`NEW VISITED COUNTRY: ${thisCountry}`)
        }
      }
      visitedCountries[thisCountry].value += value
    }
  });

  const keys = Object.keys(data)
  for (let i = 0; i < keys.length; i++) {
    const geo = await getLongLat(keys[i])
    data[keys[i]].lat = geo.lat
    data[keys[i]].lon = geo.lon
  }

  const countryNames = Object.keys(visitedCountries)
  for (let i = 0; i < countryNames.length; i++) {
    const geo = await getLongLat(countryNames[i])
    visitedCountries[countryNames[i]].lat = geo.lat
    visitedCountries[countryNames[i]].lon = geo.lon
  }
  console.log(`Writing src/data/visited-countries.json`)
  fs.writeFileSync("src/data/visited-countries.json", JSON.stringify(visitedCountries, null, 2))

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

  const stargazersByRepo = await Promise.all(repos.map(async (repo) => {
    const stargazers = await getGithubStargazers('pascal-brand38', repo)
    return {
      repo,
      stargazers: stargazers,
    }
  }))

  let stargazersByDate = []
  stargazersByRepo.forEach(repo => (repo.stargazers.forEach(stargazer => stargazersByDate.push({
    starred_at: stargazer.starred_at,
    repo: repo.repo,
    userLogin: stargazer.user.login,
    userLocation: undefined,
    userLocationLatLng: undefined
  }))))
  stargazersByDate = stargazersByDate.sort((a, b) => a.starred_at.localeCompare(b.starred_at))

  // get github users informations, and add the location in stargazersByDate
  for (let index=0; index<stargazersByDate.length; index++) {
    const stargazer = stargazersByDate[index]
    if (!githubUsers.some(user => user.login === stargazer.userLogin)) {
      console.log(`New user: ${stargazer.userLogin}`)
      const user = await getGithubUser(stargazer.userLogin)
      githubUsers.push(user)
    }

    if (!stargazer.userLocation) {
      await Promise.all(githubUsers.map(async user => {
        if ((user.login === stargazer.userLogin) && (user.location)) {
          stargazer.userLocation = user.location
          stargazer.userLocationLatLng = await getLongLat(user.location)
        }
      }))
    }
  }


  // await Promise.all(stargazersByDate.map(async stargazer => {
  //   if (!githubUsers.some(user => user.login === stargazer.userLogin)) {
  //     console.log(`New user: ${stargazer.userLogin}`)
  //     const user = await getGithubUser(stargazer.userLogin)
  //     githubUsers.push(user)
  //   }

  //   if (!stargazer.userLocation) {
  //     await Promise.all(githubUsers.map(async user => {
  //       if ((user.login === stargazer.userLogin) && (user.location)) {
  //         stargazer.userLocationLatLng = await getLongLat(user.location)
  //       }
  //     }))
  //   }
  // }))
  // console.log(stargazersByDate)

  console.log(`Writing src/data/data.json`)
  fs.writeFileSync("src/data/data.json", JSON.stringify(data, null, 2))
  console.log(`Writing src/data/geo.json`)
  fs.writeFileSync("src/data/geo.json", JSON.stringify(geo, null, 2))
  console.log(`Writing src/data/github-users.json`)
  fs.writeFileSync("src/data/github-users.json", JSON.stringify(githubUsers, null, 2))
  console.log(`Writing src/data/stargazers.json`)
  fs.writeFileSync("src/data/stargazers.json", JSON.stringify(stargazersByDate, null, 2))

  console.log('written completed')
}

await runReport();
console.log('DONE')
process.exit(0)
