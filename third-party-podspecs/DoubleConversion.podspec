# Copyright (c) Facebook, Inc. and its affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

Pod::Spec.new do |spec|
  spec.name = 'DoubleConversion'
  spec.version = '1.1.6'
  spec.license = { :type => 'MIT' }
  spec.homepage = 'https://github.com/google/double-conversion'
  spec.summary = 'Efficient binary-decimal and decimal-binary conversion routines for IEEE doubles'
  spec.authors = 'Google'
  spec.prepare_command = 'mv src double-conversion'
  spec.source = { :git => 'https://github.com/google/double-conversion.git',
                  :tag => "v#{spec.version}" }
  spec.module_name = 'DoubleConversion'
  spec.header_dir = 'double-conversion'
  spec.source_files = 'double-conversion/*.{h,cc}'
  spec.compiler_flags = '-Wno-unreachable-code'

  # Pinning to the same version as React.podspec.
<<<<<<< HEAD
  spec.platforms = { :ios => "10.0", :tvos => "10.0", :osx => "10.13" } # TODO(macOS GH#214)
=======
  spec.platforms = { :ios => "10.0" }
>>>>>>> 1aa4f47e2f119c447b4de42808653df080d95fe9

end
