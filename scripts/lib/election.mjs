export const YEARS = [1994, 1998, 2002, 2006, 2010, 2014, 2022];

export const RULES = Object.freeze({
  1994: { green: ['陳水扁'], blue: ['趙少康', '黃大洲'], greenLabel: '陳水扁', blueLabel: '趙少康＋黃大洲' },
  1998: { green: ['陳水扁'], blue: ['馬英九'], greenLabel: '陳水扁', blueLabel: '馬英九' },
  2002: { green: ['李應元'], blue: ['馬英九'], greenLabel: '李應元', blueLabel: '馬英九' },
  2006: { green: ['謝長廷'], blue: ['郝龍斌'], greenLabel: '謝長廷', blueLabel: '郝龍斌' },
  2010: { green: ['蘇貞昌'], blue: ['郝龍斌'], greenLabel: '蘇貞昌', blueLabel: '郝龍斌' },
  2014: { green: ['柯文哲'], blue: ['連勝文'], greenLabel: '柯文哲（本研究列為綠營）', blueLabel: '連勝文' },
  2022: { green: ['陳時中'], blue: ['蔣萬安'], greenLabel: '陳時中', blueLabel: '蔣萬安（不納入黃珊珊及其他候選人）' },
});

export function calculateScore(greenVotes, blueVotes) {
  if (!Number.isFinite(greenVotes) || !Number.isFinite(blueVotes) || greenVotes < 0 || blueVotes < 0) {
    throw new TypeError('Votes must be finite non-negative numbers.');
  }
  const denominator = greenVotes + blueVotes;
  if (denominator === 0) throw new RangeError('Blue and green votes cannot both be zero.');
  return ((greenVotes - blueVotes) / denominator) * 100;
}

export function calculateShares(greenVotes, blueVotes) {
  if (!Number.isFinite(greenVotes) || !Number.isFinite(blueVotes) || greenVotes < 0 || blueVotes < 0) {
    throw new TypeError('Votes must be finite non-negative numbers.');
  }
  const denominator = greenVotes + blueVotes;
  if (denominator === 0) throw new RangeError('Blue and green votes cannot both be zero.');
  return {
    greenShare: (greenVotes / denominator) * 100,
    blueShare: (blueVotes / denominator) * 100,
  };
}

export function median(values) {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError('Median requires a non-empty array of finite numbers.');
  }
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function classify(score) {
  if (score > 5) return '綠營優勢區';
  if (score < -5) return '藍營優勢區';
  return '中立區';
}

export function summarizeSevenScores(scoresByYear) {
  const missing = YEARS.filter((year) => !Number.isFinite(scoresByYear[year]));
  if (missing.length) throw new Error(`Missing score years: ${missing.join(', ')}`);
  const values = YEARS.map((year) => scoresByYear[year]);
  const medianScore = median(values);
  return {
    medianScore,
    meanScore: values.reduce((sum, value) => sum + value, 0) / values.length,
    minScore: Math.min(...values),
    maxScore: Math.max(...values),
    classification: classify(medianScore),
  };
}

export function aggregateSpecifiedCandidates(year, rows) {
  const rule = RULES[year];
  if (!rule) throw new Error(`Unsupported election year: ${year}`);
  const votes = new Map(rows.map((row) => [row.candidate_name, Number(row.votes)]));
  const required = [...rule.green, ...rule.blue];
  const missing = required.filter((candidate) => !votes.has(candidate));
  if (missing.length) throw new Error(`Missing required candidates for ${year}: ${missing.join(', ')}`);
  const greenVotes = rule.green.reduce((sum, candidate) => sum + votes.get(candidate), 0);
  const blueVotes = rule.blue.reduce((sum, candidate) => sum + votes.get(candidate), 0);
  return {
    greenVotes,
    blueVotes,
    score: calculateScore(greenVotes, blueVotes),
    ...calculateShares(greenVotes, blueVotes),
    rule,
  };
}
