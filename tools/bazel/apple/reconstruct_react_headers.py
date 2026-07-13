#!/usr/bin/env python3
"""Reconstruct a canonical header tree from the SPM-prebuilt React.xcframework.

The React.xcframework produced by `scripts/ios-prebuild.js` flattens every SPM
target's public headers into `Headers/<Module>/<basename>.h` (e.g.
`Headers/React_Core/RCTBridge.h`, `Headers/React_graphics/Color.h`). But both the
framework's own headers *and* app sources import them by their canonical paths:

    #import  <React/RCTBridge.h>                       // -> React_Core/RCTBridge.h
    #import  <React/RCTUIKit.h>                         // -> React_RCTUIKit/RCTUIKit.h
    #include <react/renderer/graphics/ColorComponents.h>// -> React_graphics/ColorComponents.h
    #include <jsi/jsi.h>                                // -> React_jsi/jsi.h
    #import  <RCTReactNativeFactory.h>                  // -> React_RCTAppDelegate/RCTReactNativeFactory.h

None of those resolve against the flattened layout, so the framework is not
directly consumable by clang/Bazel. This script rebuilds a canonical `-I` tree of
symlinks so the imports resolve. It is deliberately generic: it discovers the
canonical include paths by scanning the framework's own headers for
`#include/#import <...>` directives and maps each to a physical file by basename,
disambiguating collisions with a path-segment heuristic.

Usage: reconstruct_react_headers.py <framework_headers_dir> <out_dir>
"""

import os
import re
import sys

# Modules whose headers are imported with the flat `<React/...>` (Obj-C) prefix.
# On basename collisions we prefer React_Core, then these, in order.
OBJC_REACT_MODULES = [
    "React_Core",
    "React_RCTUIKit",
    "React_CoreModules",
    "React_RCTAppDelegate",
    "React_RCTImage",
    "React_RCTText",
    "React_RCTBlob",
    "React_RCTVibration",
    "React_RCTSettings",
    "React_RCTFabric",
    "React_NativeModulesApple",
    "RCTDeprecation",
]

# Modules whose (single) header is imported flat, e.g. `<RCTReactNativeFactory.h>`.
FLAT_ROOT_MODULES = ["React_RCTAppDelegate"]

# Header families that live in React_Core but are consumed via a `<Name/Name*.h>`
# umbrella prefix (the core codegen spec). The framework references some of these
# (so they get reconstructed by the scan) but not the umbrella header itself, which
# is only pulled in by app/library sources — so map the whole family explicitly.
SELF_NAMED_MODULES = ["FBReactNativeSpec"]

INCLUDE_RE = re.compile(r'#\s*(?:import|include)\s*<([^>]+)>')
SKIP_DIRS = frozenset([".build", "build", "node_modules", "Pods", "third-party"])
SOURCE_EXTENSIONS = (".c", ".cc", ".cpp", ".h", ".hh", ".hpp", ".m", ".mm")

# Canonical namespaces supplied from the RN *source* tree (complete, correctly
# nested, siblings co-located) rather than the framework's flattened copy. Any
# `<prefix/...>` include with one of these first segments is skipped during
# reconstruction. Everything else (React/, RCTDeprecation/, RCTTypeSafety/, ...)
# is Obj-C and reconstructed from the framework.
SOURCE_PREFIXES = frozenset([
    "react",
    "ReactCommon",
    "jsi",
    "jsireact",
    "yoga",
    "cxxreact",
    "folly",
    "boost",
    "glog",
    "fmt",
    "double-conversion",
    "fast_float",
    "jsinspector-modern",
    "logger",
    "reactperflogger",
    "hermes",
    "reacthermes",
    "jserrorhandler",
    "jsitooling",
    "callinvoker",
    "runtimeexecutor",
    "oscompat",
])


