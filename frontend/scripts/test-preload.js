const Module = require("module");
const path = require("path");

const originalResolve = Module._resolveFilename;
const rootDir = path.resolve(__dirname, "..");
const testBuildDir = path.resolve(rootDir, ".test-build");

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const relativePath = request.slice(2);
    const targetPath = path.resolve(testBuildDir, relativePath);
    return originalResolve.call(this, targetPath, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
