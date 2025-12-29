
export const exportToSVG = (elementId: string, fileName: string) => {
  const container = document.getElementById(elementId);
  if (!container) {
    alert('عنصر مورد نظر یافت نشد.');
    return;
  }

  // این مقادیر باید با مقادیر موجود در FamilyTreeView.tsx هماهنگ باشند
  // CANVAS_CENTER_X = 5000, CANVAS_CENTER_Y = 1500
  const CANVAS_CENTER_X = 5000;
  const CANVAS_CENTER_Y = 1500;

  // 1. یافتن تمام نودها بر اساس ID
  // استفاده از inline styles برای محاسبه موقعیت دقیق بدون وابستگی به زوم صفحه
  const nodeWrappers = container.querySelectorAll('[id^="node-container-"]');
  if (nodeWrappers.length === 0) {
      alert("هیچ داده‌ای برای خروجی یافت نشد.");
      return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  nodeWrappers.forEach((el) => {
    const htmlEl = el as HTMLElement;
    
    // خواندن موقعیت Left و Top از استایل (مثلاً "123px")
    const xRel = parseFloat(htmlEl.style.left || '0');
    const yRel = parseFloat(htmlEl.style.top || '0');
    
    // ابعاد واقعی نود (بدون اسکیل زوم)
    const w = htmlEl.offsetWidth;
    const h = htmlEl.offsetHeight;

    // محاسبه گوشه‌های نود در سیستم مختصات کانتینر اصلی
    // نود در (xRel, yRel) مرکزیت دارد و transform(-50%, -50%) شده است
    // کانتینر والد هم به اندازه (CANVAS_CENTER_X, CANVAS_CENTER_Y) جابجا شده است
    
    // موقعیت گوشه بالا-چپ نسبت به مرکز نود
    const leftLocal = xRel - w / 2;
    const topLocal = yRel - h / 2;
    
    // موقعیت مطلق نسبت به گوشه بالا-چپ کانتینر اصلی (0,0)
    const absLeft = CANVAS_CENTER_X + leftLocal;
    const absTop = CANVAS_CENTER_Y + topLocal;
    
    const absRight = absLeft + w;
    const absBottom = absTop + h;

    if (absLeft < minX) minX = absLeft;
    if (absTop < minY) minY = absTop;
    if (absRight > maxX) maxX = absRight;
    if (absBottom > maxY) maxY = absBottom;
  });

  // افزودن حاشیه (Padding) برای جلوگیری از بریده شدن سایه‌ها یا خطوط
  const PADDING = 100;
  minX -= PADDING;
  minY -= PADDING;
  maxX += PADDING;
  maxY += PADDING;

  const width = maxX - minX;
  const height = maxY - minY;

  if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
      alert("خطا در محاسبه ابعاد تصویر.");
      return;
  }

  // 2. کلون کردن کانتینر برای قرار دادن در SVG
  const clone = container.cloneNode(true) as HTMLElement;
  
  // 3. جابجایی کلون به طوری که ناحیه محاسبه شده در (0,0) قرار گیرد
  // کانتینر اصلی 10000x10000 است، ما آن را جابجا می‌کنیم تا minX, minY روی 0,0 بیفتد
  clone.style.transform = `translate(${-minX}px, ${-minY}px)`;
  
  // تنظیم ابعاد و پوزیشن برای اطمینان از رندر صحیح
  clone.style.width = "10000px";
  clone.style.height = "10000px";
  clone.style.position = "absolute";
  clone.style.top = "0";
  clone.style.left = "0";
  clone.style.margin = "0";

  // 4. ساخت المان SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width.toString());
  svg.setAttribute("height", height.toString());
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  // 5. جمع‌آوری استایل‌ها
  const styleElement = document.createElement("style");
  let cssText = "";
  
  Array.from(document.styleSheets).forEach(sheet => {
    try {
        if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach(rule => {
                cssText += rule.cssText + "\n";
            });
        }
    } catch (e) {
        console.warn("CORS restricted stylesheet", e);
    }
  });

  // افزودن استایل‌های حیاتی
  cssText += `
    .tree-node-card { box-sizing: border-box; }
    div { box-sizing: border-box; }
    * { font-family: 'Vazirmatn', sans-serif; }
    path { stroke-linecap: round; stroke-linejoin: round; }
  `;
  
  styleElement.textContent = cssText;
  svg.appendChild(styleElement);

  // 6. ایجاد ForeignObject
  const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
  foreignObject.setAttribute("width", "100%");
  foreignObject.setAttribute("height", "100%");
  foreignObject.setAttribute("x", "0");
  foreignObject.setAttribute("y", "0");
  foreignObject.setAttribute("externalResourcesRequired", "true");

  const divWrapper = document.createElement("div");
  divWrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  divWrapper.style.width = `${width}px`;
  divWrapper.style.height = `${height}px`;
  divWrapper.style.overflow = "hidden";
  divWrapper.style.position = "relative";
  
  divWrapper.appendChild(clone);
  foreignObject.appendChild(divWrapper);
  svg.appendChild(foreignObject);

  // 7. سریال‌سازی و دانلود
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svg);
  
  // اصلاح نیم‌اسپیس برای سازگاری بهتر
  if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
