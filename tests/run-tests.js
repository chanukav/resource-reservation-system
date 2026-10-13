const path = require("path");
const createJiti = require("jiti");

const jiti = createJiti(path.join(process.cwd(), "index.js"), {
  alias: {
    "@": path.resolve("./src"),
  },
});

const testArg = process.argv[2] || "./tests/authorization.test.ts";
const testFile = path.isAbsolute(testArg) ? testArg : path.resolve(process.cwd(), testArg);
jiti(testFile);
