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

  child_process.execSync("npm install", { stdio: "inherit" });

  console.log("Компиляция в JavaScript...");

  child_process.execSync("npm run build", { stdio: "inherit" });

  console.log("Запуск проекта в теневом режиме...");

  await new Promise((resolve, reject) => {
    let stdout = "";
    let success = true;

    const shadowProcess = child_process.spawn("npm run pre-start", {
      shell: true,
    });

    shadowProcess.on("error", (err) => reject(err));

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

    shadowProcess.stderr.on("data", (data) => {
      const message = data.toString();
      stdout += message;
      if (
        message.includes("FATAL:") &&
        !message.includes("listen EADDRINUSE: address already in use")
      ) {
        success = false;
        shadowProcess.kill();
      }
    });

    shadowProcess.on("exit", () => {
      if (!success) {
        console.log(stdout);
        return reject(
          new Error("Произошла ошибка при запуске проекта в теневом режиме!")
        );
      }

      try {
        console.log("Получение списка процессов...");

        const pm2List = JSON.parse(
          child_process.execSync("pm2 jlist --silent").toString()
        );
        const processIsExists = !!pm2List.find(
          (pm2Process) => pm2Process.name === PROCESS_NAME
        );

        console.log("Перемещение ресурсов...");
        fs.cpSync("./build", "./dist", { recursive: true });

        console.log("Запуск проекта в режиме PRODUCTION...");
        if (processIsExists) {
          child_process.execSync(`pm2 restart "${PROCESS_NAME}"`, {
            stdio: "inherit",
          });
        } else {
          child_process.execSync(
            `pm2 start npm --name "${PROCESS_NAME}" -- run start`,
            { stdio: "inherit" }
          );
        }

        removeBuildDirectory();
        console.log("Проект успешно запущен!");
        resolve();
      } catch (err) {
        reject(err);
      }
    });
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

deploy()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    removeBuildDirectory();
    console.error(err.message);
    process.exit(1);
  });
