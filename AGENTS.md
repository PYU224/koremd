# KoreMD maintenance preferences

- User preference: include an app version update with future app fixes and improvements.
- For each release-sized change, normally increment the patch version and Android versionCode. Follow-up commits in the same unreleased PR may retain that version.
- Keep package.json, the root and packages[""].version in package-lock.json, android/app/build.gradle versionName, and the displayed version in src/views/SettingsView.vue consistent.
- Increment android/app/build.gradle versionCode above the previous release and update CHANGELOG.md and both fastlane locale changelogs using that code as the filename.
- Preserve historical release entries and F-Droid build/tag records; do not point metadata at a tag that has not been published.
- A version bump does not by itself authorize publishing a release, creating a tag, or merging a PR.
