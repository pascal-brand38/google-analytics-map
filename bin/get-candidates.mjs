// Copyright (c) Pascal Brand
// MIT License

import fs from 'fs'
import stringify from 'json-stable-stringify';    // uses this stringify to sort the keys in the output json files, for better readability and better git diff
import 'dotenv/config';   // load environment variables from .env file
import githubRepo from '../src/data/github-repo.json' with { type: 'json' };
import candidates from '../src/data/candidates.json' with { type: 'json' };
import candidatesFilter from '../src/data/candidates-filter.json' with { type: 'json' };
import allFreeThemesUrls from '../src/data/all-free-themes-url.json' with { type: 'json' };
import 'colors';

const packageNames = ['swiper', 'leaflet', 'lightgallery', 'splide']
const minPushedAt = '2025-01-01'   // only keep repos that are updated after this date, to make sure they are still maintained
const minStars = 1   // only keep repos that have at least this many stars, to make sure they are popular


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
        let waitTime = ms;
        if (response.headers.get('X-RateLimit-Remaining') === '0') {
          // hit the rate limit, wait for the reset time
          const resetTime = response.headers.get('X-RateLimit-Reset');
          waitTime = (new Date(resetTime * 1000) - new Date()) / 1000;
          if (waitTime <= 0) {
            waitTime = ms; // if the reset time is in the past, use the default wait time
          } else {
            console.log(`Rate limit hit for url ${url}, waiting for ${waitTime} seconds...`);
            waitTime *= 1000; // convert to milliseconds
          }
        }

        console.log(`Too many requests for url ${url}, retrying in ${waitTime/1000} seconds...`)
        console.log(
          `Response status: ${response.status}, statusText: ${response.statusText}, url: ${response.url}, headers: ${JSON.stringify(response.headers)}`
        )
        await sleep(waitTime)
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

async function getAllFreeThemesUrl() {
  console.log('Getting all free themes from Astro portal...')
  const allThemes = await fetch('https://portal.astro.build/api/themes').then(res => res.json());
  const allFreeThemes = allThemes.filter(theme => theme.Theme.paid === false);
  // console.log(stringify(allFreeThemes, { space: 2 }))
  // fs.writeFileSync("src/data/all-themes.json", stringify(allFreeThemes, { space: 2 }))

  for (const theme of allFreeThemes) {
    if (allFreeThemesUrls[theme.Theme.slug]) {
      // already found repo url for this theme, skip it
      continue;
    }
    try {
      console.log(`Getting repo url for theme ${theme.Theme.slug}...`)
      const url = await fetch(`https://portal.astro.build/api/themes/details?slug=${theme.Theme.slug}`)
        .then(res => res.json())
        .then(res => res.Theme.repoUrl);

      if (!url || !url.startsWith('https://github.com/')) {
        console.warn(`Unsupported repo url for theme ${theme.Theme.slug}: ${url}`);
        continue;
      }
      // https://raw.githubusercontent.com/web3templates/stablo-astro/refs/heads/main/package.json
      // https://raw.githubusercontent.com/zeon-studio/astroplate/refs/heads/multilingual/package.json
      const packageText = await fetch(`${url.replace('github.com', 'raw.githubusercontent.com')}/refs/heads/main/package.json`).then(res => res.ok ? res.text() : '') || '';
      const includedPackages = packageNames.filter(name => packageText.includes(name));
      allFreeThemesUrls[theme.Theme.slug] = {
        url,
      }
      if (includedPackages.length > 0) {
        allFreeThemesUrls[theme.Theme.slug].use = includedPackages
      }
    } catch (error) {
      console.error(`Error occurred while processing theme ${theme.Theme.slug}:`, error);
    }
  }

  fs.writeFileSync("src/data/all-free-themes-url.json", stringify(allFreeThemesUrls, { space: 2 }))
}

async function getRepo(user, repo) {
  return fetchAndRetry(`https://api.github.com/repos/${user}/${repo}`)
}

