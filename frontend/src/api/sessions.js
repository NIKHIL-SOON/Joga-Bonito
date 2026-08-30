import client from "./client";

async function request(path, { method = "GET", body } = {}) {
  try {
    const res = await client.request({ url: path, method, data: body });
    return res.data?.data;
  } catch (err) {
    // client.js's interceptor already normalized this into { message, statusCode, errors }.
    throw new Error(err.message);
  }
}

export function createSession({ gameId }) {
  return request("/sessions/create", { method: "POST", body: { gameId } });
}

export function endSession(performance) {
  return request("/sessions/end", { method: "POST", body: performance });
}

export function fetchSessions() {
  return request("/sessions");
}

export function fetchSessionStats(range = "daily") {
  return request(`/sessions/stats?range=${range}`);
}

export function fetchAdaptiveLog(gameId) {
  return request(gameId ? `/sessions/adaptive-log?gameId=${encodeURIComponent(gameId)}` : "/sessions/adaptive-log");
}
