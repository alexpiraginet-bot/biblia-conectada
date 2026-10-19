import { PonteStrip } from "@/components/community/PonteStrip";
import { SiteHeader } from "@/components/header/SiteHeader";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      {children}
      {/* renders nothing unless a bridge (Ponte nº N) is in progress on this device */}
      <PonteStrip />
    </>
  );
}
