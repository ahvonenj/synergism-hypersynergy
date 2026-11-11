export const DEV_SERVER_ORIGIN = 'http://127.0.0.1:8080';

export function defaultRepo(dev) {
    return dev ? 'maenhiir' : 'Ferlieloi';
}

export function repositoryRoot(repo, version) {
    return `https://cdn.jsdelivr.net/gh/${repo}/synergism-hypersynergy@${version}`;
}
