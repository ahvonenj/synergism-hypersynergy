import importlib.util
import sys

sys.dont_write_bytecode = True
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "tools/build-docs.py"
SPEC = importlib.util.spec_from_file_location("build_docs", SCRIPT)
BUILD_DOCS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILD_DOCS)


class ChangelogValidationTests(unittest.TestCase):
    def entry(self):
        return {
            "id": "live-2.10.5e-bis",
            "version": "2.10.5e-bis",
            "channel": "live",
            "repository": "Ferlieloi/synergism-hypersynergy",
            "commit": "a" * 40,
            "previous_commit": None,
            "date": "2026-10-31",
            "date_kind": "tag",
            "status": "tagged",
            "release_url": None,
            "sources": [{"label": "Version tag", "url": "https://github.com/Ferlieloi/synergism-hypersynergy/tree/2.10.5e-bis"}],
            "changes": [{"type": "added", "text": "Διανομή resources"}],
            "notes": [],
        }

    def test_accepts_historical_version_labels_and_unicode(self):
        data = {"schema_version": 1, "methodology": ["Verified against GitHub history."], "entries": [self.entry()]}
        for version in ["2.10.5e-bis", "2.10", "2.3.0-a", "2.10.2x", "2.11 pre-release"]:
            data["entries"][0]["version"] = version
            self.assertEqual(BUILD_DOCS.validate_changelog(data)[0]["version"], version)

    def test_rejects_non_github_external_source(self):
        data = {"schema_version": 1, "methodology": ["Evidence"], "entries": [self.entry()]}
        data["entries"][0]["sources"][0]["url"] = "https://example.com/source"
        with self.assertRaisesRegex(ValueError, "only HTTPS github.com"):
            BUILD_DOCS.validate_changelog(data)

    def test_rejects_duplicate_version_ids(self):
        data = {"schema_version": 1, "methodology": ["Evidence"], "entries": [self.entry(), self.entry()]}
        with self.assertRaisesRegex(ValueError, "duplicate id"):
            BUILD_DOCS.validate_changelog(data)

    def test_rejects_unsafe_and_malformed_source_urls(self):
        for url in ["http://github.com/owner/repo", "https://github.com.evil.test/owner/repo", "javascript:alert(1)", "https://user:password@github.com/owner/repo"]:
            data = {"schema_version": 1, "methodology": ["Evidence"], "entries": [self.entry()]}
            data["entries"][0]["sources"][0]["url"] = url
            with self.assertRaisesRegex(ValueError, "only HTTPS github.com"):
                BUILD_DOCS.validate_changelog(data)

    def test_rejects_invalid_calendar_date(self):
        data = {"schema_version": 1, "methodology": ["Evidence"], "entries": [self.entry()]}
        data["entries"][0]["date"] = "2026-02-30"
        with self.assertRaisesRegex(ValueError, "invalid calendar date"):
            BUILD_DOCS.validate_changelog(data)


if __name__ == "__main__":
    unittest.main()
