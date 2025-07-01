import Logger from "../common/logger";

let logger;

if (Bun.env.NODE_ENV === "production") {
  logger = new Logger({ level: "warn" });
} else if (Bun.env.NODE_ENV === "dev") {
  logger = new Logger({ level: "debug" });
} else {
  logger = new Logger({ level: "info" });
}

export default logger;
