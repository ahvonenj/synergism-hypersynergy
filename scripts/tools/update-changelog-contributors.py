#!/usr/bin/env python3
"""Refresh changelog credits from local Git history; never fetch, commit or publish."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections import Counter
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'docs/data/changelog.json'
# Public commit records link historical author aliases to their verified public identity.
PROFILES = {
    'Ferlieloi': {'name': 'Ferlieloi', 'url': 'https://github.com/Ferlieloi', 'aliases': ['XxmolkxX', 'Molk'], 'identity_commits': [
        'a23b865e81c41c3b428099611806fc37d28fe9d3',
        '3e916573cf3e00a118f6ca6e6d8af8285f395539',
        '3b4ff54d0fa661a2f043a9f7216b5c86fdcc0933']},
    'maenhiir': {'name': 'maenhiir', 'url': 'https://github.com/maenhiir', 'aliases': ['Shew', 'Shewchou'], 'identity_commits': ['ded9320fccd3a5be01f99dca7f15c81d59672688']},
    'ahvonenj': {'name': 'ahvonenj', 'url': 'https://github.com/ahvonenj', 'aliases': ['Swiffy'], 'identity_commits': ['8c9fec4ecbda4c3941e92a31343b6472e4e0b658']},
    'loader3229': {'name': 'loader3229', 'url': 'https://github.com/loader3229', 'identity_commits': ['953f73374b8eeba1bf89e0c292d1cff6db8da561']},
    'Core': {'name': 'Core', 'url': None, 'identity_commits': ['fd92e871da556af954fccd94b4484a3777882016']},
}


def git(*args: str) -> str:
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True, encoding='utf-8').strip()


def automated(name: str) -> bool:
    return bool(re.search(r'\[bot\]|^github-actions$|^claude(?:\s|$)|^codex(?:\s|$)', name, re.I))


def collect_credits(commits: list[dict], aliases: dict[str, str]) -> list[dict]:
    """Combine human aliases and roles without counting a tool or a release twice."""
    credits: dict[str, dict] = {}
    for commit in commits:
        role = 'release' if commit['release_only'] else 'changes'
        for author in dict.fromkeys(commit['authors']):
            if automated(author):
                continue
            if author not in aliases:
                raise ValueError(f'Unreviewed Git author identity: {author}')
            identity = aliases[author]
            credit = credits.setdefault(identity, {'counts': Counter(), 'evidence': {}})
            credit['counts'][role] += 1
            credit['evidence'].setdefault(role, commit['sha'])
    ordered = sorted(credits, key=lambda key: (-credits[key]['counts']['changes'], key.casefold()))
    return [{'id': identity, 'roles': [role for role in ['changes', 'release'] if credits[identity]['counts'][role]],
             'commits': list(dict.fromkeys(credits[identity]['evidence'].values()))} for identity in ordered]


@lru_cache(maxsize=None)
def commit_record(sha: str) -> dict:
    author, body = git('show', '-s', '--format=%an%x00%B', sha).split('\x00', 1)
    authors = [author] + re.findall(r'^Co-authored-by:\s*(.*?)\s*<[^>]+>\s*$', body, re.M | re.I)
    files = git('diff-tree', '--root', '--no-commit-id', '--name-only', '-r', sha).splitlines()
    outputs = {'package.json', 'package-lock.json', 'src/mod/resource/json/strategies/manifest.json',
               'synergism_modloader/package.json', 'synergism_modloader/package-lock.json'}
    release_only = bool(files) and all(p in outputs or p.startswith(('release/', 'build/')) for p in files)
    # Early version-only commits changed the literal in HSGlobal rather than package.json.
    globals_file = 'src/mod/class/hs-core/hs-global.ts'
    if files and all(p == globals_file or p in outputs or p.startswith('release/') for p in files):
        diff = git('show', '--format=', '--unified=0', sha, '--', globals_file)
        changed = [line[1:].strip() for line in diff.splitlines()
                   if line[:1] in ['+', '-'] and not line.startswith(('+++', '---'))]
        if changed and all(re.fullmatch(r"currentModVersion:\s*['\"][^'\"]+['\"],?", line) for line in changed):
            release_only = True
    return {'sha': sha, 'authors': authors, 'files': files, 'release_only': release_only}


def baseline(entry: dict, entries: list[dict], released_only: bool = False) -> str | None:
    previous = entry['previous_commit']
    if previous and not released_only:
        return previous
    if released_only:
        # A source-only marker must not hide earlier authors from the next actual release.
        by_commit = {e['commit']: e for e in entries if e['channel'] == entry['channel']}
        while previous:
            candidate = by_commit.get(previous)
            if candidate is None:
                break
            if candidate['status'] in {'published', 'tagged'}:
                return previous
            previous = candidate['previous_commit']
    if entry['channel'] == 'loader':
        return None
    # The first version on a fork starts from an earlier channel's history, not from an empty game.
    candidates = {e['commit'] for e in entries if e['channel'] != 'loader' and e['commit'] != entry['commit']
                  and (not released_only or e['status'] in {'published', 'tagged'})}
    return next((sha for sha in git('rev-list', '--first-parent', entry['commit']).splitlines()[1:] if sha in candidates), None)


def update(data: dict) -> dict:
    aliases = {}
    for identity, profile in PROFILES.items():
        for sha in profile['identity_commits']:
            author = git('show', '-s', '--format=%an', sha)
            if author in aliases and aliases[author] != identity:
                raise ValueError('Ambiguous contributor identity')
            aliases[author] = identity
    for entry in data['entries']:
        base = baseline(entry, data['entries'], released_only=data.get('display_policy') == 'released-only'
                        and entry['status'] in {'published', 'tagged'})
        revision = f'{base}..{entry["commit"]}' if base else entry['commit']
        args = ['rev-list', '--reverse', '--topo-order', '--no-merges', revision]
        if entry['channel'] == 'loader':
            args += ['--', 'synergism_modloader/']
        commits = [commit_record(sha) for sha in git(*args).splitlines()]
        # A same-build alias/version marker can have no delta; its author still recorded this version.
        if not commits:
            commits = [commit_record(entry['commit'])]
        elif len(git('rev-list', '--parents', '-n', '1', entry['commit']).split()) > 2:
            # A merge-only publisher still contributed the integration/version record.
            endpoint = dict(commit_record(entry['commit']))
            endpoint['release_only'] = True
            commits.append(endpoint)
        entry['contributors'] = collect_credits(commits, aliases)
        entry['contributor_range'] = {'base': base, 'head': entry['commit'],
                                      'scope': 'synergism_modloader/' if entry['channel'] == 'loader' else 'repository'}
    data['contributor_profiles'] = PROFILES
    rule = ('Contributor credits combine human Git authors and recorded human co-authors across each version’s change range. '
            'Aliases are merged into verified public identities; automated tools are excluded. Release-only credits are labeled. '
            'Loader credits are limited to loader files; the first record on a fork uses the nearest preserved earlier baseline where available. '
            'Released builds compare against the previous released build, so unconfirmed source markers do not hide earlier contributors.')
    if rule not in data['methodology']:
        data['methodology'].append(rule)
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify stored credits without writing')
    args = parser.parse_args()
    original = DATA.read_text(encoding='utf-8')
    data = update(json.loads(original))
    text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if text != original:
            raise SystemExit('Contributor credits are stale; run this script without --check.')
    else:
        DATA.write_text(text, encoding='utf-8')
    counts = Counter(c['id'] for entry in data['entries'] for c in entry['contributors'])
    print(f'{"Checked" if args.check else "Updated"} {len(data["entries"])} version credits: {dict(counts)}')


if __name__ == '__main__':
    main()
