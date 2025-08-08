import fs from 'fs'
import githubUsers from '../src/data/github-users.json' with { type: 'json' };

// TODO: CANNOT BE PUBLISHED ON GITHUB IN PUBLIC REPO
const _token = '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'
const repos = [ 'astro-splide', 'astro-swiper', 'astro-lightgallery', 'astro-leaflet', 'astro-dev', 'astro-sprite', 'py-responsiveimage' ]
// const repos = [ 'astro-splide',  ]

async function getStargazers(user, repo) {
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

async function getUser(user) {
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

const stargazersByRepo = await Promise.all(repos.map(async (repo) => {
  const stargazers = await getStargazers('pascal-brand38', repo)
  return {
    repo,
    stargazers: stargazers,
  }
 }))

let stargazersByDate = []
stargazersByRepo.forEach(repo => (repo.stargazers.forEach(stargazer => stargazersByDate.push( {
  starred_at: stargazer.starred_at,
  repo: repo.repo,
  userLogin: stargazer.user.login
}))))
stargazersByDate = stargazersByDate.sort((a,b) => a.starred_at.localeCompare(b.starred_at))
console.log(stargazersByDate)

// save github users informations
await Promise.all(stargazersByDate.map(async stargazer => {
  if (!githubUsers.some(user => user.login === stargazer.userLogin)) {
    console.log(`New user: ${stargazer.userLogin}`)
    const user = await getUser(stargazer.userLogin)
    githubUsers.push(user)
  }
}))

fs.writeFileSync("src/data/github-users.json", JSON.stringify(githubUsers, null, 2))

console.log('DONE')
