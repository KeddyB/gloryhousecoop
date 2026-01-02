import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { note_id } = req.body;

  if (!note_id) {
    return res.status(400).json({ error: "note_id is required" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: "Supabase environment variables not set" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { error } = await supabase
    .from("member_notes")
    .delete()
    .eq("id", note_id);

  if (error) {
    console.error("Error deleting note:", error);
    return res.status(500).json({ error: "Failed to delete note" });
  }

  return res.status(200).json({ message: "Note deleted successfully" });
}
