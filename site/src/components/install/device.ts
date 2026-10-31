type Device = { userAgent: string; platform: string; maxTouchPoints: number; standalone?: boolean };

/** iPadOS can identify as a Mac when Safari requests the desktop site. */
export function installPlatform(device: Device): "ios" | "android" | null {
  if (/iPhone|iPad|iPod/.test(device.userAgent) || (device.platform === "MacIntel" && device.maxTouchPoints > 1)) return "ios";
  return /Android/.test(device.userAgent) ? "android" : null;
}

export function canOfferInstall(device: Device, standalone: boolean): boolean {
  return !standalone && !device.standalone && installPlatform(device) !== null;
}
