type Device = { userAgent: string; platform: string; maxTouchPoints: number; standalone?: boolean };

/** iPadOS can identify as a Mac when Safari requests the desktop site. */
export function canOfferInstall(device: Device, standalone: boolean): boolean {
  return !standalone && !device.standalone && (/iPhone|iPad|iPod/.test(device.userAgent)
    || (device.platform === "MacIntel" && device.maxTouchPoints > 1));
}
