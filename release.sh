#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./release.sh 1.0.3"
  exit 1
fi

VERSION=$1

# 1. Bump version in package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# 2. Commit and push
git add package.json
git commit -m "Release v$VERSION"

# 3. Tag and push (delete old tag if exists)
git tag -d "v$VERSION" 2>/dev/null || true
git push origin ":refs/tags/v$VERSION" 2>/dev/null || true
git tag "v$VERSION"
git push origin main --tags

echo "✅ Released v$VERSION — check Actions for build progress"
