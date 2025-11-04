#!/usr/bin/env perl
use strict;
use warnings;
use File::Find ();
use File::Path qw(make_path);
use Getopt::Long qw(GetOptions);
use File::Basename ();

# ===== 設定 =====
my $BASE  = 'it-builder';   # 作業ルート
my $APPLY = 0;              # --apply で書き込み
GetOptions('apply' => \$APPLY) or die "Usage: $0 [--apply]\n";

my $LOGDIR = "$BASE/_cleanup_logs";
make_path($LOGDIR) unless -d $LOGDIR;

my $TS  = _ts();
my $LOG = "$LOGDIR/rewrite_encoded_refs-$TS.log";
open my $LOGF, '>', $LOG or die "open log: $!";

_sub_log("[info] base=$BASE, apply=$APPLY");

# 対象拡張子
my @TARGET_EXT = ('.html', '.htm', '.css', '.js');

# 走査
my @files;
File::Find::find({
  wanted => sub {
    return unless -f $_;
    my ($name, $dir, $ext) = File::Basename::fileparse($_, @TARGET_EXT);
    return unless $ext;
    push @files, $File::Find::name;
  },
  no_chdir => 1,
}, $BASE);

my $changed = 0;

for my $f (@files) {
  local $/ = undef;
  open my $IN, '<', $f or next;
  my $orig = <$IN>;
  close $IN;

  my $updated = $orig;
  my $matches = 0;

  # 置換1: href/src/action="...%3F...html" → "... .html"
  $matches += ($updated =~ s{
    (?<attr>\b(?:href|src|action)\s*=\s*")   # 属性 + 開きクオート
    (?<path>[^"]*?)                           # パス本体
    %3[Ff][^"]*?\.html                        # %3F...html の断片
    (?<q>")
  }{
    my $p = $+{path};
    $p =~ s/%25/%/gi;                         # 二重エンコード軽減
    $p =~ s/%3[Ff].*\.html$/.html/;           # ? 以降～.html を .html に
    "$+{attr}$p$+{q}";
  }egx);

  # 置換2: 生の ? ... html を落とす
  $matches += ($updated =~ s{
    (?<attr>\b(?:href|src|action)\s*=\s*")
    (?<path>[^"]*?)
    \?.*?\.html
    (?<q>")
  }{
    my $p = $+{path};
    $p =~ s/\?.*\.html$/.html/;
    "$+{attr}$p$+{q}";
  }egx);

  # 置換3/4: link[rel=canonical]などにも広く適用（href に限定）
  $matches += ($updated =~ s{
    (?<attr>\bhref\s*=\s*")
    (?<path>[^"]*?)
    %3[Ff][^"]*?\.html
    (?<q>")
  }{
    my $p = $+{path};
    $p =~ s/%3[Ff].*\.html$/.html/;
    "$+{attr}$p$+{q}";
  }egx);

  $matches += ($updated =~ s{
    (?<attr>\bhref\s*=\s*")
    (?<path>[^"]*?)
    \?.*?\.html
    (?<q>")
  }{
    my $p = $+{path};
    $p =~ s/\?.*\.html$/.html/;
    "$+{attr}$p$+{q}";
  }egx);

  if ($matches > 0) {
    $changed++;
    if ($APPLY) {
      open my $OUT, '>', $f or die "write $f: $!";
      print {$OUT} $updated;
      close $OUT;
      _sub_log("[rewrite] $f (matches=$matches)");
    } else {
      _sub_log("[dry-run] would rewrite: $f (matches=$matches)");
    }
  }
}

_sub_log("[done] files_scanned=" . scalar(@files) . ", files_changed=$changed");
_sub_log("[log] $LOG");
close $LOGF;

# ===== ヘルパ =====
sub _sub_log {
  my ($msg) = @_;
  print {$LOGF} $msg, "\n";
}

sub _ts {
  my @t = localtime();
  return sprintf("%04d%02d%02d-%02d%02d%02d",
    $t[5]+1900, $t[4]+1, $t[3], $t[2], $t[1], $t[0]);
}
