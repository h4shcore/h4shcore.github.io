+++
title = "Writing posts in Org mode"
date = 2026-10-23
description = "Org files in content/ are converted to Zola posts automatically."

[taxonomies]
tags = ["tutorial", "org"]
+++

<!-- generated-from-org: org-mode-posts.org (edit the .org file, not this one) -->

## How it works

Any `.org` file inside `content/` is converted to Markdown by `pandoc` (through the `org2zola` script) before Zola builds the site. The generated `.md` file sits next to it. Edit the `.org` file, never the generated one.

## Header keys

| Key              | Becomes                        |
|------------------|--------------------------------|
| `#+TITLE:`       | post title                     |
| `#+DATE:`        | post date                      |
| `#+DESCRIPTION:` | description                    |
| `#+FILETAGS:`    | tags, like `:nix:linux:`       |
| `#+DRAFT:`       | set to `true` to hide the post |

## Formatting

You get **bold**, *italic*, `inline code`, and [links](https://www.getzola.org).

### Lists

1.  Numbered lists
2.  keep their order
    - and can nest

### Code blocks

``` nix
{ pkgs, ... }: {
  environment.systemPackages = [ pkgs.zola pkgs.pandoc ];
}
```

``` python
def greet(name):
    return f"hello, {name}!"
```

### Quotes

> Org mode is a way of life.

## Images

Put the image next to the post and link it:

``` example
[[file:photo.png]]
```

Org links to files become normal Markdown images. For a post with images, use a folder: `content/blog/my-post/index.org` plus the image files.
