#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");
const { minify } = require("html-minifier-terser");

const ROOT = process.cwd();

const FILES = {
  html: [
    "index.html",
    "cotreatment.html"
  ],
  js: [
    "js/time/revenue-overlay.js"
  ]
};

const obfOptions = {
  seed: 5774,
  compact: true,
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,

  stringArray: true,
  stringArrayEncoding: ["base64"],
  splitStrings: true,
  splitStringsChunkLength: 6,

  controlFlowFlattening: false,
  deadCodeInjection: false
};

async function minifyHtml(file) {
  const full = path.join(ROOT, file);
  const input = fs.readFileSync(full, "utf8");

  const output = await minify(input, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: true
  });

  fs.writeFileSync(full, output);
  console.log("minified:", file);
}

function obfuscateJs(file) {
  const full = path.join(ROOT, file);
  const input = fs.readFileSync(full, "utf8");

  const result = JavaScriptObfuscator.obfuscate(input, obfOptions);

  fs.writeFileSync(full, result.getObfuscatedCode());
  console.log("obfuscated:", file);
}

async function run() {
  for (const file of FILES.html) {
    await minifyHtml(file);
  }

  for (const file of FILES.js) {
    obfuscateJs(file);
  }

  console.log("done");
}

run();