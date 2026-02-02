import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Retrieve relevant document chunks from Supabase using vector similarity
 * SAFE MODE for Supabase FREE tier
 */
export async function retrieveFromSupabase(question, topK = 3) {
  try {
    // 1. Create embedding for the question
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Perform similarity search in Supabase (LOW LOAD)
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: Math.min(topK, 3), // 🔒 hard cap
    });

    if (error) {
      console.error("Supabase RAG RPC error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn("RAG: no matching documents found");
      return [];
    }

    // 3. Normalize results
    return data.map((row) => ({
      text: row.text_chunk,
      title: row.title,
      category: row.category,
      source: row.file_url,
    }));
  } catch (err) {
    console.error("RAG retrieval failed:", err);
    return [];
  }
}