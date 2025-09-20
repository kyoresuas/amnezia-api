const fs = require("fs");
const child_process = require("child_process");

/**
 * Название процесса в PM2
 */
const PROCESS_NAME = "amnezia-api";

/**
 * Обновление проекта на сервере
 */
async function deploy() {
  console.log("Установка пакетов...");

  child_process.execSync("npm install");

  console.log("Компиляция в JavaScript...");

  child_process.execSync("npm run build");

  console.log("Запуск проекта в теневом режиме...");

  let stdout = "";
  let success = true;

  const shadowProcess = child_process
    .spawn("npm run pre-start", { shell: true })
    .on("exit", () => {
      if (!success) {
        console.log(stdout);

        throw Error("Произошла ошибка при запуске проекта в теневом режиме!");
      }

      console.log("Получение списка процессов...");

      const pm2List = JSON.parse(child_process.execSync("pm2 jlist --silent"));
      const processIsExists = !!pm2List.find(
        (pm2Process) => pm2Process.name === PROCESS_NAME
      );

      console.log("Перемещение ресурсов...");

      fs.cpSync("./build", "./dist", { recursive: true });

      console.log("Запуск проекта в режиме PRODUCTION...");

      if (processIsExists) {
        child_process.execSync(`pm2 restart "${PROCESS_NAME}"`);
      } else {
        child_process.execSync(
          `pm2 start npm --name "${PROCESS_NAME}" -- run start`
        );
      }

      removeBuildDirectory();

      console.log("Проект успешно запущен!");
    });

  shadowProcess.stdout.on("data", (data) => {
    const message = data.toString();

    stdout += message;

    if (
      message.includes("FATAL:") &&
      !message.includes("listen EADDRINUSE: address already in use")
    ) {
      success = false;

      shadowProcess.kill();
    } else if (message.includes("Запуск проекта завершён")) {
      shadowProcess.kill();
    }
  });
}

/**
 * Очистить директорию со временной сборкой
 */
function removeBuildDirectory() {
  if (fs.existsSync("./build")) {
    fs.rmSync("./build", { recursive: true });
  }
}

deploy().catch((err) => {
  removeBuildDirectory();

  console.error(err.message);

  process.exit(1);
});
