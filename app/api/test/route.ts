import { NextResponse } from "next/server";
export async function GET() {
    const res = await fetch("https://jsonplaceholder.typicode.com/todos/1").then((r) => r.json());
    return NextResponse.json({ res });
}