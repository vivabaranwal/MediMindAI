import type { NextRequest } from "next/server";
import { forwardToBackend } from "@/lib/server/backendProxy";

export const dynamic = "force-dynamic";

type Ctx = { params: { path: string[] } };

const handler = (req: NextRequest, { params }: Ctx) => forwardToBackend(req, `/api/${params.path.join("/")}`);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
