// Centralized Mobile App Version Configuration
import versionData from './version.json';

export const APP_VERSION = versionData.customer.version;
export const APP_BUILD_NUMBER = Number(versionData.customer.build);
export const APP_RELEASE_DATE = versionData.customer.releaseDate;

export const ADMIN_APP_VERSION = versionData.admin.version;
export const ADMIN_APP_BUILD_NUMBER = Number(versionData.admin.build);
export const ADMIN_APP_RELEASE_DATE = versionData.admin.releaseDate;

export default {
  APP_VERSION,
  APP_BUILD_NUMBER,
  APP_RELEASE_DATE,
  ADMIN_APP_VERSION,
  ADMIN_APP_BUILD_NUMBER,
  ADMIN_APP_RELEASE_DATE
};
