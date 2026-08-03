const path = require("node:path");
const fs = require("node:fs/promises");
const packageJson = require("../package.json");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "openapi", "openapi.json");
const checkOnly = process.argv.includes("--check");

/**
 * Настроить минимальное окружение для генерации контракта
 */
const setupEnvironment = () => {
  const defaults = {
    ENV: "development",
    FASTIFY_ROUTES: "127.0.0.1:4001",
    FASTIFY_API_KEY: "openapi-generation-key".padEnd(64, "0"),
    CORS_ORIGINS: "",
    SERVER_PUBLIC_HOST: "vpn.example.com",
    PROTOCOLS_ENABLED: "amneziawg,amneziawg2,xray",
    APP_VERSION: packageJson.version,
  };

  for (const [name, value] of Object.entries(defaults)) {
    process.env[name] ??= value;
  }
};

/**
 * Сформировать OpenAPI-контракт из зарегистрированных маршрутов
 */
const createOpenApiDocument = async () => {
  setupEnvironment();

  require("../build/config/setupMultilingualism");
  const { createFastify } = require("../build/config/fastify");
  const fastify = await createFastify();

  try {
    await fastify.ready();
    return fastify.swagger();
  } finally {
    await fastify.close();
  }
};

/**
 * Проверить или записать переносимый OpenAPI-контракт
 */
const generateOpenApi = async () => {
  const document = await createOpenApiDocument();
  const content = `${JSON.stringify(document, null, 2)}\n`;

  if (checkOnly) {
    let currentContent = "";

    try {
      currentContent = await fs.readFile(outputPath, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    if (currentContent !== content) {
      throw new Error(
        "OpenAPI contract is outdated. Run `npm run openapi:generate`.",
      );
    }

    console.log("OpenAPI contract is up to date");
    return;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content);
  console.log(`OpenAPI contract written to ${outputPath}`);
};

generateOpenApi().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
