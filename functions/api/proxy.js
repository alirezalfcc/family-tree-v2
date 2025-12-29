
export async function onRequest(context) {
  // دریافت شناسه پروژه و سکرت از متغیرهای محیطی کلاودفلر
  const FIREBASE_PROJECT_ID = context.env.FIREBASE_PROJECT_ID;
  const FIREBASE_SECRET = context.env.FIREBASE_DB_SECRET; 

  // اگر کاربر آدرس کامل دیتابیس را داده بود (برای ریجن‌های غیر آمریکا)
  let dbUrl = context.env.FIREBASE_DB_URL;

  if (!dbUrl) {
      if (!FIREBASE_PROJECT_ID) {
        return new Response(JSON.stringify({ 
            error: "Server Configuration Error", 
            detail: "Missing FIREBASE_PROJECT_ID in Cloudflare Settings." 
        }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
      // پیش‌فرض: سرور آمریکا
      dbUrl = `https://${FIREBASE_PROJECT_ID}.firebaseio.com`;
  }

  // حذف اسلش آخر اگر کاربر وارد کرده باشد
  if (dbUrl.endsWith('/')) dbUrl = dbUrl.slice(0, -1);

  if (!FIREBASE_SECRET) {
    return new Response(JSON.stringify({ 
        error: "Server Configuration Error", 
        detail: "Missing FIREBASE_DB_SECRET in Cloudflare Settings." 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const url = new URL(context.request.url);
  const dbPath = url.searchParams.get("path") || ""; 
  
  // ساخت URL نهایی فایربیس به همراه سکرت
  const firebaseUrl = `${dbUrl}/${dbPath}.json?auth=${FIREBASE_SECRET}`;

  const method = context.request.method;

  try {
    let firebaseResponse;

    if (method === "GET") {
      firebaseResponse = await fetch(firebaseUrl);
    } else if (method === "PUT" || method === "POST") {
      const body = await context.request.json();
      
      firebaseResponse = await fetch(firebaseUrl, {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response("Method not allowed", { status: 405 });
    }

    if (!firebaseResponse.ok) {
         const errorText = await firebaseResponse.text();
         let detail = errorText;
         
         if (firebaseResponse.status === 401) detail = "Unauthorized: Check your FIREBASE_DB_SECRET.";
         if (firebaseResponse.status === 404) detail = "Database Not Found: Check FIREBASE_PROJECT_ID or Create Realtime Database in Firebase Console.";

         return new Response(JSON.stringify({ 
             error: `Firebase Error ${firebaseResponse.status}`, 
             detail: detail 
         }), {
            status: firebaseResponse.status,
            headers: { "Content-Type": "application/json" }
         });
    }

    const data = await firebaseResponse.text();
    
    return new Response(data, {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Proxy Execution Error", detail: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
