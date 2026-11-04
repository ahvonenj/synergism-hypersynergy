import importlib.util
import copy
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
TOOLS = Path(__file__).resolve().parents[1] / 'tools'


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, TOOLS / filename)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


BUILD_DOCS = module('build_docs', 'build-docs.py')
CREDITS = module('credits', 'update-changelog-contributors.py')


class ChangelogValidationTests(unittest.TestCase):
    def entry(self):
        return {
            'id': 'live-2.10.5e-bis', 'version': '2.10.5e-bis', 'channel': 'live',
            'repository': 'Ferlieloi/synergism-hypersynergy', 'commit': 'a' * 40,
            'previous_commit': None, 'date': '2026-10-31', 'date_kind': 'tag',
            'status': 'tagged', 'release_url': None,
            'sources': [{'label': 'Version tag', 'url': 'https://github.com/Ferlieloi/synergism-hypersynergy/tree/2.10.5e-bis'}],
            'changes': [{'type': 'added', 'text': 'Διανομή resources'}], 'notes': [],
            'contributors': [{'id': 'maintainer', 'roles': ['changes'], 'commits': ['a' * 40]}],
        }

    def data(self):
        return {'schema_version': 1, 'methodology': ['Verified against history.'], 'entries': [self.entry()],
                'contributor_profiles': {'maintainer': {'name': 'Maintainer', 'url': 'https://github.com/maintainer',
                                                       'identity_commits': ['a' * 40]}}}

    def test_accepts_historical_version_labels_and_unicode(self):
        data = self.data()
        for version in ['2.10.5e-bis', '2.10', '2.3.0-a', '2.10.2x', '2.11 pre-release']:
            data['entries'][0]['version'] = version
            self.assertEqual(BUILD_DOCS.validate_changelog(data)[0]['version'], version)

    def test_rejects_non_github_external_source(self):
        data = self.data()
        data['entries'][0]['sources'][0]['url'] = 'https://example.com/source'
        with self.assertRaisesRegex(ValueError, 'only HTTPS github.com'):
            BUILD_DOCS.validate_changelog(data)

    def test_rejects_duplicate_version_ids(self):
        data = self.data()
        data['entries'].append(self.entry())
        with self.assertRaisesRegex(ValueError, 'duplicate id'):
            BUILD_DOCS.validate_changelog(data)

    def test_rejects_unsafe_and_malformed_source_urls(self):
        for url in ['http://github.com/owner/repo', 'https://github.com.evil.test/owner/repo',
                    'javascript:alert(1)', 'https://user:password@github.com/owner/repo']:
            data = self.data()
            data['entries'][0]['sources'][0]['url'] = url
            with self.assertRaisesRegex(ValueError, 'only HTTPS github.com'):
                BUILD_DOCS.validate_changelog(data)

    def test_rejects_invalid_calendar_date(self):
        data = self.data()
        data['entries'][0]['date'] = '2026-02-30'
        with self.assertRaisesRegex(ValueError, 'invalid calendar date'):
            BUILD_DOCS.validate_changelog(data)

    def test_rejects_unknown_or_duplicate_contributors(self):
        data = self.data()
        data['entries'][0]['contributors'][0]['id'] = 'unknown'
        with self.assertRaisesRegex(ValueError, 'unknown or duplicate contributor'):
            BUILD_DOCS.validate_changelog(data)
        data = self.data()
        data['entries'][0]['contributors'] *= 2
        with self.assertRaisesRegex(ValueError, 'unknown or duplicate contributor'):
            BUILD_DOCS.validate_changelog(data)

    def test_unlinked_identity_and_release_only_credit_are_supported(self):
        data = self.data()
        data['contributor_profiles']['maintainer']['url'] = None
        data['entries'][0]['contributors'][0]['roles'] = ['release']
        self.assertEqual(len(BUILD_DOCS.validate_changelog(data)), 1)

    def test_merge_direction_and_target_are_verified(self):
        data = self.data()
        event = {'direction': 'live-to-dev', 'summary': 'Caught up with Live', 'commit': 'b' * 40,
                 'from_entry_id': 'missing', 'evidence': ['https://github.com/owner/repo/commit/' + 'b' * 40]}
        data['entries'][0]['merges'] = [event]
        with self.assertRaisesRegex(ValueError, 'does not match'):
            BUILD_DOCS.validate_changelog(data)
        event['direction'] = 'dev-to-live'
        with self.assertRaisesRegex(ValueError, 'unknown version'):
            BUILD_DOCS.validate_changelog(data)
        event['from_entry_id'] = None
        self.assertEqual(len(BUILD_DOCS.validate_changelog(data)), 1)

    def test_released_only_history_excludes_previews_and_sorts_by_date(self):
        data = self.data()
        data['display_policy'] = 'released-only'
        source = copy.deepcopy(data['entries'][0])
        source.update(id='dev-planned', channel='dev', version='9.0.0-dev1', date='2026-11-04', status='version-record', date_kind='commit')
        older = copy.deepcopy(data['entries'][0])
        older.update(id='original-old', channel='original', date='2025-01-01', status='published', date_kind='published')
        data['entries'] = [older, source, data['entries'][0]]
        before = copy.deepcopy(data)
        self.assertEqual([e['id'] for e in BUILD_DOCS.displayed_changelog_entries(data)], ['live-2.10.5e-bis', 'original-old'])
        self.assertEqual(data, before, 'display filtering must preserve research records')

    def test_included_source_notes_require_matching_historical_records(self):
        data = self.data()
        source = copy.deepcopy(data['entries'][0])
        source.update(id='live-source', status='version-record', date_kind='commit')
        data['entries'].append(source)
        data['entries'][0]['included_version_records'] = [source['id']]
        self.assertEqual(len(BUILD_DOCS.validate_changelog(data)), 2)
        for changes in [{'id': 'missing'}, {'channel': 'dev'}, {'status': 'tagged'}]:
            invalid = copy.deepcopy(data)
            invalid['entries'][1].update(changes)
            with self.assertRaisesRegex(ValueError, 'source records in the same channel'):
                BUILD_DOCS.validate_changelog(invalid)


