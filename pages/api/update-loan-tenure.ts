import { createServerClient } from "@/utils/supabase/server";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createServerClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { loan_id, tenure } = req.body;

  if (!loan_id || tenure === undefined) {
    return res.status(400).json({ error: "loan_id and tenure are required" });
  }

  const newTenure = parseInt(tenure, 10);
  if (isNaN(newTenure) || newTenure <= 0) {
    return res
      .status(400)
      .json({ error: "Tenure must be a positive number." });
  }

  try {
    const { data, error } = await supabase
      .from("loans")
      .update({ tenure: newTenure })
      .eq("id", loan_id)
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({ message: "Loan tenure updated successfully", data });
  } catch (error: any) {
    console.error("Error updating loan tenure:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
