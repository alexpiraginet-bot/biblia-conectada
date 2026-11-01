import { marketingReportResponse } from "@/lib/audience/marketing-server";
export const maxDuration = 30;
export async function GET(request: Request) { return marketingReportResponse(request); }
