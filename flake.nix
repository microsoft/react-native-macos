{
  description = "Pinned macOS CI toolchain via Nix devshell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";

  outputs = { self, nixpkgs }: let
    system = "aarch64-darwin";
    pkgs = import nixpkgs { inherit system; };
    ruby = pkgs.ruby_3_3;
    rubyPackages = pkgs.ruby_3_3Packages;
  in {
    devShells.${system}.ci-macos = pkgs.mkShell {
      packages = with pkgs; [
        cmake
        nodejs_22
        yarn
        pkg-config
        ninja
        ccache
        xcbeautify
        git
        python3
        ruby
        rubyPackages.bundler
        rubyPackages.cocoapods
      ];

      shellHook = ''
        export SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt
        export MACOSX_DEPLOYMENT_TARGET=14.0
      '';
    };
  };
}
