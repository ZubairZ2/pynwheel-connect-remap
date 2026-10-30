# Git and GitHub recovery (verified October 30, 2026)

## Remotes of `~/pynwheel-staging`

| Remote | URL | Access on Oct 30 | Role |
|---|---|---|---|
| `origin` | `git@github-work:ZubairZ2/pynwheel-connect-remap.git` | push + pull over SSH as `ZubairZ2` | **the working remote**: every feature branch, every PR (#1–#55), and the recovery branch |
| `upstream` | `git@github-work:Pynwheel/pynwheel-staging.git` | reachable over SSH (`main` at `a5c8178ab`); `gh` cannot see it | the company repository the fork was cut from; never pushed to from here |
| `heroku` | `https://git.heroku.com/pyn-system.git` | Heroku CLI credentials (`zubair@pynwheel.com`) | the Rails CMS deploy target |
| `heroku-connect` | `https://git.heroku.com/pyn-system-connect.git` | same | the Connect (Next.js) deploy target |

Default branch `main`, tracked from `origin/main`. No submodules, no git-lfs, no hooks, no worktrees
other than the main checkout (the Claude desktop app had created worktrees under
`.claude/worktrees/`; none remained).

## Finding: `origin` is a PUBLIC repository

`gh repo view ZubairZ2/pynwheel-connect-remap` and the unauthenticated GitHub API both report
`visibility: public`. The task brief assumed a private remote. Everything on `main` (the Rails CMS, the
legacy React Native app, the QA reports) has therefore been world-readable for as long as the repository
has been public, and the repository's history was already known to contain an AWS key (GitHub push
protection fired on it earlier).

The recovery branch was still pushed there, because it is the only remote with write access, it is
where all previous work lives, and the branch was scanned (gitleaks + pattern review) and holds no
credential file. **Recommended before the wipe (your decision, not done here):** make the repository
private in GitHub → Settings → General → Danger Zone → Change visibility, and rotate the AWS key that
was once committed if that has not happened. Neither step changes anything in the recovery process.

## Two GitHub identities on this Mac

| Where | Identity | Capability |
|---|---|---|
| SSH key `~/.ssh/id_ed25519_work` via alias `github-work` | GitHub user **ZubairZ2** (key comment `zubair@pynwheel.com`) | owner of `origin`: push, create branches |
| `gh` CLI (`gh auth status`, keyring token, scopes `gist read:org repo workflow`) | GitHub user **ZubairZulfiqarZ2** | **pull-only** on `origin`; cannot open PRs there (`gh pr create` fails). PRs are opened in the browser from the compare link |
| `git config user.name` | `ZubairZulfiqarZ2`, e-mail `zubair.zulfiqar@7vals.com` | the name/e-mail stamped on commits |

Keep this split after the wipe or commits and pushes stop matching what the history shows.

## Restoring access (in order)

