import type { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) => forwardToBackend(req, "/sanctum/csrf-cookie");