def main():
    headers_dir = os.path.realpath(sys.argv[1])
    out_dir = os.path.realpath(sys.argv[2])
    include_source_prefixes = "--include-source-prefixes" in sys.argv[3:]

    # 1. Index every physical header: basename -> [(module, abspath)].
    by_basename = {}
    all_headers = []
    include_sources = []
    for module in sorted(os.listdir(headers_dir)):
        if module in SKIP_DIRS:
            continue
        mdir = os.path.join(headers_dir, module)
        if not os.path.isdir(mdir):
            continue
        for root, dirs, files in os.walk(mdir):
            dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
            for f in files:
                p = os.path.join(root, f)
                if f.endswith(SOURCE_EXTENSIONS):
                    include_sources.append(p)
                if not f.endswith((".h", ".hpp", ".hh")):
                    continue
                all_headers.append((module, p))
                by_basename.setdefault(f, []).append((module, p))

    # 2. Collect every canonical include path referenced anywhere.
    referenced = set()
    for p in include_sources:
        try:
            with open(p, "r", errors="ignore") as fh:
                for m in INCLUDE_RE.finditer(fh.read()):
                    referenced.add(m.group(1))
        except OSError:
            pass

    links = {}  # canonical-relpath -> physical abspath (first writer wins)

    def want(rel, phys):
        links.setdefault(rel, phys)

    def rank_objc(module):
        return OBJC_REACT_MODULES.index(module) if module in OBJC_REACT_MODULES else 999

    def pick(candidates, hint_segments, canonical_rel):
        """Choose the best physical file for a canonical path."""
        if len(candidates) == 1:
            return candidates[0][1]
        # Prefer a module whose name matches a hint path segment.
        best, best_score = candidates[0][1], float("-inf")
        canonical_parts = canonical_rel.replace("\\", "/").split("/")
        for module, phys in candidates:
            mtokens = module.lower().replace("react_", "").split("_")
            physical_parts = phys.replace("\\", "/").split("/")
            suffix_matches = 0
            for expected, actual in zip(
                reversed(canonical_parts),
                reversed(physical_parts),
            ):
                if expected.lower() != actual.lower():
                    break
                suffix_matches += 1
            score = suffix_matches * 1000
            score += sum(
                1
                for seg in hint_segments
                if seg.lower() in mtokens or seg.lower() == module.lower()
            )
            # Tie-break toward canonical Obj-C ordering (React_Core first).
            score = score * 100 - rank_objc(module)
            if score > best_score:
                best, best_score = phys, score
        return best

    # 3. Map referenced canonical `<React/...>` (Obj-C) paths to physical files.
    #    C++ / ReactCommon / jsi / yoga headers are intentionally NOT reconstructed
    #    here: the framework only ships a partial, flattened copy of them (which also
    #    breaks their quoted sibling includes). Those are supplied from the RN source
    #    tree instead (see //packages/react-native:rn_cxx_headers), which keeps the
    #    canonical layout and co-locates siblings.
    for rel in referenced:
        if "/" not in rel:
            continue
        if not include_source_prefixes and rel.split("/")[0] in SOURCE_PREFIXES:
            continue
        base = os.path.basename(rel)
        cands = by_basename.get(base)
        if not cands:
            continue
        segs = rel.split("/")[:-1]
        want(rel, pick(cands, segs, rel))

    # 4. Flat `<React/...>` tree: every Obj-C React module header by basename.
    for module, phys in all_headers:
        if module not in OBJC_REACT_MODULES:
            continue
        base = os.path.basename(phys)
        rel = "React/" + base
        existing = links.get(rel)
        if existing is None:
            links[rel] = phys
        else:
            # Prefer the higher-priority Obj-C module on collision.
            cur_module = _module_of(existing, headers_dir)
            if rank_objc(module) < rank_objc(cur_module):
                links[rel] = phys

    # 5. Flat-root single-header modules, e.g. `<RCTReactNativeFactory.h>`.
    for module, phys in all_headers:
        if module in FLAT_ROOT_MODULES:
            want(os.path.basename(phys), phys)

    # Source-tree mode: AppDelegate headers are imported without a namespace
    # (`<RCTReactNativeFactory.h>`). The prebuilt layout has a module directory
    # for these; the source layout keeps them under Libraries/AppDelegate.
    if include_source_prefixes:
        for _module, phys in all_headers:
            normalized = phys.replace(os.sep, "/")
            if "/Libraries/AppDelegate/" in normalized:
                want(os.path.basename(phys), phys)
        # Source implementations frequently use bare quoted imports such as
        # "RCTAssert.h". Put Obj-C public headers in the same canonical React/
        # directory and expose that directory as an include root. Existing
        # mappings discovered from explicit <React/...> imports win.
        for module, phys in all_headers:
            if module in ("Libraries", "React", "ReactApple"):
                want("React/" + os.path.basename(phys), phys)
        source_namespaces = {
            "/Libraries/FBLazyVector/": "FBLazyVector",
            "/Libraries/Required/": "RCTRequired",
            "/Libraries/TypeSafety/": "RCTTypeSafety",
            "/ReactApple/Libraries/RCTFoundation/RCTDeprecation/Exported/": "RCTDeprecation",
        }
        for _module, phys in all_headers:
            normalized = phys.replace(os.sep, "/")
            for source_fragment, namespace in source_namespaces.items():
                if source_fragment in normalized:
                    want(namespace + "/" + os.path.basename(phys), phys)
        # Preserve quoted sibling includes after a physical header is projected
        # into a canonical directory. For example, a projected
        # react/performance/timeline/PerformanceEntryReporter.h includes
        # "PerformanceEntryCircularBuffer.h".
        for rel, phys in list(links.items()):
            canonical_dir = os.path.dirname(rel)
            physical_dir = os.path.dirname(phys)
            for sibling in os.listdir(physical_dir):
                if sibling.endswith((".h", ".hh", ".hpp")):
                    want(
                        os.path.join(canonical_dir, sibling),
                        os.path.join(physical_dir, sibling),
                    )

    # 5c. Self-named umbrella families (e.g. `<FBReactNativeSpec/FBReactNativeSpec.h>`).
    for module, phys in all_headers:
        base = os.path.basename(phys)
        for name in SELF_NAMED_MODULES:
            if base.startswith(name):
                want(name + "/" + base, phys)

    # 6. Materialize the symlink tree (relative links so the tree stays valid
    #    when relocated, e.g. inside a Bazel external repo).
    count = 0
    for rel, phys in links.items():
        dst = os.path.join(out_dir, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.lexists(dst):
            os.remove(dst)
        os.symlink(os.path.relpath(phys, os.path.dirname(os.path.abspath(dst))), dst)
        count += 1

    sys.stderr.write(
        "reconstruct_react_headers: %d physical headers, %d referenced paths, "
        "%d symlinks\n" % (len(all_headers), len(referenced), count)
    )


def _module_of(phys, headers_dir):
    rel = os.path.relpath(phys, headers_dir)
    return rel.split(os.sep)[0]


if __name__ == "__main__":
    main()