### A. Reuse the backed-up keys (only if company policy allowed `01_secrets/ssh/` to be kept)

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
cp "$BK/01_secrets/ssh/.ssh/"{config,id_ed25519_work,id_ed25519_work.pub,id_ed25519,id_ed25519.pub,id_ed25519_toptal,id_ed25519_toptal.pub,known_hosts} ~/.ssh/
chmod 600 ~/.ssh/id_ed25519* && chmod 644 ~/.ssh/*.pub ~/.ssh/config
ssh -T git@github-work        # expected: "Hi ZubairZ2! You've successfully authenticated..."
```

### B. New keys (if the private keys were not kept)

```bash
ssh-keygen -t ed25519 -C "zubair@pynwheel.com" -f ~/.ssh/id_ed25519_work
ssh-keygen -t ed25519 -C "zubair.zulfiqar@7vals.com" -f ~/.ssh/id_ed25519
cat > ~/.ssh/config <<'EOT'
Host github-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_work
    IdentitiesOnly yes
Host github-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
EOT
pbcopy < ~/.ssh/id_ed25519_work.pub
```

Then sign in to GitHub as **ZubairZ2** → Settings → SSH and GPG keys → New SSH key → paste, and the same
for the personal key on the ZubairZulfiqarZ2 account. Delete the old keys there once the new ones work.
`ssh -T git@github-work` must greet `ZubairZ2` before any clone.

### C. `gh` CLI and Heroku CLI (always regenerated; tokens are not in the backup except inside `hosts.yml`)

```bash
brew install gh heroku/brew/heroku
gh auth login            # choose GitHub.com, HTTPS, log in as ZubairZulfiqarZ2 (browser)
heroku login             # browser; account zubair@pynwheel.com
heroku config -a pyn-system >/dev/null && echo heroku ok
```

### D. Git identity

```bash
git config --global user.name "ZubairZulfiqarZ2"
git config --global user.email "zubair.zulfiqar@7vals.com"
git config --global credential.https://git.heroku.com.helper '!heroku git:credentials'
```

## Getting the repository and the recovery branch back

```bash
cd ~
git clone git@github-work:ZubairZ2/pynwheel-connect-remap.git pynwheel-staging
cd pynwheel-staging
git remote add upstream git@github-work:Pynwheel/pynwheel-staging.git
git remote add heroku https://git.heroku.com/pyn-system.git
git remote add heroku-connect https://git.heroku.com/pyn-system-connect.git
git fetch --all

# the recovery branch (untracked docs, PR descriptions, audit scripts, this package)
git switch --track origin/temporary/local_unpushed_code_branch
ls docs/recovery scripts/recovery PR_DESCRIPTION_*.md

# the stash, as a branch (Xcode project edits for the TestFlight build) — look, don't merge
git branch temporary/stash-igloohome-ios-plugin-prep-2026-10-30 origin/temporary/stash-igloohome-ios-plugin-prep-2026-10-30
git diff main temporary/stash-igloohome-ios-plugin-prep-2026-10-30 -- tour-app/ios | head -50
```

To carry the untracked documents into day-to-day work without merging the snapshot branch, copy them:

```bash
git switch main
git checkout temporary/local_unpushed_code_branch -- docs/recovery scripts/recovery   # or any file
git restore --staged .   # they are now untracked copies on main, exactly as before the wipe
```

(The PR description files, hand-off documents and `db_compat_audit/` can be checked out the same way.)

Local branches that existed on October 30 and are all on `origin` under the same names: see
`manifests/system-environment-inventory.txt` is not the place; run `git branch -r` after the clone. The
one local branch that had a commit missing from `origin` (`fix/integration_btw_locks_visitors_settings_mobile_app`,
a hydration-warning fix already merged to `main` as `823238275`) was pushed on October 30 as well.

## Offline fallback: the git bundle

`05_git_bundles/pynwheel-staging-all-refs.bundle` in the local backup holds every local branch,
including the stash branch, independent of GitHub:

```bash
git clone "$BK/05_git_bundles/pynwheel-staging-all-refs.bundle" pynwheel-staging
cd pynwheel-staging && git remote set-url origin git@github-work:ZubairZ2/pynwheel-connect-remap.git
```

## Other repositories on this Mac (not Pynwheel)

`collect_local_backup.sh` bundled only what was missing from their remotes; `05_git_bundles/<name>/`
holds, per repository, `remotes.txt`, `branches.txt`, an `-unpushed-commits.bundle` (if any),
`-uncommitted.patch` (if any) and `-untracked.tar.gz` (if any). State on October 30:

| Repository | Remote | Unpushed commits | Uncommitted | Untracked |
|---|---|---|---|---|
| `~/ezofficeinventory` (7Vals) | github.com:7Vals/ezofficeinventory | **2** (branch `feature/improving_the_time_base_logic`, last commit Oct 30) | 0 | 0 |
| `~/zubair-portfolio` | **none** | 1 (the whole repo) | 32 files | 20 |
| `~/sample_pyn_wheel_map` | **none** | 1 (the whole repo) | 22 | 9 |
| `~/OpenDocuments` | github.com:joungminsung/OpenDocuments | 1 | 48 | 0 |
| `~/FatimaFoundationPortfolio` | github.com:ZubairZulfiqarZ2/fatimaalifoundation | 0 | 32 | 0 |
| `~/smartprep-ai` | github.com/Qubit-Labz/smartprep-ai | 0 | 24 | 2 |
| `~/Jira_EZO_Integration` (7Vals) | github.com:7Vals/Jira_EZO_Integration | 0 | 156 | 0 |
| `~/pyn-system` | github-work:intawais/pyn-system | 0 | 0 | 0 |
| `~/aw-watcher-web` | github.com/haroon7v/aw-watcher-web | 0 | 1 | 0 |
| `~/Zubair-zulifqar` (Toptal) | git-toptal:screening-ops/Zubair-zulifqar | 0 | 8 | 0 |
| `~/Downloads/foodie` (Toptal) | git.toptal.com:screening-ops/Haroon-rasheed | 0 | 5 | 3 |

Restore any of them with `git clone <remote>`, then `git fetch <bundle>` / `git am` or `git apply <patch>` /
`tar -xzf <untracked>`. Those with no remote are rebuilt from the bundle alone. Pushing the
ezofficeinventory commits before the wipe is the simpler path and is listed in the checklist.
