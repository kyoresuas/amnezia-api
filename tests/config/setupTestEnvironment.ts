export const TEST_API_KEY = "test-api-key".padEnd(64, "0");
export const TEST_SERVER_MAX_PEERS = 2;

Object.assign(process.env, {
  ENV: "development",
  FASTIFY_ROUTES: "127.0.0.1:4001",
  FASTIFY_API_KEY: TEST_API_KEY,
  CORS_ORIGINS: "",
  SERVER_PUBLIC_HOST: "127.0.0.1",
  SERVER_MAX_PEERS: String(TEST_SERVER_MAX_PEERS),
  PROTOCOLS_ENABLED: "amneziawg,amneziawg2,xray",
});
