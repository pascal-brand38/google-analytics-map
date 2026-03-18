import fs from 'fs'
import stringify from 'json-stable-stringify';    // uses this stringify to sort the keys in the output json files, for better readability and better git diff
import 'dotenv/config';   // load environment variables from .env file

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndRetry(url) {
  // await sleep(2000)   // wait for 2 seconds before the first try
  for (let i=0; i<10; i++) {
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

const request = 'swiper+and+astro+language:json'
const results = []
for (let page = 0; page < 1000; page++) {
  const json = await getCandidates(request, page)
  if (!json?.items) {
    break;
  }
  const filtered = json.items.filter(item => item.name === 'package.json')
  results.push(...filtered)
  console.log(`page ${page} has ${json.items.length} items`)
}

const finalResults = []
for (const result of results) {
  console.log(`Getting repo info for ${result.repository.full_name}: ${repo?.stargazers_count} stars`)
  const repo = await getRepo(result.repository.owner.login, result.repository.name)
  // console.log(repo)
  finalResults.push({
    url: `https://github.com/${result.repository.full_name}`,
    stargazers_count: repo?.stargazers_count || 0,
  })
}

finalResults.sort((a, b) => b.stargazers_count - a.stargazers_count)

console.log('DONE')
console.log(`Total items: ${finalResults.length}`)
// console.log(stringify(finalResults, { /*space: 2*/ }))
fs.writeFileSync("src/data/candidates.json", stringify(finalResults, { space: 2 }))

process.exit(0)
