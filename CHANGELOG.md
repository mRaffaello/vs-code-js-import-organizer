# Change Log

All notable changes to the "vs-code-js-import-organizer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.3] - 2022-06-27

## Added

-   Linux support

## Removed

-   Subdir libraries dependencies

## [0.2.2] - 2022-06-13

### Fixed

-   Duplicate import error when multiLine import as last line

## [0.2.1] - 2022-06-13

### Added

-   Config parameter `organizeOnSave`
-   Config reload on changes

### Fixed

-   Organization of files without imports

### Removed

-   Unsupported file type when organizing on save

## [0.2.0] - 2022-06-08

### Added

-   Automatic activation when .sorterconfig.json is present
-   On save support
-   Checking for errors before sorting

## [0.1.1] - 2022-06-06

### Added

-   Hot reload on filesystem changes
-   Double quotes handling
-   Support for other file extensions like .svg

## Fixed

-   Crash when configuration is missing
-   Crash when root folder does not exists

## [0.1.0] - 2022-05-29

### Added

-   Command handler for `vs-code-js-import-organizer.organizeFileImports`
-   Initial default configuration file for react and react-native
-   Basic import organizer class
-   Basic import sorter
