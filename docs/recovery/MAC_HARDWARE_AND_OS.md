# Mac hardware and operating system (verified October 30, 2026)

Captured with `sw_vers`, `uname -a`, `system_profiler SPHardwareDataType`, `df -h`, `diskutil list`.
Serial number, hardware UUID and provisioning UDID were deliberately left out.

## Hardware

| Item | Value |
|---|---|
| Model | MacBook Air (`Mac16,12`, model number MC6T4LL/A) |
| Chip | Apple M4, 10 cores (4 performance + 6 efficiency), Apple Silicon (`arm64`) |
| Memory | 16 GB |
| Storage | 251 GB internal SSD (`disk0`), APFS |
| Firmware | System Firmware 20457.1.29, OS Loader 20457.1.29 |

## Operating system

| Item | Value |
|---|---|
| macOS | 27.0.1, build 26A434 |
| Kernel | Darwin 27.0.0 (`xnu-13432.1.9~1/RELEASE_ARM64_T8132`) |
| Default shell | `/bin/zsh` (zsh 5.9, arm64) |
| Xcode Command Line Tools | 27.0.0.0.1788430756, developer dir `/Applications/Xcode.app/Contents/Developer` (also `/Library/Developer/CommandLineTools` present) |
| Homebrew | 7.0.9 at `/opt/homebrew` (Apple Silicon prefix) |

## Disk and volumes (October 30, 2026)

```
/dev/disk0  251.0 GB  GUID partition scheme
  disk0s1   524 MB    Apple_APFS_ISC
  disk0s2   245.1 GB  Apple_APFS container disk3
  disk0s3   5.4 GB    Apple_APFS_Recovery
disk3 (APFS container)
  Macintosh HD   13.7 GB   (system, sealed snapshot mounted at /)
  Preboot        10.9 GB
  Recovery       1.5 GB
  Data           201.6 GB  (/System/Volumes/Data — the user data)
  VM             7.5 GB
```

`df -h` at capture time: Data volume 228 GiB size, 188 GiB used, **9 GiB free (96 %)**. The large
consumers are the local PostgreSQL databases (three copies of the production database, ~24 GB), the
vendored gem tree in the repository (`gems/`, 970 MB), `node_modules` trees, `~/.gradle` (3.1 GB),
`~/ezofficeinventory` (7.6 GB) and Xcode DerivedData (527 MB). None of these need to be backed up as
files; the recovery guide regenerates them.

## PATH as seen by a login shell

In this order (from `echo $PATH`), which explains most of the Ruby traps in TROUBLESHOOTING.md:

```
~/.rvm/gems/ruby-3.1.4/bin
~/.rvm/gems/ruby-3.1.4@global/bin
~/.rvm/rubies/ruby-3.1.4/bin
~/.rbenv/shims
~/.local/bin
~/go/bin
/opt/homebrew/bin
/opt/homebrew/sbin
/usr/local/bin
/System/Cryptexes/App/usr/bin
/usr/bin  /bin  /usr/sbin  /sbin
/Library/Apple/usr/bin
~/.rvm/bin
```

RVM's default ruby (3.1.4) comes first, rbenv's shims second, Homebrew third. The project's Ruby
(RVM 3.3.5) is selected by path in every working command (see DEVELOPMENT_COMMANDS.md).

Environment variables relevant to development that are **not** set in the shell: `JAVA_HOME`,
`ANDROID_HOME`, `ANDROID_SDK_ROOT`. Gradle and Android Studio find their JDK and SDK through their own
settings (ANDROID_STUDIO_SETUP_AND_RECOVERY.md), so nothing depends on these being exported.

## Installed command-line tooling (summary; versions in `manifests/system-environment-inventory.txt`)

git 2.52.0 (Homebrew), gh 2.98.0, heroku 11.10.0, node 26.8.2, npm 11.19.1, yarn 1.22.22,
python3 3.15.0, rbenv 1.3.2, rvm 1.29.12-next, psql 18.6 (client) with PostgreSQL 16.15 server,
redis 8.10.1, watchman 2026.10.12.00, ImageMagick 7.1.2-31, gitleaks 8.30.1 (installed October 30
for the secret scan), adb 37.0.1, Xcode 27.0.
