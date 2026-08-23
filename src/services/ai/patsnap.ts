export interface PatentResult {
  title: string;
  patentNo: string;
  assignees: string[];
  abstract: string;
  applicationDate?: string;
  publicationDate?: string;
}

export interface PatsnapSearchResponse {
  success: boolean;
  results: PatentResult[];
  error?: string;
  configError?: boolean;
}

/**
 * Service to connect to Patsnap Open Platform / Eureka APIs.
 * Patsnap documentation outlines that the Authorization header must be:
 * Bearer <PATSNAP_API_KEY>
 * and requests must be JSON payloads.
 */
export async function searchPatsnap(queryText: string, limit = 5): Promise<PatsnapSearchResponse> {
  const apiKey = process.env.PATSNAP_API_KEY;

  if (!apiKey) {
    console.warn("Patsnap Eureka API: PATSNAP_API_KEY is not configured.");
    return {
      success: false,
      results: [],
      error: "Patsnap API is not configured. Add PATSNAP_API_KEY to your environment variables.",
      configError: true
    };
  }

  try {
    // According to Patsnap Open Platform spec, the endpoint for query search is:
    // POST https://connect.patsnap.com/search/patent/query-search-patent/v2
    const response = await fetch("https://connect.patsnap.com/search/patent/query-search-patent/v2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query_text: queryText,
        limit: limit
      }),
      // Bounded timeout so it doesn't hang the app
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Patsnap API error: ${response.status} ${response.statusText}`, errorText);
      return {
        success: false,
        results: [],
        error: `Patsnap API returned code ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    
    // Parse the standard response structure from Patsnap API.
    // If the format differs slightly, map it defensively.
    const rawPatents = data?.data?.patents || data?.patents || [];
    
    const results: PatentResult[] = rawPatents.map((item: any) => ({
      title: item.title || item.title_en || "Untitled Patent",
      patentNo: item.patent_no || item.pn || "Unknown Patent No",
      assignees: Array.isArray(item.assignee) ? item.assignee : (item.assignee ? [item.assignee] : []),
      abstract: item.abstract || item.abstract_en || "No abstract available.",
      applicationDate: item.app_date || item.ad,
      publicationDate: item.pub_date || item.pd
    }));

    return {
      success: true,
      results
    };
  } catch (err: any) {
    console.error("Patsnap service connection failed:", err);
    return {
      success: false,
      results: [],
      error: err?.message || "An unexpected error occurred while contacting Patsnap services."
    };
  }
}
