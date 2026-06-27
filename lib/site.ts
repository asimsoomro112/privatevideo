const DEFAULT_SITE_NAME = "PrivateVideos";
const LEGACY_SITE_NAMES = new Set(["HerPrivateCinema", "StreamVault", "STREAMVAULT"]);

const configuredSiteName = process.env.NEXT_PUBLIC_SITE_NAME?.trim();

export const SITE_NAME =
  configuredSiteName && !LEGACY_SITE_NAMES.has(configuredSiteName)
    ? configuredSiteName
    : DEFAULT_SITE_NAME;

export const SITE_DESCRIPTION =
  "A private premium cinematic video streaming platform with adaptive Bunny Stream playback.";
