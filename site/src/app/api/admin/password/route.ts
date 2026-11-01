import { changeAdminPassword } from "@/lib/audience/admin-security";
export const maxDuration = 30;
export const POST = (request: Request) => changeAdminPassword(request);
