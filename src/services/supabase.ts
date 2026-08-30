import { createClient } from "@supabase/supabase-js";
import { generateApiKeySecret } from "@/core/security/apiKeyService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface InMemoryDb {
  profiles: Record<string, { email: string; tier: string; max_requests: number }>;
  conversations: Array<{ id: string; user_id: string; title: string; description?: string; subject?: string; created_at: string; is_saved?: boolean }>;
  messages: Array<{
    id: string;
    conversation_id: string;
    role: "user" | "assistant";
    content: string;
    image_url?: string;
    mode?: string;
    created_at: string;
  }>;
  savedAnswers: Array<{
    id: string;
    user_id: string;
    title: string;
    subject: string;
    topic: string;
    content: any;
    created_at: string;
  }>;
  usage: Record<string, Record<string, number>>;
  quizResults: Array<{
    id: string;
    user_id: string;
    subject: string;
    topic: string;
    score: number;
    total: number;
    created_at: string;
  }>;
  userStreaks?: Record<string, { streak_count: number; streak_last_date: string; streak_history: string[] }>;
  apiKeys?: any[];
}

// Clear all pre-populated mock history to allow a 100% clean and real user experience
const mockConversations: any[] = [];
const mockMessages: any[] = [];

let serverDb: InMemoryDb = {
  profiles: {
    "demo-user-123": { email: "ananya.kumar@quicksolv.edu", tier: "free", max_requests: 10 }
  },
  conversations: mockConversations,
  messages: mockMessages,
  savedAnswers: [],
  usage: {},
  quizResults: [],
  apiKeys: [
    {
      id: "key_demo_123",
      user_id: "demo-user-123",
      name: "Test Demo Key",
      key_prefix: "qs_test_demo",
      key_hash: "mock_hash_123",
      created_at: new Date().toISOString(),
      rate_limit_rpm: 60,
      monthly_credit_limit: 1000,
      scopes: ["solve:read", "chat:write"]
    }
  ]
};

function getDb(): InMemoryDb {
  if (typeof window === "undefined") {
    return serverDb;
  }
  
  const saved = localStorage.getItem("snaptutor_mock_db");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Clean up old mock conversations if they exist
      parsed.conversations = (parsed.conversations || []).filter((c: any) => c && c.id && !c.id.startsWith("c-"));
      parsed.messages = (parsed.messages || []).filter((m: any) => m && m.id && !m.id.startsWith("m-") && m.conversation_id && !m.conversation_id.startsWith("c-"));
      return parsed;
    } catch {
      // fallback
    }
  }
  return serverDb;
}

function saveDb(db: InMemoryDb) {
  serverDb = db;
  if (typeof window !== "undefined") {
    localStorage.setItem("snaptutor_mock_db", JSON.stringify(db));
  }
}

