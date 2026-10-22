+++
title = "Hello, world"
date = 2026-10-22
description = "First post on the new site."

[taxonomies]
tags = ["meta"]
+++

Welcome! This site is built with [Zola](https://www.getzola.org) and packaged with a Nix flake.

```nix
{ pkgs, ... }: { environment.systemPackages = [ pkgs.zola ]; }
```