class ContributorAttributionTests(unittest.TestCase):
    def test_unreleased_marker_does_not_hide_previous_release_contributors(self):
        base = {'commit': 'b' * 40, 'channel': 'dev', 'status': 'tagged', 'previous_commit': None}
        marker = {'commit': 'c' * 40, 'channel': 'dev', 'status': 'version-record', 'previous_commit': 'b' * 40}
        release = {'commit': 'a' * 40, 'channel': 'dev', 'status': 'published', 'previous_commit': 'c' * 40}
        self.assertEqual(CREDITS.baseline(release, [base, marker, release], released_only=True), 'b' * 40)
        self.assertEqual(CREDITS.baseline(release, [base, marker, release]), 'c' * 40)

    def test_aliases_and_release_roles_are_combined(self):
        commits = [{'sha': 'a' * 40, 'authors': ['OldAlias'], 'release_only': False},
                   {'sha': 'b' * 40, 'authors': ['NewAlias'], 'release_only': True}]
        actual = CREDITS.collect_credits(commits, {'OldAlias': 'same-person', 'NewAlias': 'same-person'})
        self.assertEqual(actual, [{'id': 'same-person', 'roles': ['changes', 'release'],
                                   'commits': ['a' * 40, 'b' * 40]}])

    def test_code_author_precedes_release_only_author_and_tools_are_excluded(self):
        commits = [{'sha': 'a' * 40, 'authors': ['Publisher'], 'release_only': True},
                   {'sha': 'b' * 40, 'authors': ['Author', 'Claude Opus 5.5', 'github-actions[bot]'], 'release_only': False}]
        actual = CREDITS.collect_credits(commits, {'Publisher': 'publisher', 'Author': 'author'})
        self.assertEqual([row['id'] for row in actual], ['author', 'publisher'])
        self.assertEqual(actual[1]['roles'], ['release'])

    def test_unknown_human_identity_requires_review(self):
        with self.assertRaisesRegex(ValueError, 'Unreviewed Git author'):
            CREDITS.collect_credits([{'sha': 'a' * 40, 'authors': ['Unknown person'], 'release_only': False}], {})


if __name__ == '__main__':
    unittest.main()
