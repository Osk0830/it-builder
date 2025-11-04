#!/usr/bin/env perl
use strict; use warnings; use File::Find; use File::Path qw(make_path);
use File::Copy qw(move); use Digest::MD5 qw(md5_hex);
use Getopt::Long qw(GetOptions);
use File::Basename;

my $BASE = 'it-builder';
my $APPLY = 0;
my $LOGDIR = "$BASE/_cleanup_logs";
my $CONFDIR = "$BASE/_conflicts";
my $TS = timestamp();
my $LOG = "$LOGDIR/rename_encoded_files-$TS.log";

GetOptions('apply' => \$APPLY) or die "Usage: $0 [--apply]\n";
make_path($LOGDIR) unless -d $LOGDIR;
make_path($CONFDIR) unless -d $CONFDIR;

open my $LOGF, '>', $LOG or die $!;
logln("[info] base=$BASE, apply=$APPLY");

my @cand;
find({
  wanted => sub {
    return unless -f $_;
    my $p = $File::Find::name;
    return unless $p =~ /\.html(?:$|[^a-z])/i;           # html を含む
    return unless ($p =~ /%3[fF]/ || $p =~ /\?/);        # %3F or ? を含む
    push @cand, $p;
  },
  no_chdir => 1
}, $BASE);

my $renamed=0; my $deleted=0; my $kept=0; my $conflicted=0;

for my $src (@cand) {
  my $dst = $src;
  # 末尾の "%3F...html" または "?...html" を ".html" に正規化
  $dst =~ s/%3[fF][^\/]*?\.html$/.html/;
  $dst =~ s/\?[^\/]*?\.html$/.html/;

  if ($src eq $dst) { $kept++; next; }

  if (-e $dst) {
    # 内容比較（同一なら src 削除 / 異なるなら退避）
    my $h1 = md5file($src);
    my $h2 = md5file($dst);
    if ($h1 eq $h2) {
      if ($APPLY) { unlink $src or warn $!; }
      $deleted++;
      logln("[same] del $src (already have $dst)");
    } else {
      # 退避
      my $rel = $src; $rel =~ s/^\Q$BASE\E\///;
      my $save = "$CONFDIR/$rel";
      my $savedir = dirname($save);
      make_path($savedir) unless -d $savedir;
      if ($APPLY) { move($src, $save) or die $!; }
      $conflicted++;
      logln("[conflict] moved to $save (dst exists: $dst)");
    }
  } else {
    # 素直にリネーム
    if ($APPLY) {
      my $dstdir = dirname($dst);
      make_path($dstdir) unless -d $dstdir;
      move($src, $dst) or die "move($src->$dst): $!";
    }
    $renamed++;
    logln("[rename] $src -> $dst");
  }
}

logln("[done] scanned=".scalar(@cand)." renamed=$renamed deleted=$deleted conflict=$conflicted kept=$kept");
logln("[log] $LOG");
close $LOGF;

sub md5file {
  my $f = shift;
  open my $FH, '<', $f or return '';
  binmode $FH;
  my $ctx = Digest::MD5->new;
  $ctx->addfile($FH);
  close $FH;
  return $ctx->hexdigest;
}
sub logln { print {$LOGF} shift()."\n" }
sub timestamp {
  my @t = localtime();
  return sprintf("%04d%02d%02d-%02d%02d%02d",
    $t[5]+1900,$t[4]+1,$t[3],$t[2],$t[1],$t[0]);
}
