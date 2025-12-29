
export async function onRequest(context) {
  // 1. دریافت متغیرهای محیطی
  const PROJECT_ID = context.env.FIREBASE_PROJECT_ID;
  const SECRET = context.env.FIREBASE_DB_SECRET; 
  let dbUrl = context.env.FIREBASE_DB_URL;

  // 2. تنظیم آدرس دیتابیس (Fallback هوشمند)
  if (!dbUrl) {
      if (PROJECT_ID) {
          // اگر کاربر آدرس کامل نداده بود، سعی می‌کنیم آدرس صحیح را بسازیم
          // بررسی می‌کنیم آیا پروژه کاربر همان پروژه‌ای است که در چت اعلام شده
          if (PROJECT_ID === "familytree-alireza-labaf") {
              dbUrl = "https://familytree-alireza-labaf-default-rtdb.firebaseio.com";
          } else {
              // پیش‌فرض قدیمی
              dbUrl = `https://${PROJECT_ID}.firebaseio.com`;
          }
      } else {
         return new Response(JSON.stringify({ 
            error: "Config Error", 
            detail: "MISSING_ENV: FIREBASE_PROJECT_ID or FIREBASE_DB_URL not set in Cloudflare." 
        }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
  }

  // حذف اسلش آخر احتمالی
  if (dbUrl.endsWith('/')) dbUrl = dbUrl.slice(0, -1);

  if (!SECRET) {
    return new Response(JSON.stringify({ 
        error: "Config Error", 
        detail: "MISSING_ENV: FIREBASE_DB_SECRET not set in Cloudflare." 
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // 3. بررسی مسیر درخواست
  const url = new URL(context.request.url);
  const dbPath = url.searchParams.get("path") || ""; 
  
  // ساخت URL نهایی فایربیس
  const firebaseUrl = `${dbUrl}/${dbPath}.json?auth=${SECRET}`;

  // 4. لاگ برای دیباگ (در کنسول کلادفلر دیده می‌شود)
  // console.log(`Proxying to: ${dbUrl}/${dbPath}.json`);

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

    // 5. مدیریت خطاها
    if (!firebaseResponse.ok) {
         const errorText = await firebaseResponse.text();
         let detail = errorText;
         
         // تشخیص دقیق خطا
         if (firebaseResponse.status === 401) detail = "Unauthorized: Secret key is wrong.";
         if (firebaseResponse.status === 404) detail = "Firebase Database Not Found (Check URL).";

         // ما وضعیت را 502 برمی‌گردانیم تا کلاینت بداند مشکل از سمت سرور پروکسی نیست، بلکه از فایربیس است
         // مگر اینکه 401 باشد
         const statusToSend = firebaseResponse.status === 401 ? 401 : 502;

         return new Response(JSON.stringify({ 
             error: `Firebase Error ${firebaseResponse.status}`, 
             detail: detail,
             target: dbUrl // برای دیباگ کاربر
         }), {
            status: statusToSend,
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
    return new Response(JSON.stringify({ error: "Internal Proxy Error", detail: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
