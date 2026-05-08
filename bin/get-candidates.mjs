// Copyright (c) Pascal Brand
// MIT License

import fs from 'fs'
import stringify from 'json-stable-stringify';    // uses this stringify to sort the keys in the output json files, for better readability and better git diff
import 'dotenv/config';   // load environment variables from .env file

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndRetry(url) {
  // await sleep(2000)   // wait for 2 seconds before the first try
  for (let i=0; i<3; i++) {
    const ms = i * 1000 * 60 + 60000;
    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${process.env.SECRET_GITHUB_TOKEN}`,
        }
      });
      if (!response.ok) {
        console.log(`Too many requests for url ${url}, retrying in ${ms/1000} seconds...`)
        console.log(
          `Response status: ${response.status}, statusText: ${response.statusText}, url: ${response.url}, headers: ${JSON.stringify(response.headers)}`
        )
        await sleep(ms)
        continue;
      }

      const json = await response.json();
      // console.log(json)
      return json
    } catch (error) {
      console.log(`Throw an error while fetching ${url}, retrying in ${ms/1000} seconds...`)
      console.log(error)
      await sleep(ms)
    }
  }

  return null
}

async function getRepo(user, repo) {
  return fetchAndRetry(`https://api.github.com/repos/${user}/${repo}`)
}


// $ curl -k --location --header 'Authorization: Token ghp_xxx'  --request GET   'https://api.github.com/search/code?q=swiper+and+astro+language:json&page=0'
async function getCandidates(request, page) {
  // https://api.github.com/search/code?q=swiper+and+astro+language:json&page=0
  return fetchAndRetry(`https://api.github.com/search/code?q=${request}&page=${page}`)
}

if (!process.env.SECRET_GITHUB_TOKEN || !process.env.SECRET_GOOGLE_ANALYTICS_PROPERTY_ID) {
  console.error('Error: SECRET_GITHUB_TOKEN or SECRET_GOOGLE_ANALYTICS_PROPERTY_ID is not set in .env file. Please set it in .env file.')
  console.error('SECRET_GITHUB_TOKEN=<github_token> # generate at https://github.com/settings/tokens');
  console.error('SECRET_GOOGLE_ANALYTICS_PROPERTY_ID=<9-digit number>');
  process.exit(1)
}

const packageNames = ['swiper', 'leaflet', 'lightgallery', 'splide']
const results = {}
const minUpdatedAt = '2025-01-01'   // only keep repos that are updated after this date, to make sure they are still maintained
const minStars = 1   // only keep repos that have at least this many stars, to make sure they are popular

for (const packageName of packageNames) {
  console.log(`---------- Getting candidates for package ${packageName}...`)
  let specificRequests = []
  if (packageName === 'swiper') {
    specificRequests.push({ req: `swiper-wrapper+language:astro`, })
    specificRequests.push({ req: `swiper-slide+language:astro`, })
  } else if (packageName === 'leaflet') {
  } else if (packageName === 'lightgallery') {
  } else if (packageName === 'splide') {
  }
  const requests = [
    { req: `${packageName}+astro+language:json+size:<5000`, filterName: 'package.json' },
    { req: `script+${packageName}+language:astro`, },
    { req: `${packageName}+language:astro`, },
    ...specificRequests,
  ]
  let resultsPackage = []
  for (const request of requests) {
    for (let page = 0; page < 1000; page++) {
      const json = await getCandidates(request.req, page)
      if (!json?.items || json.items.length === 0) {
        break;
      }

      if (request.filterName) {
        const filtered = json.items.filter(item => item.name === request.filterName)
        resultsPackage.push(...filtered)
      } else {
        resultsPackage.push(...json.items)
      }
      console.log(`page ${page} has ${json.items.length} items`)
      // console.log(stringify(resultsPackage, { space: 2 }))
      // throw new Error('Stop after the first page for testing')

    }
  }

  const finalResults = []
  for (const resultPackage of resultsPackage) {
    // remove duplicates
    if (finalResults.some(item => item.url === `https://github.com/${resultPackage.repository.full_name}`)) {
      continue;
    }
    const repo = await getRepo(resultPackage.repository.owner.login, resultPackage.repository.name)
    console.log(`Getting repo info for ${resultPackage.repository.full_name}: ${repo?.stargazers_count} stars`)
    // console.log(stringify(repo, { space: 2 }))
    // throw new Error('Stop after the first repo for testing')

    // keep only the ones that are updated after 2025-01-01 and have at least 1 star,
    // to make sure they are still maintained and popular
    if (repo?.updated_at >= minUpdatedAt && repo?.stargazers_count >= minStars) {
      finalResults.push({
        url: `https://github.com/${resultPackage.repository.full_name}`,
        stargazers_count: repo?.stargazers_count || 0,
      })
    }
  }

  finalResults.sort((a, b) => b.stargazers_count - a.stargazers_count)
  results[packageName] = finalResults
}

fs.writeFileSync("src/data/candidates.json", stringify(results, { space: 2 }))

console.log('DONE')
process.exit(0)
