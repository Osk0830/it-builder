#!/usr/bin/env perl
use strict;
use warnings;
use File::Find;
use POSIX qw(strftime);

# Usage: perl list_orphan_context_v2.pl [BASE_DIR]
my $BASE = shift @ARGV // 'it-builder';

# 出力先
my $ts = strftime("%Y%m%d-%H%M%S", localtime);
my $LOG_DIR = "$BASE/_cleanup_logs";
my $CONTEXT_LOG = "$LOG_DIR/orphan_context-$ts.log";
my $TSV_FILE    = "$LOG_DIR/orphan_hits-$ts.tsv";

(-d $BASE) or die "[error] BASE not found: $BASE\n";
mkdir $LOG_DIR unless -d $LOG_DIR;

open my $CTX, '>', $CONTEXT_LOG or die $!;
open my $TSV, '>', $TSV_FILE or die $!;
print $TSV join("\t", qw(file line kind attr value snippet)), "\n";

my @files;
find({
  wanted => sub {
    return unless -f $_;
    return unless $_ =~ /\.html?$/i;      # 末尾 .htm/.html
    push @files, $File::Find::name;
  },
  no_chdir => 1
}, $BASE);

my $total = 0;

for my $f (@files) {
  local $/;
  open my $IN, '<:raw', $f or do { warn "[warn] open fail: $f\n"; next; };
  my $src = <$IN>;
  close $IN;

  # 行配列
  my @lines = split /\n/, $src, -1;

  # 1) 属性パターン（href/src/action いずれか、' も " もOK、/it-builder/_orphans/ も /_orphans/ も拾う）
  my @hit_attr;
  while ($src =~ m{
      <(a|form|link)\b[^>]*?
      \b(href|src|action|rel|canonical)\s*=\s*
      (["'])                             # 3: quote
      (.*?)                              # 4: value (改行含む)
      \3                                 # 同じクオートで閉じ
    }gisx) {
    my ($tag,$attr,$val) = ($1,$2,$4);
    next unless $val =~ m{/(?:it-builder/)?_orphans/}i;
    # 位置→行番号
    my $m_start = (pos($src) // 0) - length($&);
    my $line = _pos_to_line($m_start, \@lines);
    push @hit_attr, {tag=>$tag, attr=>$attr, val=>$val, line=>$line};
  }

  # 2) テキスト/コメントも含め、素直に /_orphans/ が出る行を検出（重複排除）
  my %line_seen;
  for my $h (@hit_attr) { $line_seen{$h->{line}} = 1; }

  for (my $i=0; $i<@lines; $i++) {
    my $L = $i+1;
    next if $line_seen{$L};
    next unless $lines[$i] =~ m{/(?:it-builder/)?_orphans/}i;
    # 既に属性で拾えてない＝テキスト/コメントなど
    push @hit_attr, {tag=>'text', attr=>'-', val=>$lines[$i], line=>$L};
  }

  next unless @hit_attr;

  # 出力
  for my $h (sort { $a->{line} <=> $b->{line} } @hit_attr) {
    $total++;
    my $L = $h->{line};
    my $from = $L-2; $from = 1 if $from < 1;
    my $to   = $L+2; $to   = @lines if $to > @lines;

    print $CTX "---- $f:$L [$h->{tag}\@$h->{attr}] ----\n";
    for (my $ln=$from; $ln <= $to; $ln++) {
      my $mark = ($ln == $L) ? '>' : ' ';
      printf $CTX "%s%6d: %s\n", $mark, $ln, $lines[$ln-1];
    }
    print $CTX "\n";

    my $snippet = $lines[$L-1] // '';
    $snippet =~ s/\t/ /g;
    $snippet =~ s/\s{2,}/ /g;
    $snippet = substr($snippet, 0, 200);

    print $TSV join("\t",
      $f, $L, $h->{tag}, $h->{attr}, _squash($h->{val}), $snippet
    ), "\n";
  }
}

close $CTX;
close $TSV;

print "[done] hits=$total\n";
print "[files] context : $CONTEXT_LOG\n";
print "[files] tsv     : $TSV_FILE\n";

# ------------------------
sub _pos_to_line {
  my ($pos, $lines) = @_;
  my $acc = 0;
  for (my $i=0; $i<@$lines; $i++) {
    my $len = length($lines->[$i]) + 1; # 改行
    return $i+1 if $acc + $len > $pos;
    $acc += $len;
  }
  return scalar(@$lines);
}
sub _squash {
  my ($s) = @_;
  $s =~ s/\R/ /g;
  $s =~ s/\s{2,}/ /g;
  return substr($s, 0, 500);
}
