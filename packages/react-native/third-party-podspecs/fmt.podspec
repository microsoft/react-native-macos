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
  # Patch fmt's existing "Apple clang < 14 broken" gate at
  # `include/fmt/base.h:122` to catch ALL Apple clang versions. fmt 11.0.2's
  # consteval `basic_format_string` constructor is rejected by Xcode 26.x's
  # stricter constexpr evaluator, breaking the compile of `Pods/fmt/src/format.cc`
  # at `format-inl.h:59`, `60`, `1387`, `1391`, `1394`, etc. with:
  #
  #   error: call to consteval function 'fmt::basic_format_string<...>'
  #          is not a constant expression
  #
  # fmt already disables consteval for compilers it considers broken
  # (Apple clang < 14, MSVC VS2019 < 16.10 etc. — see `base.h:113-132`) by
  # forcing the `FMT_USE_CONSTEVAL=0` branch of its config chain. Widening
  # the existing Apple-clang branch to drop the `< 14000029L` upper bound
  # adds Xcode 26.x to that broken-list and falls back to fmt's constexpr
  # path, which compiles cleanly. Notes:
  #
  # - An xcconfig `GCC_PREPROCESSOR_DEFINITIONS = FMT_USE_CONSTEVAL=0`
  #   alone does NOT work: fmt's chain in `base.h:113-132` has no
  #   `#ifndef FMT_USE_CONSTEVAL` guard and unconditionally redefines the
  #   macro to `1` on any compiler that sets `__cpp_consteval`. Patching
  #   the source is the only path that survives the preprocessor.
  # - Long-term fix is a fmt 11.1+ bump (fmt's own upstream addressed the
  #   stricter-eval interaction there). This `sed` is the minimal,
  #   reversible workaround until that lands.
  spec.prepare_command = <<-CMD
    /usr/bin/sed -i.bak 's|defined(__apple_build_version__) && __apple_build_version__ < 14000029L|defined(__apple_build_version__)|' include/fmt/base.h
  CMD
  spec.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => rct_cxx_language_standard(),
    "GCC_WARN_INHIBIT_ALL_WARNINGS" => "YES" # Disable warnings because we don't control this library
  }
  spec.platforms = min_supported_versions
  spec.libraries = "c++"
  spec.public_header_files = "include/fmt/*.h"
  spec.header_mappings_dir = "include"
  spec.source_files = ["include/fmt/*.h", "src/format.cc"]
end
