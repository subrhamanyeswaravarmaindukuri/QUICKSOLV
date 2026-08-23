import { NextResponse } from "next/server";
import { dbService } from "@/services/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "demo-user-123";
    const query = searchParams.get("query") || "";

    const saved = await dbService.getSavedAnswers(userId, query);
    return NextResponse.json({ success: true, saved });
  } catch (err: any) {
    console.error("API GET save failed:", err);
    return NextResponse.json({ error: "Failed to retrieve saved answers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, subject, topic, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const activeUserId = userId || "demo-user-123";
    const saved = await dbService.saveAnswer(activeUserId, title, subject || "General", topic || "Study Notes", content);

    return NextResponse.json({ success: true, saved });
  } catch (err: any) {
    console.error("API POST save failed:", err);
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId") || "demo-user-123";

    if (!id) {
      return NextResponse.json({ error: "Id is required" }, { status: 400 });
    }

    const success = await dbService.deleteSavedAnswer(userId, id);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error("API DELETE save failed:", err);
    return NextResponse.json({ error: "Failed to delete saved answer" }, { status: 500 });
  }
}
