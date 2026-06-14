import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import type { NextRequest } from "next/server";

const handler = NextAuth(authOptions);

export const GET = handler as unknown as (
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) => Promise<Response>;

export const POST = handler as unknown as (
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) => Promise<Response>;
