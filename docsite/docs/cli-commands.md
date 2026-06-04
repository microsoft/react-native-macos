---
sidebar_position: 3
title: CLI Commands
---

# CLI Commands

React Native for macOS provides several command-line tools to help you develop, build, and run your macOS applications.

## Overview

The React Native CLI for macOS extends the standard React Native CLI with macOS-specific commands. These commands help you build and run your React Native applications on macOS.

## Available Commands

### `run-macos`

Builds your React Native macOS app and launches it on your local machine.

```bash
npx react-native run-macos [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--mode [string]` | Set the build configuration (Debug, Release) | Debug |
| `--scheme [string]` | Explicitly set the Xcode scheme to use | `{ProjectName}-macOS` |
| `--project-path [string]` | Path relative to project root where the Xcode project lives | `macos` |
| `--no-packager` | Do not launch Metro bundler while building | `false` |
| `--port [number]` | Port for the Metro bundler | `8081` |
| `--terminal [string]` | Terminal to use for launching Metro bundler | System default |
| `--verbose` | Show detailed build output (disable xcpretty) | `false` |

### `build-macos`

Builds your React Native macOS app without launching it.

```bash
npx react-native build-macos [options]
```

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--mode [string]` | Set the build configuration (Debug, Release) | Debug |
| `--scheme [string]` | Explicitly set the Xcode scheme to use | `{ProjectName}-macOS` |
| `--project-path [string]` | Path relative to project root where the Xcode project lives | `macos` |
| `--verbose` | Show detailed build output (disable xcpretty) | `false` |
