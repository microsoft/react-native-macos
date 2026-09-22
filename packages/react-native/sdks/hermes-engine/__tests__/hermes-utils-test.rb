# Copyright (c) Microsoft Corporation.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require 'test/unit'
require 'tmpdir'
require_relative '../hermes-utils.rb'

class HermesUtilsTests < Test::Unit::TestCase
    def setup
        @hermes_v1_enabled = ENV['RCT_HERMES_V1_ENABLED']
    end

    def teardown
        ENV['RCT_HERMES_V1_ENABLED'] = @hermes_v1_enabled
    end

    def hermes_log(message, level = :warning)
        # Keep the helper independent of CocoaPods UI in these tests.
    end

    data(
        'tag' => ['hermes-v250829098.0.9', :tag],
        'commit' => ['0123456789abcdef0123456789abcdef01234567', :commit],
        'uppercase commit' => ['0123456789ABCDEF0123456789ABCDEF01234567', :commit],
        'short SHA' => ['a' * 39, :tag],
        'long SHA' => ['a' * 41, :tag],
        'non-hex ref' => ['g' * 40, :tag],
        'embedded newline' => ["#{'a' * 40}\nother", :tag]
    )
    def test_source_ref_type(data)
        ref, ref_type = data
        Dir.mktmpdir('hermes-utils-test-') do |root|
            Dir.mkdir(File.join(root, 'sdks'))
            File.write(File.join(root, 'sdks', '.hermesversion'), " #{ref}\n")
            File.write(File.join(root, 'sdks', '.hermesv1version'), " #{ref}\n")

            [nil, '0', '1'].each do |flag|
                ENV['RCT_HERMES_V1_ENABLED'] = flag
                assert_equal(
                    {:git => HERMES_GITHUB_URL, ref_type => ref},
                    podspec_source_build_from_github_tag(root)
                )
            end
        end
    end

    def test_checked_in_v1_ref_uses_commit
        ENV['RCT_HERMES_V1_ENABLED'] = '1'
        root = File.expand_path('../../..', __dir__)
        ref = File.read(File.join(root, 'sdks', '.hermesv1version')).strip

        assert_match(/\A[0-9a-fA-F]{40}\z/, ref)
        assert_equal(
            {:git => HERMES_GITHUB_URL, :commit => ref},
            podspec_source_build_from_github_tag(root)
        )
    end
end
