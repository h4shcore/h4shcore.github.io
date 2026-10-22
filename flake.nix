{
  description = "Personal portfolio & blog (Zola, Org-mode, GitHub pinned repos)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAll = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      # converts content/**/*.org into Zola markdown (see scripts/org2zola.sh)
      org2zola =
        pkgs:
        pkgs.writeShellApplication {
          name = "org2zola";
          runtimeInputs = [
            pkgs.pandoc
            pkgs.gnugrep
            pkgs.gnused
            pkgs.coreutils
            pkgs.findutils
          ];
          text = builtins.readFile ./scripts/org2zola.sh;
        };

      # fetches your GitHub pinned repos into data/pinned.json (see scripts/pinned.py)
      pinned =
        pkgs:
        pkgs.writeShellApplication {
          name = "pinned";
          runtimeInputs = [ pkgs.python3 ];
          text = ''python3 ${./scripts/pinned.py} "$@"'';
        };
    in
    {
      packages = forAll (pkgs: {
        org2zola = org2zola pkgs;
        pinned = pinned pkgs;

        # nix build  -> ./result is the static site
        # (uses the committed data/pinned.json; the Nix sandbox has no network)
        default = pkgs.stdenv.mkDerivation {
          pname = "portfolio";
          version = "0.1.0";
          src = ./.;
          nativeBuildInputs = [
            pkgs.zola
            pkgs.cacert
            (org2zola pkgs)
          ];
          SSL_CERT_FILE = "${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt";
          buildPhase = ''
            runHook preBuild
            org2zola content
            zola build --output-dir "$out"
            runHook postBuild
          '';
          dontInstall = true;
        };
      });

      apps = forAll (
        pkgs:
        let
          o2z = org2zola pkgs;
          serve = pkgs.writeShellApplication {
            name = "serve";
            runtimeInputs = [
              pkgs.zola
              pkgs.coreutils
              o2z
            ];
            text = ''
              org2zola content || true
              # re-convert changed .org files while the server runs
              ( while true; do sleep 1; org2zola content 2>/dev/null || true; done ) &
              watcher=$!
              trap 'kill "$watcher" 2>/dev/null || true' EXIT
              zola serve "$@"
            '';
          };
        in
        {
          # nix run  -> live-reload dev server on http://127.0.0.1:1111
          default = {
            type = "app";
            program = nixpkgs.lib.getExe serve;
          };
          # nix run .#org2zola  -> just convert the .org files
          org2zola = {
            type = "app";
            program = nixpkgs.lib.getExe o2z;
          };
          # nix run .#pinned  -> refresh data/pinned.json from GitHub
          pinned = {
            type = "app";
            program = nixpkgs.lib.getExe (pinned pkgs);
          };
        }
      );

      # nix develop
      devShells = forAll (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.zola
            pkgs.pandoc
            pkgs.python3
            pkgs.nil
            (org2zola pkgs)
            (pinned pkgs)
          ];
        };
      });
    };
}
