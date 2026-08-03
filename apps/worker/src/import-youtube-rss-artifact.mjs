process.env.TOOLRADAR_ARTIFACT_PATH ??= "out/youtube-rss-pilot.json";
process.env.TOOLRADAR_IMPORT_RECEIPT ??=
  "out/youtube-rss-import-receipt.json";

await import("./import-youtube-public-artifact.mjs");
