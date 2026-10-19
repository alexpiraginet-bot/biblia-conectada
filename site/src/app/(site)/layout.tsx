import { PonteStrip } from "@/components/community/PonteStrip";

// The pages of the site's sections. The shell (top bar, rail, tab bar, footer) is in the root layout.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      {/* renders nothing unless a bridge (Ponte nº N) is in progress on this device */}
      <PonteStrip />
    </>
  );
}
