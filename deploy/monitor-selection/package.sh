#!/usr/bin/env bash
set -euo pipefail
repo_root=$(git -C "$(dirname "$0")/../.." rev-parse --show-toplevel)
cd "$repo_root"
git diff --quiet && git diff --cached --quiet || {
    echo 'Commit tracked changes before packaging a deployment.' >&2
    exit 1
}
source_commit=$(git rev-parse HEAD)
if [[ $# -gt 1 ]]; then
    echo 'Usage: deploy/monitor-selection/package.sh [new-output-directory]' >&2
    exit 1
fi
if [[ $# -eq 1 ]]; then
    [[ ! -e "$1" ]] || { echo 'The output path must not exist.' >&2; exit 1; }
    mkdir -p "$1"
    output_dir=$(cd "$1" && pwd)
else
    output_dir=$(mktemp -d "/tmp/xibo-cms-fork-${source_commit:0:12}.XXXXXX")
fi
# This repository uses npm and commits its lockfile. Install with npm ci first.
npm --prefix frontend run build
mkdir -p "$output_dir/runtime/web"
git archive "$source_commit" \
    lib/Controller/DisplayProfileConfigFields.php \
    lib/Entity/Display.php \
    lib/Factory/DisplayFactory.php \
    lib/Factory/DisplayProfileFactory.php \
    lib/Helper/MonitorInventory.php \
    lib/Xmds/Soap4.php \
    db/migrations/20261109150000_add_windows_monitor_inventory.php \
    locale/pt_BR.mo | tar -xf - -C "$output_dir/runtime"
cp -a frontend/dist "$output_dir/runtime/web/app"
printf '%s\n' "$source_commit" > "$output_dir/runtime/commit.sha"
cp deploy/monitor-selection/Containerfile "$output_dir/Containerfile"
(
    cd "$output_dir"
    find runtime -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
)
tar -czf "$output_dir.tar.gz" -C "$output_dir" Containerfile SHA256SUMS runtime
sha256sum "$output_dir.tar.gz"
printf 'Source: %s\nContext: %s\nArchive: %s.tar.gz\n' "$source_commit" "$output_dir" "$output_dir"
