#!/usr/bin/env perl
use strict;
use warnings;
use File::Find;

# ルート相対のベース（この配下に正規化）
my $BASE = '/it-builder';
my $ROOT = '.';

# 対象拡張子（クエリ付きファイル名も含めて判定）
sub is_html { $_[0] =~ /\.html(?:\?.*)?\z/i }
sub is_css  { $_[0] =~ /\.css(?:\?.*)?\z/i }

# base_dir（it-builder配下）と相対パスを結合して /it-builder/... に
sub normalize_path {
  my ($base_dir, $rel) = @_;
  return $rel if $rel =~ m{^/};                       # すでに絶対
  return $rel if $rel =~ m{^(?:https?:|data:|mailto:|tel:|javascript:)}i;

  # base_dir を it-builder 直下に正規化
  $base_dir =~ s{^\./}{};
  $base_dir =~ s{^it-builder/?}{it-builder/};

  # base_dir + rel を / 区切りで積んで正規化（. と .. を解決）
  my @stack = split m{/+}, $base_dir;
  pop @stack if @stack && $stack[-1] eq '';           # 末尾スラ掃除
  my @parts = split m{/+}, $rel;
  for my $p (@parts) {
    next if $p eq '' || $p eq '.';
    if ($p eq '..') { pop @stack if @stack } else { push @stack, $p }
  }
  # it-builder より上に出ないように
  my $joined = join('/', @stack);
  $joined =~ s{^it-builder/}{};
  $joined =~ s{//+}{/}g;
  return "$BASE/$joined";
}

# HTML: href/src/action + srcset の相対解決
sub fix_html {
  my ($path, $src) = @_;
  my $dir = $path; $dir =~ s{[^/]+$}{};
  my $orig = $src;

  # A) href/src/action で ./ または ../ から始まるものを解決
  $src =~ s{
    ( (?:href|src|action) \s* = \s* " )
    ( (?:(?:\./|\.\./)[^"#\s]*)                     # 候補（クエリ/フラグメントは別扱い）
      (?: \? [^"#]* )? )
    ( (?: \# [^"]* )? )
    ( " )
  }{
    my ($pre,$u,$frag,$post)=($1,$2,$3,$4);
    my $abs = normalize_path($dir, $u);
    $pre . $abs . $frag . $post;
  }egx;

  # B) srcset（カンマ区切り）内の相対を解決
  $src =~ s{
    ( srcset \s* = \s* " ) ( [^"]* ) ( " )
  }{
    my ($pre,$list,$post)=($1,$2,$3);
    my @parts = split(/\s*,\s*/, $list);
    for (@parts) {
      s/^\s+|\s+$//g;
      s{
        ^
        ( (?:(?:\./|\.\./)[^\s]*) (?:\?[^\s]*)? )   # URL 部分（descriptor 前）
        ( \s+ \d+(?:\.\d+)? [wx] )?                # 1x, 2x, 480w 等
      }{
        my $url = $1; my $desc = $2 // '';
        my $abs = normalize_path($dir, $url);
        $abs . $desc;
      }egx;
    }
    $pre . join(', ', @parts) . $post;
  }egx;

  return ($src ne $orig) ? $src : undef;
}

# CSS: url(./../...) の相対を解決（data:, http, / は除外）
sub fix_css {
  my ($path, $src) = @_;
  my $dir = $path; $dir =~ s{[^/]+$}{};
  my $orig = $src;

  $src =~ s{
    (url\(\s*) (["\']?)
    ( (?:(?:\./|\.\./)[^)"\']*) (?:\?[^\)"\']*)? )   # 相対 URL 本体
    (\2 \s* \) )
  }{
    my ($pre,$q,$u,$post)=($1,$2,$3,$4);
    my $abs = normalize_path($dir, $u);
    $pre . $q . $abs . $post;
  }egix;

  return ($src ne $orig) ? $src : undef;
}

print "[info] Resolving ./ and ../ to $BASE (root-relative)\n";

my $changed = 0;
find(
  {
    wanted => sub {
      return unless -f $_;
      return unless $File::Find::name =~ m{^./it-builder/};

      my $f = $File::Find::name;
      my $is_html = is_html($f);
      my $is_css  = is_css($f);
      return unless $is_html || $is_css;

      local $/;
      open my $in, '<:raw', $f or die "read $f: $!";
      my $src = <$in>;
      close $in;

      my $out;
      $out = fix_html($f, $src) if $is_html;
      $src = $out if defined $out;
      $out = fix_css($f, $src)  if $is_css;
      $src = $out if defined $out;

      return unless defined $out;

      # .bak 退避して書き戻し
      open my $bak, '>:raw', "$f.bak2" or die "write $f.bak2: $!";
      print {$bak} scalar do { open my $r,'<:raw',$f; local $/; <$r> };
      close $bak;

      open my $w, '>:raw', $f or die "write $f: $!";
      print {$w} $src;
      close $w;

      $changed++;
      print "Resolved: $f\n";
    },
    no_chdir => 1
  },
  $ROOT
);

print "[done] Resolved files: $changed\n";
print "       Backups (*.bak2) were created next to originals.\n";
