Pod::Spec.new do |spec|
  spec.name         = "libevent"
  spec.version      = "2.1.11"
  spec.summary      = "Event notification library"
  spec.description  = "The libevent API provides a mechanism to execute a callback function when a specific event occurs on a file descriptor or after a timeout has been reached. Furthermore, libevent also support callbacks due to signals or regular timeouts."
  spec.homepage     = "https://libevent.org"
  spec.license      = { :type => "BSD 3-Clause", :file => "LICENSE" }
  spec.author       = "Niels Provos and Nick Mathewson"
  spec.platforms    = { :osx => "10.14" }
  spec.source       = { :git => "https://github.com/libevent/libevent.git", :tag => "release-#{spec.version}-stable" }

  # spec.header_dir          = "event"
  spec.source_files        = "destroot/include/**/*.h"
  spec.header_mappings_dir = "destroot/include"
  spec.vendored_library    = "destroot/lib/libevent.a"

  spec.prepare_command = <<-EOS
    ./autogen.sh
    ./configure --disable-shared --disable-openssl --disable-samples --disable-libevent-regress --prefix "${PWD}/destroot"
    make install
  EOS
end
