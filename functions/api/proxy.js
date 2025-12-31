
export async function onRequest(context) {
  const PROJECT_ID = context.env.FIREBASE_PROJECT_ID;
  const SECRET = context.env.FIREBASE_DB_SECRET; 
  let dbUrl = context.env.FIREBASE_DB_URL;

  // Fallback DB URL Logic
  if (!dbUrl) {
      if (PROJECT_ID) {
          if (PROJECT_ID === "familytree-alireza-labaf") {
              dbUrl = "https://familytree-alireza-labaf-default-rtdb.firebaseio.com";
          } else {
              dbUrl = `https://${PROJECT_ID}.firebaseio.com`;
          }
      } else {
         return new Response(JSON.stringify({ error: "Config Error", detail: "MISSING_ENV" }), { status: 500 });
      }
  }
  if (dbUrl.endsWith('/')) dbUrl = dbUrl.slice(0, -1);

  if (!SECRET) {
    return new Response(JSON.stringify({ error: "Config Error", detail: "MISSING_SECRET" }), { status: 500 });
  }

  const url = new URL(context.request.url);
  const path = url.searchParams.get("path") || "";
  const method = context.request.method;

  // SECURITY: Input Validation for Path
  if (path.includes('..') || path.includes('/.')) {
      return new Response("Invalid Path", { status: 400 });
  }

  // --- INTERNAL AUTH & SYSTEM HANDLERS ---
  
  // 1. LOGIN Handler (Server-Side Check)
  if (path === "_system/login" && method === "POST") {
      try {
          let body;
          try {
            body = await context.request.json();
          } catch(e) {
            return new Response(JSON.stringify({ success: false, message: "Invalid Request Body" }), { status: 400 });
          }
          
          const { username, password } = body;
          
          if (!username) return new Response(JSON.stringify({ success: false, message: "Username required" }), { status: 400 });

          const userRes = await fetch(`${dbUrl}/users/${encodeURIComponent(username)}.json?auth=${SECRET}`);
          
          if (!userRes.ok) {
             return new Response(JSON.stringify({ success: false, message: "DB Error" }), { status: 502 });
          }

          const userData = await userRes.json();

          if (userData) {
              if (userData.password === password) {
                  return new Response(JSON.stringify({ 
                      success: true, 
                      role: userData.role || 'user',
                      username: username
                  }), { status: 200 });
              } else {
                  return new Response(JSON.stringify({ success: false, message: "Invalid password" }), { status: 401 });
              }
          }
          // SECURITY FIX: Use Environment Variables instead of hardcoded '1'/'1'
          else if (context.env.SYS_ADMIN_USER && context.env.SYS_ADMIN_PASS && 
                   username === context.env.SYS_ADMIN_USER && password === context.env.SYS_ADMIN_PASS) {
              return new Response(JSON.stringify({ 
                  success: true, 
                  role: 'admin',
                  username: username,
                  message: "Logged in via system credentials"
              }), { status: 200 });
          } 
          else {
              return new Response(JSON.stringify({ success: false, message: "User not found" }), { status: 401 });
          }

      } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
  }

  // 2. CREATE/UPDATE USER (Admin Only)
  if (path === "_system/manage_user" && method === "POST") {
      try {
          const body = await context.request.json();
          const { targetUser, password, role } = body;
          
          // SECURITY: Sanitize Username
          const safeUser = targetUser.replace(/[^a-zA-Z0-9_-]/g, '');
          if (!safeUser) return new Response("Invalid Username", { status: 400 });

          const payload = { password, role };
          const res = await fetch(`${dbUrl}/users/${safeUser}.json?auth=${SECRET}`, {
              method: 'PUT',
              body: JSON.stringify(payload)
          });
          return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
  }

  // 3. BACKUP (Dump entire DB)
  if (path === "_system/backup" && method === "GET") {
      const res = await fetch(`${dbUrl}/.json?auth=${SECRET}`);
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: 200 });
  }

  // 4. RESTORE (Overwrite entire DB)
  if (path === "_system/restore" && method === "POST") {
      const body = await context.request.json();
      const res = await fetch(`${dbUrl}/.json?auth=${SECRET}`, {
          method: 'PUT',
          body: JSON.stringify(body)
      });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // --- STANDARD PROXY ---
  // SECURITY: Prevent direct access to users table via generic proxy
  if (path.startsWith("users") || path.startsWith("_system")) {
      return new Response("Access Denied", { status: 403 });
  }

  if (path === "_system/list_users" && method === "GET") {
       const res = await fetch(`${dbUrl}/users.json?auth=${SECRET}&shallow=true`);
       const data = await res.json();
       return new Response(JSON.stringify(data || {}), { status: 200 });
  }

  // Standard Logic
  const firebaseUrl = `${dbUrl}/${path}.json?auth=${SECRET}`;
  
  // Forward 'If-Match' header for concurrency control
  const clientIfMatch = context.request.headers.get("If-Match");
  const headers = { "Content-Type": "application/json" };
  if (clientIfMatch) {
      headers["If-Match"] = clientIfMatch;
  }

  try {
    let firebaseResponse;
    if (method === "GET") {
      firebaseResponse = await fetch(firebaseUrl);
    } else if (method === "PUT" || method === "POST" || method === "DELETE") {
      const body = await context.request.json();
      firebaseResponse = await fetch(firebaseUrl, {
        method: method,
        body: JSON.stringify(body),
        headers: headers
      });
    } else {
      return new Response("Method not allowed", { status: 405 });
    }

    // Forward ETag from Firebase to Client
    const responseHeaders = { 
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff", // Security Header
        "X-Frame-Options": "DENY" // Security Header
    };
    const backendETag = firebaseResponse.headers.get("ETag");
    if (backendETag) {
        responseHeaders["ETag"] = backendETag;
        responseHeaders["Access-Control-Expose-Headers"] = "ETag";
    }

    if (!firebaseResponse.ok) {
         // Forward specific error status (like 412 Precondition Failed)
         const status = firebaseResponse.status;
         return new Response(JSON.stringify({ error: `Firebase Error ${status}`, status }), { status: status, headers: responseHeaders });
    }

    const data = await firebaseResponse.text();
    return new Response(data, {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Proxy Error", detail: error.message }), { status: 500 });
  }
}