export const dbService = {
  async checkUsageLimit(userId: string): Promise<{ count: number; max: number }> {
    const max = 999999;
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    if (supabase) {
      const { data, error } = await supabase
        .from("usage")
        .select("count")
        .eq("user_id", userId)
        .eq("month", currentMonth)
        .single();
        
      if (error && error.code !== "PGRST116") {
        console.error("Supabase usage query error:", error);
      }
      
      return { count: data?.count || 0, max };
    } else {
      const db = getDb();
      if (!db.usage[userId]) db.usage[userId] = {};
      const count = db.usage[userId][currentMonth] || 0;
      return { count, max };
    }
  },

  async incrementUsage(userId: string, amount: number = 1): Promise<number> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    if (supabase) {
      const { data: existing } = await supabase
        .from("usage")
        .select("id, count")
        .eq("user_id", userId)
        .eq("month", currentMonth)
        .single();
        
      if (existing) {
        const { data } = await supabase
          .from("usage")
          .update({ count: existing.count + amount })
          .eq("id", existing.id)
          .select("count")
          .single();
        return data?.count || existing.count + amount;
      } else {
        const { data } = await supabase
          .from("usage")
          .insert({ user_id: userId, month: currentMonth, count: amount })
          .select("count")
          .single();
        return data?.count || amount;
      }
    } else {
      const db = getDb();
      if (!db.usage[userId]) db.usage[userId] = {};
      const count = (db.usage[userId][currentMonth] || 0) + amount;
      db.usage[userId][currentMonth] = count;
      saveDb(db);
      return count;
    }
  },

  async saveAnswer(userId: string, title: string, subject: string, topic: string, content: any): Promise<any> {
    if (supabase) {
      const { data, error } = await supabase
        .from("saved_answers")
        .insert({ user_id: userId, title, subject, topic, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const db = getDb();
      const newItem = {
        id: "saved_" + Math.random().toString(36).substring(2, 11),
        user_id: userId,
        title,
        subject,
        topic,
        content,
        created_at: new Date().toISOString()
      };
      db.savedAnswers.push(newItem);
      saveDb(db);
      return newItem;
    }
  },

  async getSavedAnswers(userId: string, queryText?: string): Promise<any[]> {
    if (supabase) {
      let req = supabase.from("saved_answers").select("*").eq("user_id", userId);
      if (queryText) {
        req = req.or(`title.ilike.%${queryText}%,subject.ilike.%${queryText}%,topic.ilike.%${queryText}%`);
      }
      const { data, error } = await req.order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const db = getDb();
      let list = db.savedAnswers.filter(item => item.user_id === userId);
      if (queryText) {
        const q = queryText.toLowerCase();
        list = list.filter(
          item =>
            item.title.toLowerCase().includes(q) ||
            item.subject.toLowerCase().includes(q) ||
            item.topic.toLowerCase().includes(q)
        );
      }
      return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  },

  async deleteSavedAnswer(userId: string, id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from("saved_answers")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      return !error;
    } else {
      const db = getDb();
      const initialLen = db.savedAnswers.length;
      db.savedAnswers = db.savedAnswers.filter(item => !(item.id === id && item.user_id === userId));
      saveDb(db);
      return db.savedAnswers.length < initialLen;
    }
  },

  async saveQuizResult(userId: string, subject: string, topic: string, score: number, total: number): Promise<any> {
    if (supabase) {
      const { data, error } = await supabase
        .from("quiz_results")
        .insert({ user_id: userId, subject, topic, score, total })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const db = getDb();
      const newItem = {
        id: "quiz_" + Math.random().toString(36).substring(2, 11),
        user_id: userId,
        subject,
        topic,
        score,
        total,
        created_at: new Date().toISOString()
      };
      db.quizResults.push(newItem);
      saveDb(db);
      return newItem;
    }
  },

  async getQuizResults(userId: string): Promise<any[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const db = getDb();
      return db.quizResults
        .filter(item => item.user_id === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  },

  async createConversation(userId: string, title: string, description: string = "", subject: string = "General"): Promise<any> {
    if (supabase) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title, description, subject })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const db = getDb();
      const newItem = {
        id: "conv_" + Math.random().toString(36).substring(2, 11),
        user_id: userId,
        title,
        description,
        subject,
        created_at: new Date().toISOString()
      };
      db.conversations.push(newItem);
      saveDb(db);
      return newItem;
    }
  },

  async getConversations(userId: string): Promise<any[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const db = getDb();
      return db.conversations
        .filter(item => item.user_id === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  },

  async addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    imageUrl?: string,
    mode?: string
  ): Promise<any> {
    if (supabase) {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role,
          content,
          image_url: imageUrl,
          mode
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const db = getDb();
      const newItem = {
        id: "msg_" + Math.random().toString(36).substring(2, 11),
        conversation_id: conversationId,
        role,
        content,
        image_url: imageUrl,
        mode,
        created_at: new Date().toISOString()
      };
      db.messages.push(newItem);
      saveDb(db);
      return newItem;
    }
  },

  async getMessages(conversationId: string): Promise<any[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    } else {
      const db = getDb();
      return db.messages
        .filter(item => item.conversation_id === conversationId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
  },

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId)
        .eq("user_id", userId);
      return !error;
    } else {
      const db = getDb();
      const initialLen = db.conversations.length;
      db.conversations = db.conversations.filter(item => !(item.id === conversationId && item.user_id === userId));
      db.messages = db.messages.filter(item => item.conversation_id !== conversationId);
      saveDb(db);
      return db.conversations.length < initialLen;
    }
  },

  async renameConversation(userId: string, conversationId: string, newTitle: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from("conversations")
        .update({ title: newTitle })
        .eq("id", conversationId)
        .eq("user_id", userId);
      return !error;
    } else {
      const db = getDb();
      const conv = db.conversations.find(item => item.id === conversationId && item.user_id === userId);
      if (conv) {
        conv.title = newTitle;
        saveDb(db);
        return true;
      }
      return false;
    }
  },

  async syncLocalChat(
    convId: string,
    title: string,
    description: string,
    subject: string,
    userMsg: string,
    aiResponse: any,
    attachedImage?: string,
    attachedImageMime?: string,
    aiMode?: string
  ): Promise<void> {
    if (supabase) return;
    const db = getDb();
    
    if (!db.conversations.some(c => c.id === convId)) {
      db.conversations.push({
        id: convId,
        user_id: "demo-user-123",
        title,
        description,
        subject,
        created_at: new Date().toISOString()
      });
    }
    
    db.messages.push({
      id: "msg_u_" + Math.random().toString(36).substring(2, 11),
      conversation_id: convId,
      role: "user",
      content: userMsg,
      image_url: attachedImage ? `attached:${attachedImageMime}` : undefined,
      mode: aiMode,
      created_at: new Date().toISOString()
    });
    
    db.messages.push({
      id: "msg_a_" + Math.random().toString(36).substring(2, 11),
      conversation_id: convId,
      role: "assistant",
      content: JSON.stringify(aiResponse),
      mode: aiMode,
      created_at: new Date().toISOString()
    });
    
    saveDb(db);
  },

  async toggleSaveConversation(userId: string, convId: string, isSaved: boolean): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from("conversations")
        .update({ is_saved: isSaved })
        .eq("id", convId)
        .eq("user_id", userId);
      if (error) throw error;
    } else {
      const db = getDb();
      const conv = db.conversations.find(c => c.id === convId && c.user_id === userId);
      if (conv) {
        conv.is_saved = isSaved;
        saveDb(db);
      }
    }
  },

  async getUserStreak(userId: string): Promise<{ streak_count: number; streak_last_date: string; streak_history: string[] }> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("user_streaks")
          .select("streak_count, streak_last_date, streak_history")
          .eq("user_id", userId)
          .single();
        if (data && !error) {
          return {
            streak_count: data.streak_count || 0,
            streak_last_date: data.streak_last_date || "",
            streak_history: Array.isArray(data.streak_history) ? data.streak_history : []
          };
        }
      } catch (e) {
        console.warn("Error fetching user_streaks from Supabase:", e);
      }
    }
    
    const db = getDb();
    if (!db.userStreaks) db.userStreaks = {};
    const record = db.userStreaks[userId];
    if (record) {
      return {
        streak_count: record.streak_count || 0,
        streak_last_date: record.streak_last_date || "",
        streak_history: Array.isArray(record.streak_history) ? record.streak_history : []
      };
    }
    return { streak_count: 0, streak_last_date: "", streak_history: [] };
  },

  async saveUserStreak(
    userId: string,
    streakCount: number,
    lastDate: string,
    history: string[]
  ): Promise<void> {
    if (supabase) {
      try {
        await supabase
          .from("user_streaks")
          .upsert({
            user_id: userId,
            streak_count: streakCount,
            streak_last_date: lastDate,
            streak_history: history,
            updated_at: new Date().toISOString()
          });
      } catch (err) {
        console.warn("Supabase user_streaks upsert warning:", err);
      }
    }

    const db = getDb();
    if (!db.userStreaks) db.userStreaks = {};
    db.userStreaks[userId] = {
      streak_count: streakCount,
      streak_last_date: lastDate,
      streak_history: history
    };
    saveDb(db);
  },

  async getApiKeys(userId: string): Promise<any[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, user_id, name, key_prefix, created_at, last_used_at, revoked_at, expires_at, rate_limit_rpm, monthly_credit_limit, scopes")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const db = getDb();
      if (!db.apiKeys) db.apiKeys = [];
      return db.apiKeys
        .filter((k: any) => k.user_id === userId)
        .map(({ key_hash, ...safe }: any) => safe)
        .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
    }
  },

  async createApiKey(userId: string, name: string, scopes: string[] = ["solve:read", "chat:write"]): Promise<{ keyRecord: any; plaintextKey: string }> {
    const { plaintextKey, keyPrefix, keyHash } = generateApiKeySecret("qs_live_");
    const newRecord: any = {
      user_id: userId,
      name: name || "New API Key",
      key_prefix: keyPrefix,
      key_hash: keyHash,
      created_at: new Date().toISOString(),
      rate_limit_rpm: 60,
      monthly_credit_limit: 1000,
      scopes: scopes && scopes.length > 0 ? scopes : ["solve:read", "chat:write"]
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("api_keys")
        .insert(newRecord)
        .select("id, user_id, name, key_prefix, created_at, last_used_at, revoked_at, expires_at, rate_limit_rpm, monthly_credit_limit, scopes")
        .single();
      if (error) throw error;
      return { keyRecord: data, plaintextKey };
    } else {
      const db = getDb();
      if (!db.apiKeys) db.apiKeys = [];
      const id = "key_" + Math.random().toString(36).substring(2, 11);
      const fullRecord = { id, ...newRecord };
      db.apiKeys.push(fullRecord);
      saveDb(db);
      const { key_hash, ...safeKeyRecord } = fullRecord;
      return { keyRecord: safeKeyRecord, plaintextKey };
    }
  },

  async revokeApiKey(userId: string, keyId: string): Promise<boolean> {
    const revokedAt = new Date().toISOString();
    if (supabase) {
      const { error } = await supabase
        .from("api_keys")
        .update({ revoked_at: revokedAt })
        .eq("id", keyId)
        .eq("user_id", userId);
      return !error;
    } else {
      const db = getDb();
      if (!db.apiKeys) db.apiKeys = [];
      const key = db.apiKeys.find((k: any) => k.id === keyId && k.user_id === userId);
      if (key) {
        key.revoked_at = revokedAt;
        saveDb(db);
        return true;
      }
      return false;
    }
  }
};
