// High scores in Supabase (project musab-agents, table crow_scores). The
// publishable key can only read the board and call submit_crow_score, which
// checks each score and only accepts ones that make the top 10.
const URL = 'https://wkzrefbvjxqphkrduyqj.supabase.co/rest/v1';
const KEY = 'sb_publishable_Gn24T5ilCXGtftxWUOUOMA_C1kd6CPE';
const headers = { apikey: KEY, 'Content-Type': 'application/json' };

export async function topTen() {
  const response = await fetch(`${URL}/crow_scores?select=name,score,kills,accuracy,difficulty,created_at&order=score.desc,created_at.asc&limit=10`, { headers, cache: 'no-store' });
  if (!response.ok) throw Error('Papan skor tidak dapat dibuka');
  return response.json();
}

// Returns the new rank (1 = top).
export async function submitScore({ name, score, kills, accuracy, difficulty, seconds }) {
  const response = await fetch(`${URL}/rpc/submit_crow_score`, {
    method: 'POST', headers,
    body: JSON.stringify({ p_name: name, p_score: score, p_kills: kills, p_accuracy: accuracy, p_difficulty: difficulty, p_seconds: Math.round(seconds) })
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw Error(body?.message === 'not top 10' ? 'Skor sudah terkeluar dari 10 teratas' : 'Skor tidak dapat dihantar');
  return body;
}
