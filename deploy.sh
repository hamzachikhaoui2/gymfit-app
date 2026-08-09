#!/bin/bash
# Publishes the current working tree to the public gymfit-app repo (GitHub
# Pages) as a single generic commit — no descriptive history, no personal
# detail beyond the files themselves. Real edit history stays in the
# private gymfit-source repo (origin), pushed separately/normally.
#
# This script is intentionally NOT committed to the public deploy repo.
set -e
cd "$(dirname "$0")"

git checkout --orphan deploy-squash-tmp
git add -A -- ':!deploy.sh'
git commit -q -m "deploy"
git push deploy deploy-squash-tmp:main --force
git checkout main
git branch -D deploy-squash-tmp

echo "Deployed. Live at https://hamzachikhaoui2.github.io/gymfit-app/"
