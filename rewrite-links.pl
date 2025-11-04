#!/usr/bin/env perl
use strict;
use warnings;
use File::Find;

# ここでルートプレフィックスを指定（末尾スラッシュなし）
my $BASE = "/it-builder";

# ==== 1) auto_map.tsv を読む（ID => ディレクトリパス） ====
# 例:
#   1171    /news/news0001171/
#   1241    /case0001241/
my %map;
open my $M, '<', 'auto_map.tsv' or die "auto_map.tsv not found";
while (<$M>) {
  chomp;
  next unless /\S/;
  s/#.*$//;           # コメント除去
  next unless /\S/;
  my ($id,$path) = split(/\t/, $_, 2);
  $path ||= '';
  $path =~ s/\s+$//;
  # 先頭に "/" がなければ付与、末尾は "/" で終わらせる（ディレクトリ想定）
  $path = "/$path" unless $path =~ m{^/};
  $path .= "/" unless $path =~ m{/$};
  $map{$id} = $path;  # 例: "/news/news0001171/"
}
close $M;

# ==== 2) it-builder 配下の HTML を走査 ====
my @files;
find(sub {
  return unless -f $_;
  return unless $_ =~ /\.html?$/i;
  push @files, $File::Find::name;
}, 'it-builder');

for my $f (@files) {
  local $/ = undef;
  open my $IN,  '<', $f or die "read $f: $!";
  my $src = <$IN>;
  close $IN;

  my $orig = $src;

  # -----------------------------------------
  # A) index.html?p=1234 → /it-builder/<mapped>/index.html
  # -----------------------------------------
  $src =~ s{
    (href|src|action)\s*=\s*"
    ([^"]*?index\.html)
    \?p=([0-9]+)
    ([^"]*)"
  }{
    my ($attr,$base,$id,$tail) = ($1,$2,$3,$4);
    my $dir = $map{$id} || "/_orphans/";          # ディレクトリ orphans は後で調整してOK
    my $to  = $dir eq "/_orphans/"
             ? "$BASE/_orphans/p-$id.html"        # 孤児はファイル直指定
             : "$BASE$dir" . "index.html";        # それ以外は index.html 明示
    qq{$attr="$to"}
  }egix;

  # -----------------------------------------
  # B) index.html%3Fp=1234（URLエンコード版）も同様に
  # -----------------------------------------
  $src =~ s{
    (href|src|action)\s*=\s*"
    ([^"]*?index\.html)
    %3[fF]p=([0-9]+)
    ([^"]*)"
  }{
    my ($attr,$base,$id,$tail) = ($1,$2,$3,$4);
    my $dir = $map{$id} || "/_orphans/";
    my $to  = $dir eq "/_orphans/"
             ? "$BASE/_orphans/p-$id.html"
             : "$BASE$dir" . "index.html";
    qq{$attr="$to"}
  }egix;

  # -----------------------------------------
  # C) 年別: 2016/index.html?post_type=news → /it-builder/news/2016/index.html
  #    （既存の /news/2016/ に置換済みでも最終的に index.html を明示）
  # -----------------------------------------
  $src =~ s{
    (href|src|action)\s*=\s*"
    (?:\./)?(2016|2017|2018|2019|2020|2022|2023|2024)/index\.html
    (?:\?post_type=news[^"]*)?"
  }{$1 . '="' . $BASE . '/news/' . $2 . '/index.html"'}egix;

  # -----------------------------------------
  # D) 既に「/news/.../」や「/case/.../」「/case0001241/」など
  #    ディレクトリ終端やスラッシュ終端のリンクを
  #    「/it-builder/.../index.html」に正規化
  #    - 先頭が /it-builder 付きの場合も index.html 明示
  # -----------------------------------------
  # D1) /news/.../ or /case/.../ or /case000\d+/
  $src =~ s{
    (href|src|action)\s*=\s*"
    (/(?:news|case)\b[^"]*?)
    /?"
  }{
    my ($attr,$path) = ($1,$2);
    # 先頭が /it-builder ですでに付いているなら二重で付けないように
    $path =~ s{^/it-builder}{};
    qq{$attr="$BASE$path/index.html"}
  }egix;

  # D2) /case0001241/ のような直下ケース（/case000\d+/）
  $src =~ s{
    (href|src|action)\s*=\s*"
    (/case000[0-9]{4})
    /?"
  }{
    my ($attr,$path) = ($1,$2);
    $path =~ s{^/it-builder}{};
    qq{$attr="$BASE$path/index.html"}
  }egix;

  # D3) すでに /it-builder/(news|case|case000...)/ で末尾が / のとき index.html を付与
  $src =~ s{
    (href|src|action)\s*=\s*"
    (/it-builder/(?:news|case)\b[^"]*?)
    /"
  }{$1 . '/index.html"'}egix;
  $src =~ s{
    (href|src|action)\s*=\s*"
    (/it-builder/case000[0-9]{4})
    /"
  }{$1 . '/index.html"'}egix;

  # -----------------------------------------
  # E) 念のため、/it-builder なしで /_orphans/ を指している場合 → /it-builder/_orphans/p-*.html に寄せる
  # -----------------------------------------
  $src =~ s{
    (href|src|action)\s*=\s*"/_orphans/p-([0-9]+)\.html"
  }{$1 . '="' . $BASE . '/_orphans/p-' . $2 . '.html"'}egix;

  # -----------------------------------------
  # 書き込み
  # -----------------------------------------
  if ($src ne $orig) {
    open my $OUT, '>', $f or die "write $f: $!";
    print $OUT $src;
    close $OUT;
    print "Rewrote $f\n";
  }
}
