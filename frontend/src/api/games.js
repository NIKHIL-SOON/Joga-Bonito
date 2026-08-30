import client from "./client";

export async function fetchGames() {
  try {
    const res = await client.get("/games");
    return res.data?.data || [];
  } catch (err) {
    // client.js's interceptor already normalized this into { message, statusCode, errors }.
    throw new Error(err.message);
  }
}
