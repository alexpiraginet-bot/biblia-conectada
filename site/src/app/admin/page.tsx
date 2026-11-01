import type { Metadata } from "next";
import { AudienceDashboard } from "@/components/audience/AudienceDashboard";
export const metadata: Metadata = { title: "Gestão de audiência", robots: { index: false, follow: false, nocache: true } };
export default function AdminPage() { return <AudienceDashboard />; }
