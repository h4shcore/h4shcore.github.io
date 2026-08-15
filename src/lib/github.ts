export interface PinnedRepo {
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
}

// Shown if there's no GITHUB_TOKEN at build time, or the request fails,
// so `astro build` never breaks a deploy just because the token is missing.
const FALLBACK_REPOS: PinnedRepo[] = [
  {
    name: 'nbsh',
    description: 'NoBShell make with C and pure love for minimalism (wip).',
    url: 'https://github.com/h4shcore/nbsh',
    language: 'C',
    stars: 0,
    forks: 0
  },
  {
    name: 'dotfiles',
    description: 'Full declarative NixOS + home-manager config.',
    url: 'https://github.com/h4shcore/dotfiles',
    language: 'Nix',
    stars: 0,
    forks: 0
  },
];

const QUERY = `
query($login: String!) {
  user(login: $login) {
    pinnedItems(first: 6, types: [REPOSITORY]) {
      nodes {
        ... on Repository {
          name
          description
          url
          primaryLanguage { name }
          stargazerCount
          forkCount
        }
      }
    }
  }
}`;

export async function getPinnedRepos(login = 'h4shcore'): Promise<PinnedRepo[]> {
  const token = import.meta.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('[github] GITHUB_TOKEN not set — using fallback repo data.');
    return FALLBACK_REPOS;
  }

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: QUERY, variables: { login } })
    });

    if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
    const json = await res.json();
    const nodes = json?.data?.user?.pinnedItems?.nodes;
    if (!Array.isArray(nodes) || nodes.length === 0) throw new Error('No pinned items returned');

    return nodes.map((n: any) => ({
      name: n.name,
      description: n.description || 'No description provided.',
      url: n.url,
      language: n.primaryLanguage?.name || '—',
      stars: n.stargazerCount,
      forks: n.forkCount
    }));
  } catch (err) {
    console.warn('[github] Falling back to static repo data:', (err as Error).message);
    return FALLBACK_REPOS;
  }
}
