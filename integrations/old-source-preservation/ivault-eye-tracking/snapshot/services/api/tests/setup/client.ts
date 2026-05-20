import request from "supertest";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3000";

export function api() {
  return request(apiBaseUrl);
}
