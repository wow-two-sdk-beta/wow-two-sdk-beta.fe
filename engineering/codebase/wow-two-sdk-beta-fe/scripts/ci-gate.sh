#!/usr/bin/env bash
# Pre-push gate: runs the release-fe validation (Install .. Packed consumer) as CI does, inside Docker.
# Usage and behavior: `pnpm gate --help`. Written for macOS bash 3.2 (no `timeout`, `flock`, assoc arrays).
set -euo pipefail

IMAGE=${GATE_IMAGE:-mcr.microsoft.com/playwright:v1.62.1-noble}
CPUS=${GATE_CPUS:-4}
TMP_BASE=${TMPDIR:-/tmp}
TMP_BASE=${TMP_BASE%/}
OUT=${GATE_OUT:-$TMP_BASE/fe-gate}
LOCK_DIR=$TMP_BASE/fe-gate.lock
VOLUME=fe-gate-pnpm-store
CONTAINER=fe-gate-$$
ALL_STEPS="install typecheck lint format test build playground smoke package"
TAIL_LINES=60

STEPS=
STEPS_GIVEN=0
REF=
LOG=
CURRENT=setup
LOCK_HELD=0
CONTAINER_STARTED=0
SUMMARY_DONE=0

usage() {
  cat <<'EOF'
Usage: pnpm gate [--steps a,b,c] [--ref <git-ref>] [-h|--help]
Runs the release-fe CI checks in Docker (Playwright image, linux/amd64, 4 CPUs, CI=true) so a push is red-free.
  Steps, CI order: install typecheck lint format test build playground smoke package (default all)
  --steps  a subset; install always runs first, build is added ahead of playground, smoke and package
  --ref    validate the package dir at a git ref (git archive) instead of the working tree
  Source   working tree, uncommitted and untracked files included, minus node_modules/dist/.git: commit what the push needs
  Stops at the first failing step; a failing `test` still runs to completion. No bump, publish, tag or notes.
  Env      GATE_IMAGE (mcr.microsoft.com/playwright:v1.62.1-noble, its version must equal the lockfile's playwright)
           GATE_CPUS (4)   GATE_OUT (log dir, default ${TMPDIR:-/tmp}/fe-gate)
  Cache    pnpm store in docker volume fe-gate-pnpm-store; container fe-gate-<pid>, removed on exit or interrupt
  Lock     one gate per host: ${TMPDIR:-/tmp}/fe-gate.lock holds the pid; a second run prints it and exits 3
  Log      $GATE_OUT/gate-<timestamp>.log has all output; stdout has step start/end lines with seconds
  Result   last line `GATE PASS|FAIL step=<name> log=<path>`; PASS of a subset ends `partial=yes` and is no push signal
           Exit 0 PASS, 1 FAIL, 2 usage or preflight, 3 lock. On FAIL the last 60 lines of the step print.
  Who      a checker runs it once before any push touching the package (~10 min full); a red log goes to ONE agent.
EOF
}

emit_summary() { # result step [extra]
  SUMMARY_DONE=1
  printf 'GATE %s step=%s log=%s%s\n' "$1" "$2" "${LOG:--}" "${3:+ $3}"
}

die() { # exit-code step message...
  local code=$1 step=$2
  shift 2
  printf '[gate] %s\n' "$*"
  if [ -n "$LOG" ]; then printf '[gate] %s\n' "$*" >>"$LOG"; fi
  emit_summary FAIL "$step"
  exit "$code"
}

mark() {
  if [ -n "$LOG" ]; then
    printf '[gate] %s %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$LOG"
  else
    printf '[gate] %s %s\n' "$(date +%H:%M:%S)" "$*"
  fi
}

on_exit() {
  local rc=$?
  trap - EXIT INT TERM HUP
  if [ "$CONTAINER_STARTED" = 1 ]; then docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; fi
  if [ "$LOCK_HELD" = 1 ]; then rm -rf "$LOCK_DIR"; fi
  if [ "$SUMMARY_DONE" = 0 ]; then
    [ "$rc" -ne 0 ] || rc=1
    emit_summary FAIL "$CURRENT" "(interrupted or crashed, rc=$rc)"
  fi
  exit "$rc"
}
trap on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

# --- arguments ---------------------------------------------------------------------------------
while [ $# -gt 0 ]; do
  case $1 in
    -h | --help) usage; SUMMARY_DONE=1; exit 0 ;;
    --steps) [ $# -ge 2 ] || die 2 usage "--steps needs a value"; STEPS=$2; STEPS_GIVEN=1; shift 2 ;;
    --steps=*) STEPS=${1#*=}; STEPS_GIVEN=1; shift ;;
    --ref) [ $# -ge 2 ] || die 2 usage "--ref needs a value"; REF=$2; shift 2 ;;
    --ref=*) REF=${1#*=}; shift ;;
    *) die 2 usage "unknown argument '$1' (see --help)" ;;
  esac
