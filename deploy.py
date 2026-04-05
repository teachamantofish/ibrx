#!/usr/bin/env python3
"""
Deploy web app files from code/ to docs/.

Steps:
  1. Wipe docs/ and copy all web assets from code/ (excluding python/, .claude/, __pycache__).
  2. Run js/obfuscate.js from docs/ to minify HTML and obfuscate JS in-place.
  3. Remove obfuscate.js from docs/ (it's a build tool, not a web asset).

Usage:
  python3 deploy.py              # copy + obfuscate
  python3 deploy.py --no-obfuscate  # copy only
"""

import argparse
import os
import shutil
import subprocess
import sys

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(REPO_ROOT, "code")
DST = os.path.join(REPO_ROOT, "docs")

# Paths relative to SRC that are not web assets
EXCLUDE_DIRS = {".claude", "python "}
EXCLUDE_FILES = {"js/obfuscate.js"}  # relative to SRC, using forward slashes


def copy_assets():
    if os.path.exists(DST):
        shutil.rmtree(DST)
    os.makedirs(DST)

    for dirpath, dirnames, filenames in os.walk(SRC):
        # Prune excluded dirs in-place so os.walk doesn't descend into them
        rel_dir = os.path.relpath(dirpath, SRC)
        dirnames[:] = [
            d for d in dirnames
            if d not in EXCLUDE_DIRS and d != "__pycache__"
        ]

        for filename in filenames:
            src_file = os.path.join(dirpath, filename)
            rel_file = os.path.relpath(src_file, SRC).replace(os.sep, "/")

            if rel_file in EXCLUDE_FILES:
                continue

            dst_file = os.path.join(DST, rel_file)
            os.makedirs(os.path.dirname(dst_file), exist_ok=True)
            shutil.copy2(src_file, dst_file)

    print(f"Copied assets: {SRC} → {DST}")


def run_obfuscation():
    obfuscate_src = os.path.join(SRC, "js", "obfuscate.js")
    obfuscate_dst = os.path.join(DST, "js", "obfuscate.js")

    if not os.path.exists(obfuscate_src):
        print("Warning: js/obfuscate.js not found, skipping obfuscation")
        return

    # Copy the build script into docs/ so it can resolve node_modules from code/
    shutil.copy2(obfuscate_src, obfuscate_dst)

    try:
        result = subprocess.run(
            ["node", "js/obfuscate.js"],
            cwd=DST,
            check=True,
            capture_output=True,
            text=True,
        )
        print(result.stdout.strip())
    except FileNotFoundError:
        print("Error: 'node' not found. Install Node.js to run obfuscation.", file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"Obfuscation failed:\n{e.stderr}", file=sys.stderr)
        sys.exit(1)
    finally:
        if os.path.exists(obfuscate_dst):
            os.remove(obfuscate_dst)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-obfuscate", action="store_true", help="Skip obfuscation/minification step")
    args = parser.parse_args()

    copy_assets()

    if not args.no_obfuscate:
        run_obfuscation()

    print("Deploy complete →", DST)


if __name__ == "__main__":
    main()
