# Repository structure — `~/pynwheel-staging` (October 30, 2026)

Remote `origin` = `ZubairZ2/pynwheel-connect-remap` (GitHub, public), default branch `main`.
Working tree ≈ 2.2 GB including the ignored vendored gems and `node_modules`.

```
pynwheel-staging/
├── app/                      Rails CMS: models (~130), controllers (legacy HAML UI, connect/, api/{partner,self_tour,touch,tour_app/v1,v1,v2}),
│                             services/ (bookings/, connect/, crm_providers/, data_providers/, self_tour/, igloohome_*…), serializers/,
│                             queries/, jobs/, workers/ (TwilioSmsWorker…), uploaders/ (CarrierWave), views/, assets/, datatables/, themes/
├── config/                   routes.rb (Connect JSON scope at /communities/:id/connect, Tour App API at /api/tour/v1), database.yml (tracked),
│                             application.yml (figaro, IGNORED), environments/{development,test,staging,production}.rb, initializers/ (redis, sidekiq…)
├── db/                       migrate/ (latest 20261029120000), schema.rb (tracked)
├── lib/tasks/                 ~42 rake tasks: property_clone, svg_optimizer, wayfinding_repair/snapshot, provider syncs (yardi, realpage, entrata…)
├── test/                     Minitest (102 files, tracked since Oct 5 2026)
├── script/                   property_clone/, svg_background_optimizer.rb, tour_api_parity.rb, tour_api_measure.rb
├── scripts/                  show_visitor_otp.sh; recovery/ (this package's scripts)
├── docs/                     map-SDK plans, property_clone/, recovery/ (this package)
├── bin/                      rails, rake, bundle, setup, spring (tracked); generated binstubs IGNORED
├── public/, vendor/, log/, tmp/
├── Gemfile, Gemfile.lock      ruby 3.3.5, Rails 7.2.2, Bundler 2.5.16
├── Procfile                  web (puma) + worker (sidekiq) for Heroku
├── .bundle/config (IGNORED)  BUNDLE_PATH=gems + native build flags       gems/ cache/ bundler/ extensions/ build_info/ specifications/ (IGNORED, 1 GB)
├── .ruby-version (IGNORED)   3.3.5
├── .claude/ (IGNORED)        launch.json (dev-server recipes), settings.local.json, worktrees/
│
├── pyn-connect-web/          Pynwheel Connect (Next.js 15, React 19, Redux Toolkit) — src/, tests/ (Playwright), public/, Dockerfile,
│                             DEPLOYMENT.md, README.md, .env.example, .env.local (IGNORED), .nvmrc=22, package-lock.json, vitest/playwright configs
├── tour-app/                 Pynwheel Tour (Vite 8 + React 19 + Capacitor 8) — src/ (screens, wayfinding engine, repositories), public/, assets/,
│                             icons/, dist/ (build), ios/App (Xcode project, CapApp-SPM), android/ (Gradle 8.14.3, AGP 8.13),
│                             plugins/igloohome-ble/ (Kotlin + Swift Bluetooth plugin, Package.swift), capacitor.config.ts,
│                             .env.{development,staging,production,example} (tracked), .env.production.local (IGNORED), README.md
├── pyn-tour-old/             the legacy React Native 0.63 tour app (reference only); .env, selftour-key.keystore, local.properties,
│                             ios/Zerv_SDK_Library.framework are IGNORED and in the local backup
│
├── context.md                THE repository context (stack, domain model, env names, hygiene rules, key documents)
├── PYN_CONNECT_PROGRESS.md   the running progress / decisions / traps log (§1–§52, through October 28, 2026)
├── react-architecture.md     Connect frontend architecture
├── *_QA*.md, *REPORT*.md, PR_DESCRIPTION_*.md, hand_off_doc_*.md, HANDOFF_*.md   QA reports, PR texts, hand-offs (many tracked; the
│                             October 18–29 ones were untracked and are on the recovery branch)
├── tour-app-*.md, tour_app_backend.md, pynwheel_tour_app_*.md, IGLOO_INTEGRATION_mobile_app.md, LEGACY_*.md   Tour App design/implementation docs
├── gaps_*.md, feature_*.md, *_plan*.md, map_*.md, ploting_*.md   feature briefs and gap analyses (some IGNORED: feature1.md, feature-whole-ui-next.md…)
├── pyn-connect-new.html, pyn-connect-22-sep-new.html, tour-app.html, wayfinding-tour-app.html, Oct_27_… .html   bundled design exports (IGNORED/untracked, 18–21 MB each, in the backup);
│                             pyn-connect-amenties.html is tracked
├── db_compat_audit/          legacy/production DB coexistence audit (scripts + evidence) — untracked, on the recovery branch
├── wayfinding_rnd/, svg_map_qa/, visitors_module_qa/, qa/   R&D and QA evidence
├── artifacts/ (IGNORED)      built APKs, in the backup
├── deploy_production.sh      Heroku deploy of main to pyn-system + pyn-system-connect — untracked, on the recovery branch
├── credentails.md            CheckpointID + Twilio secrets — untracked, NEVER in git, in the backup
├── 3dCOnfig.json, AGaramondPro-Regular.otf, toc-prod*.list, .buildpacks~, .gitignore~   tracked oddities (leave as is)
└── .gitignore                 see "Local-only material" section: gems tree, binstubs, dumps, design HTML, briefs, .claude/
```

Branch naming in use: `feature/*`, `fix/*`, `improvement(s)/*`, `performance/*`, `docs/*`, `qa/*`,
`temporary/*` (recovery). Every change goes through a branch and a PR into `main`; `main` is deployed to
Heroku by hand with `deploy_production.sh`.