done

in_list() { case " $1 " in *" $2 "*) return 0 ;; *) return 1 ;; esac; }

WANT=
if [ "$STEPS_GIVEN" = 1 ]; then
  [ -n "$STEPS" ] || die 2 usage "--steps is empty (see --help)"
  for s in ${STEPS//,/ }; do
    in_list "$ALL_STEPS" "$s" || die 2 usage "unknown step '$s' (steps: $ALL_STEPS)"
    WANT="$WANT $s"
  done
else
  WANT=$ALL_STEPS
fi
# install first, build before its consumers, playground before smoke
if in_list "$WANT" smoke; then WANT="$WANT playground"; fi
if in_list "$WANT" playground || in_list "$WANT" smoke || in_list "$WANT" package; then WANT="$WANT build"; fi
WANT="$WANT install"
RUN_STEPS=
for s in $ALL_STEPS; do
  if in_list "$WANT" "$s"; then RUN_STEPS="$RUN_STEPS $s"; fi
done
RUN_STEPS=${RUN_STEPS# }
PARTIAL=0
for s in $ALL_STEPS; do
  in_list "$RUN_STEPS" "$s" || PARTIAL=1
done

case $CPUS in '' | *[!0-9]* | 0) die 2 usage "GATE_CPUS must be a positive integer, got '$CPUS'" ;; esac

PKG=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)

# --- host lock: one gate at a time ---------------------------------------------------------------
pid_alive() { kill -0 "$1" 2>/dev/null || ps -p "$1" >/dev/null 2>&1; }
pid_is_gate() { # a live pid that is not a gate (pid reuse after a crash) is a stale holder
  local cmd
  cmd=$(ps -p "$1" -o command= 2>/dev/null || true)
  if [ -z "$cmd" ]; then return 0; fi
  case $cmd in *ci-gate.sh*) return 0 ;; *) return 1 ;; esac
}

refuse() {
  printf '[gate] %s\n' "$*"
  emit_summary FAIL lock "(another gate holds the host)"
  exit 3
}

acquire_lock() {
  local holder hlog
  for _ in 1 2 3; do
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      printf '%s\n' "$$" >"$LOCK_DIR/pid"
      LOCK_HELD=1
      return 0
    fi
    holder=$(cat "$LOCK_DIR/pid" 2>/dev/null || true)
    if [ -z "$holder" ]; then sleep 1; holder=$(cat "$LOCK_DIR/pid" 2>/dev/null || true); fi
    if [ -n "$holder" ] && pid_alive "$holder" && pid_is_gate "$holder"; then
      hlog=$(cat "$LOCK_DIR/log" 2>/dev/null || echo unknown)
      refuse "another gate is running: pid $holder, log $hlog. One full suite at a time on this host; wait for it. If pid $holder is not a gate: rm -rf $LOCK_DIR"
    fi
    mv "$LOCK_DIR" "$LOCK_DIR.stale.$$" 2>/dev/null && rm -rf "$LOCK_DIR.stale.$$" || true
  done
  refuse "could not take the lock $LOCK_DIR"
}
acquire_lock

