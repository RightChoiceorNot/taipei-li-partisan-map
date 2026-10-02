import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateSpecifiedCandidates, calculateScore, calculateShares, classify, median, RULES, summarizeSevenScores } from '../scripts/lib/election.mjs';

test('score uses only blue and green votes', () => {
  assert.equal(calculateScore(60, 40), 20);
  assert.equal(calculateScore(40, 60), -20);
});

test('relative shares use only the two compared camps and sum to 100', () => {
  assert.deepEqual(calculateShares(60, 40), { greenShare: 60, blueShare: 40 });
  const result = aggregateSpecifiedCandidates(2022, [
    { candidate_name: '陳時中', votes: 30 },
    { candidate_name: '蔣萬安', votes: 50 },
    { candidate_name: '黃珊珊', votes: 1000 },
  ]);
  assert.equal(result.greenShare, 37.5);
  assert.equal(result.blueShare, 62.5);
});

test('1994 combines both specified blue candidates', () => {
  const result = aggregateSpecifiedCandidates(1994, [
    { candidate_name: '陳水扁', votes: 100 },
    { candidate_name: '趙少康', votes: 60 },
    { candidate_name: '黃大洲', votes: 20 },
    { candidate_name: '王某某', votes: 999 },
  ]);
  assert.deepEqual({ green: result.greenVotes, blue: result.blueVotes }, { green: 100, blue: 80 });
  assert.equal(result.score, calculateScore(100, 80));
});

test('2022 excludes Huang Shan-shan and all other candidates', () => {
  const result = aggregateSpecifiedCandidates(2022, [
    { candidate_name: '陳時中', votes: 70 },
    { candidate_name: '蔣萬安', votes: 80 },
    { candidate_name: '黃珊珊', votes: 1000 },
  ]);
  assert.equal(result.score, calculateScore(70, 80));
});

test('2014 treats only Ko Wen-je as green and Lien Sheng-wen as blue', () => {
  const result = aggregateSpecifiedCandidates(2014, [
    { candidate_name: '柯文哲', votes: 55 },
    { candidate_name: '連勝文', votes: 45 },
    { candidate_name: '無關候選人', votes: 900 },
  ]);
  assert.equal(result.score, 10);
  assert.throws(() => aggregateSpecifiedCandidates(2018, []), /Unsupported election year/);
});

test('every included year ignores candidates outside its explicit rule', () => {
  for (const [year, rule] of Object.entries(RULES)) {
    const rows = [
      ...rule.green.map((candidate_name) => ({ candidate_name, votes: 60 })),
      ...rule.blue.map((candidate_name) => ({ candidate_name, votes: 40 })),
      { candidate_name: '不應納入的候選人', votes: 999999 },
    ];
    const result = aggregateSpecifiedCandidates(Number(year), rows);
    assert.equal(result.greenVotes, 60 * rule.green.length);
    assert.equal(result.blueVotes, 40 * rule.blue.length);
  }
});

test('median and fixed thresholds are exact', () => {
  assert.equal(median([-9, -5, -1, 0, 4, 6, 12]), 0);
  assert.equal(classify(5), '中立區');
  assert.equal(classify(-5), '中立區');
  assert.equal(classify(5.0001), '綠營優勢區');
  assert.equal(classify(-5.0001), '藍營優勢區');
});

test('a completed li must contain all seven election scores', () => {
  assert.throws(() => summarizeSevenScores({ 1994: 1 }), /Missing score years/);
  const summary = summarizeSevenScores({ 1994: -10, 1998: -4, 2002: 0, 2006: 3, 2010: 7, 2014: 9, 2022: 12 });
  assert.equal(summary.medianScore, 3);
  assert.equal(summary.classification, '中立區');
});
