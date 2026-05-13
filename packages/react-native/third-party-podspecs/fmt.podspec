# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

fmt_config = get_fmt_config()
fmt_git_url = fmt_config[:git]

Pod::Spec.new do |spec|
  spec.name = "fmt"
  spec.version = "11.0.2"
  spec.license = { :type => "MIT" }
  spec.homepage = "https://github.com/fmtlib/fmt"
  spec.summary = "{fmt} is an open-source formatting library for C++. It can be used as a safe and fast alternative to (s)printf and iostreams."
  spec.authors = "The fmt contributors"
  spec.source = {
    :git => fmt_git_url,
    :tag => "11.0.2"
  }
  spec.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => rct_cxx_language_standard(),
    "GCC_WARN_INHIBIT_ALL_WARNINGS" => "YES", # Disable warnings because we don't control this library
    # [macOS] Xcode 26.x ships a stricter consteval evaluator than
    # fmt 11.0.2's `FMT_STRING` macro expects, breaking the compile
    # of `Pods/fmt/src/format.cc` with "call to consteval function is
    # not a constant expression" at `format-inl.h:59, 60, 1387, 1391,
    # 1394, ...`. fmt's own internal logic already gates consteval off
    # for compilers it considers broken (see `base.h:113-132` —
    # Apple clang <14, MSVC VS2019 <16.10, etc.); Xcode 26.x exposes a
    # new failure mode that hasn't been added to that list yet, so we
    # opt out of consteval here. The constexpr fallback fmt provides
    # is fully functional — only the compile-time format-string check
    # is sacrificed. Long-term fix is to bump fmt to 11.1+, where the
    # underlying issue is addressed upstream; until then this is the
    # minimal, reversible workaround.
    "GCC_PREPROCESSOR_DEFINITIONS" => "$(inherited) FMT_USE_CONSTEVAL=0"
  }
  spec.platforms = min_supported_versions
  spec.libraries = "c++"
  spec.public_header_files = "include/fmt/*.h"
  spec.header_mappings_dir = "include"
  spec.source_files = ["include/fmt/*.h", "src/format.cc"]
end