# --- log -----------------------------------------------------------------------------------------
mkdir -p "$OUT" || die 2 preflight "cannot create GATE_OUT $OUT"
OUT=$(cd "$OUT" && pwd -P)
LOG=$OUT/gate-$(date +%Y%m%d-%H%M%S).log
: >"$LOG"
printf '%s\n' "$LOG" >"$LOCK_DIR/log"
{
  printf '[gate] steps: %s\n' "$RUN_STEPS"
  printf '[gate] pkg: %s\n' "$PKG"
  printf '[gate] image: %s  cpus: %s  container: %s  volume: %s\n' "$IMAGE" "$CPUS" "$CONTAINER" "$VOLUME"
} | tee -a "$LOG"
if [ "$PARTIAL" = 1 ]; then mark "partial run: a PASS here is not a push signal"; fi

# --- preflight -----------------------------------------------------------------------------------
CURRENT=preflight
command -v docker >/dev/null 2>&1 || die 2 preflight "docker CLI not found"
docker info >/dev/null 2>&1 || die 2 preflight "Docker is not responding: start Docker Desktop and rerun"
ncpu=$(docker info --format '{{.NCPU}}' 2>/dev/null || echo 0)
[ "$ncpu" -ge "$CPUS" ] 2>/dev/null || die 2 preflight "the Docker VM has $ncpu CPUs, GATE_CPUS=$CPUS needs more: raise CPUs in Docker Desktop or lower GATE_CPUS"
docker image inspect "$IMAGE" >/dev/null 2>&1 || die 2 preflight "image $IMAGE is not local; run: docker pull --platform linux/amd64 $IMAGE"

REPO_ROOT=
REL=
if [ -n "$REF" ]; then
  REPO_ROOT=$(git -C "$PKG" rev-parse --show-toplevel 2>/dev/null) || die 2 preflight "--ref needs a git checkout"
  REL=$(git -C "$PKG" rev-parse --show-prefix)
  git -C "$REPO_ROOT" rev-parse --verify --quiet "$REF^{commit}" >/dev/null || die 2 preflight "unknown git ref '$REF'"
  lock_text() { git -C "$REPO_ROOT" show "$REF:${REL}pnpm-lock.yaml"; }
else
  lock_text() { cat "$PKG/pnpm-lock.yaml"; }
fi
lock_pw=$(lock_text | sed -nE 's/^  playwright@([0-9][0-9.]*):.*/\1/p' | sort -u | tr '\n' ' ')
lock_pw=${lock_pw% }
img_pw=$(printf '%s' "${IMAGE##*:}" | sed -nE 's/^v?([0-9]+\.[0-9]+\.[0-9]+).*/\1/p')
[ -n "$lock_pw" ] || die 2 preflight "no playwright@<version> entry in pnpm-lock.yaml; cannot match the image"
[ -n "$img_pw" ] || die 2 preflight "cannot read a playwright version from GATE_IMAGE tag '${IMAGE##*:}' (expected v<x.y.z>-<distro>)"
if [ "$lock_pw" != "$img_pw" ]; then
  die 2 preflight "playwright mismatch: pnpm-lock.yaml pins $lock_pw, image tag is $img_pw. Fix: docker pull --platform linux/amd64 mcr.microsoft.com/playwright:v$lock_pw-noble, then GATE_IMAGE=mcr.microsoft.com/playwright:v$lock_pw-noble pnpm gate, and update the default in scripts/ci-gate.sh"
fi

for name in $(docker ps --filter 'name=^fe-gate-' --format '{{.Names}}' 2>/dev/null || true); do
  [ "$name" = "$CONTAINER" ] || refuse "container $name is still running (pid ${name#fe-gate-}): another gate, or a crashed one. If its gate is gone: docker rm -f $name"
done

# --- run helpers ---------------------------------------------------------------------------------
bg() { # run "$@" with output into the log; waiting on a background job keeps signals deliverable
  "$@" >>"$LOG" 2>&1 &
  local pid=$!
  if wait "$pid"; then return 0; else return $?; fi
}

