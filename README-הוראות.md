# 📱 הפיכת Bari ל-PWA - מדריך התקנה

## מה אתה מקבל באפליקציה?
✅ אייקון על מסך הבית של הטלפון
✅ פתיחה במסך מלא (בלי שורת כתובת של הדפדפן)
✅ צבע theme יפה (כחול)
✅ עובד גם offline (קצת)
✅ מרגיש כמו אפליקציה אמיתית

---

## 📂 הקבצים בתיקייה:
1. `manifest.json` - הגדרות האפליקציה
2. `icon-192.png` - אייקון קטן (לאנדרואיד)
3. `icon-512.png` - אייקון גדול (לאנדרואיד וsploach screen)
4. `apple-touch-icon.png` - אייקון לאייפון (180x180)

---

## 🚀 שלבי ההתקנה ב-Next.js (Vercel)

### שלב 1: העתק את 4 הקבצים לתיקיית `public/` בפרויקט שלך
```
public/
  ├── manifest.json
  ├── icon-192.png
  ├── icon-512.png
  └── apple-touch-icon.png
```

### שלב 2: הוסף תגיות ל-`<head>`

**אם אתה משתמש ב-Next.js App Router** (קובץ `app/layout.tsx`):
```tsx
export const metadata = {
  title: "Bari - יחד לאורח חיים בריא",
  description: "עקבי אחרי התזונה, השתייה והספורט שלך",
  manifest: "/manifest.json",
  themeColor: "#1d4ed8",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bari",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};
```

**אם אתה משתמש ב-Pages Router** (קובץ `pages/_document.tsx` או `pages/_app.tsx`):
```tsx
import Head from "next/head";

<Head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#1d4ed8" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="Bari" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
</Head>
```

### שלב 3: Deploy ל-Vercel
```bash
git add .
git commit -m "Add PWA support"
git push
```
Vercel יבנה את זה אוטומטית.

---

## 📲 איך מתקינים מהטלפון?

### באנדרואיד (Chrome):
1. נכנסים ל-`bari-dun.vercel.app`
2. תופיע התראה אוטומטית "הוסף למסך הבית", או:
3. לוחצים על 3 הנקודות בפינה ← "הוסף למסך הבית"

### באייפון (Safari - חובה Safari!):
1. נכנסים ל-`bari-dun.vercel.app` ב-**Safari** (לא Chrome!)
2. לוחצים על כפתור השיתוף (⬆️) למטה
3. גוללים ולוחצים "הוסף למסך הבית"

---

## ✅ איך לבדוק שהכל עובד?
1. פתח את האתר במחשב ב-Chrome
2. F12 → Application → Manifest
3. תראה את כל ההגדרות
4. ב-Lighthouse - תן ציון PWA

---

## 💡 טיפים
- **חשוב:** האפליקציה תעבוד רק על HTTPS (Vercel נותן את זה אוטומטית ✅)
- אם אתה רוצה offline מלא - צריך service worker (אפשר להוסיף בהמשך)
- אם החלפת אייקון - תעדכן גרסה ב-manifest כדי שיעדכן

בהצלחה! 🎉