function removeFilteredCandidates() {
  for (const packageName in candidatesFilter) {
    if (candidatesFilter[packageName] && candidatesFilter[packageName].length > 0 && candidates[packageName] && candidates[packageName].length > 0) {
      candidates[packageName] = candidates[packageName].filter(item =>
        !candidatesFilter[packageName].includes(item.url) && item.pushed_at >= minPushedAt && item.stargazers_count >= minStars)
    }
  }
}

function saveCandidates() {
  removeFilteredCandidates()
  packageNames.forEach((name) => {
    if (!candidates[name]) {
      candidates[name] = []
    }
    candidates[name].sort((a, b) => (b.stargazers_count - a.stargazers_count) || (a.url.localeCompare(b.url)))
  })
  fs.writeFileSync("src/data/candidates.json", stringify(candidates, { space: 2 }))
}

function saveGithubRepo() {
  fs.writeFileSync("src/data/github-repo.json", stringify(githubRepo, { space: 2 }))
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

removeFilteredCandidates()
await getAllFreeThemesUrl()

for (const packageName of packageNames) {
    if (!candidatesFilter[packageName]) {
    candidatesFilter[packageName] = []
  }
  if (!candidates[packageName]) {
    candidates[packageName] = []
  }

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
    { req: `${packageName}+astro+react+language:json+size:<5000`, filterName: 'package.json' },
    { req: `${packageName}+astro+not+react+language:json+size:<5000`, filterName: 'package.json' },
    { req: `${packageName}+astro+svelte+language:json+size:<5000`, filterName: 'package.json' },
    { req: `${packageName}+astro+not+svelte+language:json+size:<5000`, filterName: 'package.json' },
    { req: `script+${packageName}+language:astro`, },
    { req: `${packageName}+language:astro`, },
    ...specificRequests,
  ]

  for (const request of requests) {
    for (let page = 0; page < 1000; page++) {
      let resultsPackage = undefined

      const json = await getCandidates(request.req, page)
      if (!json?.items || json.items.length === 0) {
        break;
      }

      if (request.filterName) {
        const filtered = json.items.filter(item => item.name === request.filterName)
        resultsPackage = filtered
      } else {
        resultsPackage = json.items
      }
      console.log(`${packageName}: page ${page} has ${json.items.length} items`)
      // console.log(stringify(resultsPackage, { space: 2 }))
      // throw new Error('Stop after the first page for testing')

      for (const resultPackage of resultsPackage) {
        const url = `https://github.com/${resultPackage.repository.full_name}`

        // do not add filtered candidates
        if (candidatesFilter[packageName].includes(url)) {
          console.log(`${packageName}: skip filtered candidate ${url}`)
          continue;
        }

        // do not add duplicates
        if (candidates[packageName] && candidates[packageName].some(item => item.url === `https://github.com/${resultPackage.repository.full_name}`)) {
          continue;
        }

        let repo = githubRepo[url]
        if (!repo) {
          repo = await getRepo(resultPackage.repository.owner.login, resultPackage.repository.name)
          if (repo) {
            if (!repo.stargazers_count) {
              console.log(`${packageName}: fetching repo info for ${url}: ${repo.stargazers_count} stars`)
            } else {
              console.log(`${packageName}: fetching repo info for ${url}: ${repo.stargazers_count} stars`.green)
            }
            githubRepo[url] = {
              stargazers_count: repo.stargazers_count,
              pushed_at: repo.pushed_at,
            }
          } else {
            console.log(`${packageName}: failed to get repo info for ${url}, skip it.`)
            continue;
          }

          // console.log(repo)
          // throw new Error('Stop after the first repo for testing')
        }

        // add to candidates when recently updated and has at least 1 star, to make sure it is still maintained and popular
        if (repo.pushed_at >= minPushedAt && repo.stargazers_count >= minStars) {
          candidates[packageName].push({
            url: url,
            stargazers_count: repo.stargazers_count,
            pushed_at: repo.pushed_at,
          })
        }
      }

      // save
      saveCandidates()
      saveGithubRepo()
    }
  }
}

// save
saveCandidates()
saveGithubRepo()

console.log('DONE')
process.exit(0)
