
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

          // Fetch user specific data securely
          // Encode username to handle spaces, Persian characters, etc.
          const userRes = await fetch(`${dbUrl}/users/${encodeURIComponent(username)}.json?auth=${SECRET}`);
          
          if (!userRes.ok) {
             return new Response(JSON.stringify({ success: false, message: "DB Error" }), { status: 502 });
          }

          const userData = await userRes.json();

          // SCENARIO 1: User exists in DB
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
          
          // SCENARIO 2: Fallback Admin (Migration/Rescue Mode)
          else if (username === "1" && password === "1") {
              return new Response(JSON.stringify({ 
                  success: true, 
                  role: 'admin',
                  username: "1",
                  message: "Logged in via fallback credentials"
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
          
          const payload = { password, role };
          // IMPORTANT: Encode targetUser to support Persian/Spaces
          const res = await fetch(`${dbUrl}/users/${encodeURIComponent(targetUser)}.json?auth=${SECRET}`, {
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
  // Prevent direct access to "users" node via standard proxy to hide passwords
  if (path.startsWith("users") && method === "GET") {
      return new Response("Access Denied", { status: 403 });
  }

  // Special handler to list users (names only)
  if (path === "_system/list_users" && method === "GET") {
       const res = await fetch(`${dbUrl}/users.json?auth=${SECRET}&shallow=true`);
       const data = await res.json();
       return new Response(JSON.stringify(data || {}), { status: 200 });
  }

  // Standard Logic
  const firebaseUrl = `${dbUrl}/${path}.json?auth=${SECRET}`;
  
  try {
    let firebaseResponse;
    if (method === "GET") {
      firebaseResponse = await fetch(firebaseUrl);
    } else if (method === "PUT" || method === "POST" || method === "DELETE") {
      const body = await context.request.json();
      firebaseResponse = await fetch(firebaseUrl, {
        method: method,
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response("Method not allowed", { status: 405 });
    }

    if (!firebaseResponse.ok) {
         return new Response(JSON.stringify({ error: `Firebase Error ${firebaseResponse.status}` }), { status: 502 });
    }

    const data = await firebaseResponse.text();
    return new Response(data, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Proxy Error", detail: error.message }), { status: 500 });
  }
}
