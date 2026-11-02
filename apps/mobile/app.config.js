const fs = require("node:fs");
const path = require("node:path");
const appConfig = require("./app.json");

const { expo } = appConfig;
const android = { ...expo.android };

// google-services.json is gitignored because it is specific to a Firebase
// project. Keep local Android builds working without it; remote push
// notifications are enabled when the file is present.
if (android.googleServicesFile) {
  const googleServicesPath = path.resolve(
    __dirname,
    android.googleServicesFile,
  );
  if (!fs.existsSync(googleServicesPath)) {
    delete android.googleServicesFile;
  }
}

module.exports = {
  ...expo,
  android,
  extra: {
    ...expo.extra,
    posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.POSTHOG_HOST,
  },
};
