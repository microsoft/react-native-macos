{
  description = "Pinned macOS CI toolchain via Nix devshell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";

  outputs = { self, nixpkgs }: let
    system = "aarch64-darwin";
    pkgs = import nixpkgs { inherit system; };
    ruby = pkgs.ruby_3_3;
    rubyWithGems = ruby.withPackages (ps: [
      ps.bundler
      ps.cocoapods
    ]);
    cmake_3_26 = pkgs.cmake.overrideAttrs (old: {
      version = "3.26.4";
      src = pkgs.fetchurl {
        url = "https://github.com/Kitware/CMake/releases/download/v3.26.4/cmake-3.26.4.tar.gz";
        sha256 = "sha256-MTtogMKRvU/jHAqlHW5iZZKCpSHmlfMNXMDSWrvVwgg=";
      };
    });
  in {
    devShells.${system}.ci-macos = pkgs.mkShell {
      packages = with pkgs; [
        cmake_3_26
        nodejs_22
        yarn
        pkg-config
        ninja
        ccache
        xcbeautify
        git
        python3
        rubyWithGems
      ];

      shellHook = ''
        export SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
        export MACOSX_DEPLOYMENT_TARGET=14.0
      '';
    };
  };
}