copy_worktree() {
  COPYFILE_DISABLE=1 tar -C "$PKG" -cf - --no-xattrs \
    --exclude node_modules --exclude dist --exclude .git --exclude coverage --exclude .turbo --exclude .cache \
    --exclude .vitest-attachments --exclude __screenshots__ --exclude .DS_Store . |
    docker exec -i "$CONTAINER" tar -xf - -C /work --no-same-owner
}

copy_ref() {
  local strip
  strip=$(printf '%s' "$REL" | tr -cd '/' | wc -c | tr -d ' ')
  git -C "$REPO_ROOT" archive --format=tar "$REF" -- "${REL:-.}" |
    docker exec -i "$CONTAINER" tar -xf - -C /work --strip-components="$strip" --no-same-owner
}

in_container() { docker exec -w /work "$CONTAINER" bash -c "$1"; }

fail_step() { # step first-log-line
  local step=$1 first=$2
  {
    printf '[gate] last %s lines of %s:\n' "$TAIL_LINES" "$step"
    tail -n +"$first" "$LOG" | tail -n "$TAIL_LINES"
    printf '[gate] full log: %s\n' "$LOG"
  }
  emit_summary FAIL "$step"
  exit 1
}

step_cmd() {
  case $1 in
    install) echo 'pnpm install --frozen-lockfile' ;;
    typecheck) echo 'pnpm typecheck' ;;
    lint) echo 'pnpm lint' ;;
    format) echo 'pnpm format:check' ;;
    test) echo 'pnpm test' ;;
    build) echo 'pnpm build' ;;
    playground) echo 'pnpm --filter playground build' ;;
    smoke) echo 'node apps/playground/tests/gallery-smoke.mjs' ;;
    package) echo 'pnpm check:package --install --output /tmp/fe.tgz' ;;
  esac
}

# --- setup: container, source, tools -------------------------------------------------------------
CURRENT=setup
first=$(($(wc -l <"$LOG") + 1))
t0=$(date +%s)
mark "START setup (container $CONTAINER, source ${REF:-working tree})"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
CONTAINER_STARTED=1
bg docker run -d --name "$CONTAINER" --platform linux/amd64 --cpuset-cpus="0-$((CPUS - 1))" --init --shm-size=1g \
  -v "$VOLUME:/store" -e CI=true -e NO_COLOR=1 -e COREPACK_HOME=/store/corepack \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 -e npm_config_store_dir=/store/pnpm \
  --entrypoint sleep "$IMAGE" infinity || fail_step setup "$first"
bg docker exec "$CONTAINER" mkdir -p /work || fail_step setup "$first"
if [ -n "$REF" ]; then bg copy_ref || fail_step setup "$first"; else bg copy_worktree || fail_step setup "$first"; fi
# check-capabilities reads `git ls-files`, so the copy needs a git index; pnpm comes from packageManager via corepack
# shellcheck disable=SC2016
bg in_container 'git init -q && git add -A && corepack enable && echo "node $(node -v) pnpm $(pnpm -v) nproc $(nproc) store $(pnpm store path)" && ls /work | head -40' || fail_step setup "$first"
mark "END   setup $(($(date +%s) - t0))s"

# --- steps ---------------------------------------------------------------------------------------
for step in $RUN_STEPS; do
  CURRENT=$step
  t0=$(date +%s)
  mark "START $step: $(step_cmd "$step")"
  first=$(($(wc -l <"$LOG") + 1))
  if bg in_container "$(step_cmd "$step")"; then
    mark "END   $step ok $(($(date +%s) - t0))s"
  else
    rc=$?
    mark "END   $step FAILED rc=$rc $(($(date +%s) - t0))s"
    fail_step "$step" "$first"
  fi
done

if [ "$PARTIAL" = 1 ]; then
  emit_summary PASS "${RUN_STEPS// /,}" "partial=yes${REF:+ src=$REF}"
else
  emit_summary PASS all "${REF:+src=$REF}"
fi
