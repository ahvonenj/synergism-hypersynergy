#!/usr/bin/env python3
"""Copy generated pages into an existing, authenticated GitHub Wiki checkout.

Does not initialize, delete pages, stage, commit or push. Review the diff afterward.
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REMOTE = "Ferlieloi/synergism-hypersynergy.wiki"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkout", type=Path, help="An existing clone of the target GitHub Wiki")
    args = parser.parse_args()
    checkout = args.checkout.resolve()
    if not (checkout / ".git").exists():
        parser.error("Target must be a Git Wiki checkout, not a folder in the main repository")
    remote = subprocess.run(["git", "-C", str(checkout), "remote", "get-url", "origin"],
                            check=True, text=True, capture_output=True).stdout.strip()
    allowed = {f"https://github.com/{REMOTE}.git", f"https://github.com/{REMOTE}",
               f"git@github.com:{REMOTE}.git", f"ssh://git@github.com/{REMOTE}.git"}
    if remote not in allowed:
        parser.error("Origin must be the Ferlieloi/synergism-hypersynergy GitHub Wiki")
    subprocess.run([sys.executable, str(ROOT / "scripts/tools/build-docs.py"), "--check"], check=True)
    pages = sorted((ROOT / "docs/wiki-source").glob("*.md"))
    if not pages:
        parser.error("No generated wiki pages found")
    for source in pages:
        target = checkout / source.name
        if target.is_symlink():
            parser.error(f"Refusing to overwrite a symlink: {target.name}")
    for source in pages:
        shutil.copyfile(source, checkout / source.name)
    print(f"Copied {len(pages)} pages. Unrelated pages retained. No files staged or committed.")
    print("Review with: git diff --stat (new pages also appear in git status).")


if __name__ == "__main__":
    main()
