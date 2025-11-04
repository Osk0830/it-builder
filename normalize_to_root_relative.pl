#!/usr/bin/env perl
# normalize_to_root_relative.pl
# it-builder 配下の HTML/CSS 内 URL を /it-builder/... のルート相対に統一
# - 対象: href/src/action/srcset、HTML/CSS の url(...)
# - /it-builder/(news|case|case000xxxx)/ で末尾 / は index.html を付与
# - ../ を含む相対は触らない（必要なら別版対応）

use strict;
use warnings;
use File::Find;

my $BASE = '/it-builder';   # 変更可（末尾スラなし）
my $ROOT = '.';

print "[info] Base prefix = $BASE\n";
print "[info] Working dir = ".`pwd`;

my @targets;
find(
  {
    wanted => sub {
      return unless -f $_;
      return unless $File::Find::name =~ m{^./it-builder/};
      return unless $File::Find::name =~ /\.(?:html|css)\z/i;
      push @targets, $File::Find::name;
    },
    no_chdir => 1,
  },
  $ROOT
);

my $count = 0;
for my $f (@targets) {
  local $/;
  open my $in,  '<:raw', $f or die "open read $f: $!";
  my $src = <$in>;
  close $in;

  my $orig = $src;

  if ($f =~ /\.html\z/i) {
    # A) href/src/action を /it-builder/... に
    $src =~ s{
      ((?:href|src|action)\s*=\s*")                 # 1: 属性 + ="
      (?!\/|https?:|mailto:|tel:|\#|data:|javascript:) # 絶対/外部は除外（# を \# に）
      (?!\.\.\/)                                    # ../ は触らない
      (?:\.\/)?                                     # ./ は消す
      ((?:wp-(?:includes|content)|
         assets|includes|about|case|case000[0-9]{4}|news|user|installation|
         join|price|sitemap|sitepolicy|faq|wp-json|xmlrpc\.php
       )[^"]*)
      (")
    }{$1.$BASE.'/'.$2.$3}egix;

    # B) srcset の複数 URL も同様
    $src =~ s{
      (srcset\s*=\s*")([^"]*)(")
    }{
      my ($pre,$list,$post)=($1,$2,$3);
      my @parts = split(/\s*,\s*/,$list);
      for (@parts) {
        s/^\s+|\s+$//g;
        s{
          ^(?!\/|https?:|data:|\#|mailto:|tel:|javascript:)  # \# に修正
          (?!\.\.\/)
          (?:\.\/)?
          ((?:wp-(?:includes|content)|
            assets|includes|about|case|case000[0-9]{4}|news|user|installation|
            join|price|sitemap|sitepolicy|faq|wp-json|xmlrpc\.php
          )[^\s]*)
        }{$BASE.'/'.$1}egx;
      }
      $pre.join(', ',@parts).$post;
    }egx;

    # C) インライン style の url(...)
    $src =~ s{
      (url\(\s*)
      (["\']?)
      (?!\/|https?:|data:|\#|mailto:|tel:|javascript:) # \# に修正
      (?!\.\.\/)
      (?:\.\/)?
      ((?:wp-(?:includes|content)|
        assets|includes|about|case|case000[0-9]{4}|news|user|installation|
        join|price|sitemap|sitepolicy|faq|wp-json|xmlrpc\.php
      )[^)"\']*)
      (\2\s*\))
    }{$1.$2.$BASE.'/'.$3.$4}egix;

    # D) /it-builder/(news|case)/... の末尾 / → index.html
    $src =~ s{
      ((?:href|src|action)\s*=\s*")
      (/it-builder/(?:news|case)\b[^"]*?)
      (/)( ")
    }{$1.$2.'index.html'.$4}egx;

    # E) /it-builder/case0001234/ の末尾 / → index.html
    $src =~ s{
      ((?:href|src|action)\s*=\s*")
      (/it-builder/case000[0-9]{4})
      (/)( ")
    }{$1.$2.'/index.html'.$4}egx;
  }

  if ($f =~ /\.css\z/i) {
    # CSS の url(...)
    $src =~ s{
      (url\(\s*)
      (["\']?)
      (?!\/|https?:|data:|\#)                       # \# に修正
      (?!\.\.\/)
      (?:\.\/)?
      ((?:wp-(?:includes|content)|
        assets|includes|about|case|case000[0-9]{4}|news|user|installation|
        join|price|sitemap|sitepolicy|faq|wp-json|xmlrpc\.php
      )[^)"\']*)
      (\2\s*\))
    }{$1.$2.$BASE.'/'.$3.$4}egix;
  }

  next if $src eq $orig;

  # .bak 退避
  my $bak = $f.'.bak';
  open my $out, '>:raw', $bak or die "open write $bak: $!";
  print {$out} $orig;
  close $out;

  # 上書き
  open my $w,   '>:raw', $f or die "open write $f: $!";
  print {$w} $src;
  close $w;

  $count++;
  print "Normalized: $f\n";
}

print "[done] 正規化完了。変更ファイル: $count\n";
print "       バックアップ: *.bak\n";
