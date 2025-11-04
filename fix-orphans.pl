#!/usr/bin/env perl
use strict;
use warnings;
use utf8;
use open IO => ':utf8', ':std';

# -------- 設定 --------
my $BASE = '/it-builder';
my $LOG  = 'fix-orphans.log';
my $DRY  = grep { $_ eq '--dry-run' } @ARGV;

# ラベル→パスの対応（必要に応じて追加OK、先にマッチした方を採用）
my @MAP = (
  [qr/資料ダウンロード/u,                "$BASE/user/download/"],
  [qr/ご利用中のお客さまへ/u,            "$BASE/user/"],
  [qr/ご検討中のお客さまへ/u,            "$BASE/about/"],
  [qr/料金案内/u,                        "$BASE/price/"],
  [qr/導入実績/u,                        "$BASE/case/"],
  [qr/活用例/u,                          "$BASE/case/"],
  [qr/サイトマップ/u,                    "$BASE/sitemap/"],
  [qr/サイトポリシー/u,                  "$BASE/sitepolicy/"],
  [qr/イットbuilderとは/u,               "$BASE/about/"],
  [qr/イットbuilderが選ばれる理由/u,     "$BASE/about/reason/"],
  [qr/イットbuilderアプリ3つの作り方/u,  "$BASE/about/how_to_make/"],
  [qr/高度なアプリ作成にもイットbuilder/u,"$BASE/about/advanced_case/"],
  [qr/稼働環境/u,                        "$BASE/about/requirements/"],
  [qr/ご提供するアプリ部品/u,            "$BASE/about/parts/"],
  [qr/サポートするデータの種類/u,        "$BASE/about/data/"],
  [qr/詳しく見る/u,                      "$BASE/installation/"],   # インストール文脈の「詳しく見る」
  # ここに追加していけばカバー拡大可能
);

# 置換対象ファイルを収集
my @files = `grep -RIl --include='*.html' '/_orphans/' it-builder`;
chomp @files;

open my $L, '>:utf8', $LOG or die "Cannot open $LOG: $!";

my @unresolved;
my $changed = 0;

FILE:
for my $f (@files) {
  local $/ = undef;
  open my $in,  '<:utf8', $f or die "$f: $!";
  my $src = <$in>;
  close $in;

  my $orig = $src;
  my $local_changes = 0;

  # --- <a ... href="/_orphans/"> ... </a> をテキストで判断して置換 ---
  # 近傍のテキスト(同じタグ内 or 直下のラベル)を拾ってマップに当てる
  while ($src =~ m{(<a\s[^>]*?\bhref="/_orphans/"[^>]*>)(.*?)(</a>)}gsi) {
    my ($a_open, $inner, $a_close) = ($1, $2, $3);

    # inner の文字だけ拾って判定
    (my $plain = $inner) =~ s/<[^>]+>//g;         # タグ除去（ざっくり）
    $plain =~ s/\s+/ /g; $plain =~ s/^\s+|\s+$//g;

    my $target;
    for my $rule (@MAP) {
      my ($re, $url) = @$rule;
      if ($plain =~ $re) { $target = $url; last; }
    }

    if ($target) {
      my $before = $a_open.$inner.$a_close;
      my $after  = $a_open; $after =~ s{href="/_orphans/"}{href="$target"};
      $after    .= $inner.$a_close;

      $src =~ s/\Q$before\E/$after/;
      print $L "[a] $f  => $target  (text: $plain)\n";
      $local_changes++;
    } else {
      push @unresolved, "$f: <a>…$plain…</a>";
    }
  }

  # --- <link rel="canonical" href="/_orphans/"> は一旦削除 or コメントアウト ---
  #   → とりあえず “コメントアウト” に留める（手動で適正URLを入れ直す想定）
  if ($src =~ s{(<link[^>]+rel="canonical"[^>]+href="/_orphans/"[^>]*>)}{<!-- FIXME: canonical removed: $1 -->}gsi) {
    print $L "[canonical] $f  => commented out\n";
    $local_changes++;
  }

  # --- <form action="/_orphans/"> は “about/” か “case/” など文脈で分岐が要るので unresolved へ ---
  while ($src =~ m{(<form\s[^>]*\baction="/_orphans/"[^>]*>)}gsi) {
    push @unresolved, "$f: <form action=\"/_orphans/\"> (manual)";
  }

  if ($local_changes) {
    unless ($DRY) {
      rename $f, "$f.bak" or die "backup failed: $f.bak: $!";
      open my $out, '>:utf8', $f or die "write $f: $!";
      print {$out} $src;
      close $out;
    }
    $changed++;
  }
}

print $L "\n-- unresolved --\n";
print $L "$_\n" for @unresolved;
close $L;

print "[done] files changed: $changed\n";
print "[log ] $LOG\n";
print "[note] unresolved: ", scalar(@unresolved), " (see $LOG)\n";
