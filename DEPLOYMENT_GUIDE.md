# Complete Deployment Guide

This guide will get your ChatRoom app running 24/7 on the cloud with Render + Vercel + Upstash Redis.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Vercel)      Backend (Render)  Database (Upstash)
│  konnectroom.vercel.app → chatroom.render.com → Redis
│  (HTTPS)                (HTTPS)                (HTTPS)
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Set Up Upstash Redis (Database)

1. Go to [upstash.com](https://upstash.com)
2. Sign up / Log in
3. Click "Create Database"
4. Select free tier
5. Choose region closest to you
6. Copy the **Redis URL** (looks like: `rediss://default:xxxxx@xxxxx.upstash.io:6379`)
7. **Save this URL** - you'll need it for Render

---

## Step 2: Deploy Backend on Render

### Prerequisites:
- GitHub account
- GitHub repo with your code (or let me help push it)

### Steps:

1. **Ensure code is on GitHub**
   - Your repo: `https://github.com/sakethalways/chattingroom`
   - If not accessible yet, we'll fix this

2. **Go to Render.com**
   - Sign up with GitHub
   - Click "New"
   - Select "Web Service"

3. **Connect GitHub Repository**
   - Authorize GitHub access
   - Select `chattingroom` repository
   - Connect

4. **Configure the Service**

   | Field | Value |
   |-------|-------|
   | **Name** | `chatroom` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Plan** | Free (auto-suspend after inactivity) |

5. **Add Environment Variable**
   - Click "Advanced"
   - Under "Environment Variables", click "Add"
   - **Key:** `REDIS_URL`
   - **Value:** (Paste your Upstash Redis URL)
   - Click "Add"

6. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - You'll get a URL like: `https://chatroom-abc123.onrender.com`
   - **Save this URL**

---

## Step 3: Update Frontend Configuration

Your frontend (in `index.html`) has a configuration section:

```javascript
window.APP_CONFIG = {
  SERVER_URL: null // Set to Render URL when deployed
};
```

### Option A: Update Locally (If re-deploying)

In `index.html`, find line with `window.APP_CONFIG` and change to:

```javascript
window.APP_CONFIG = {
  SERVER_URL: 'https://chatroom-abc123.onrender.com'
};
```

Replace `chatroom-abc123.onrender.com` with your actual Render URL.

Then commit and push to GitHub:
```bash
git add .
git commit -m "chore: update backend URL for production"
git push origin main
```

### Option B: Leave it Auto-Detect (If on same domain)

If your frontend and backend will be on the same Render domain, leave it as `null` and the app will auto-detect.

---

## Step 4: Deploy Frontend on Vercel

1. **Go to Vercel.com**
   - Sign up with GitHub
   - Click "New Project"

2. **Import Repository**
   - Select `chattingroom` repository
   - Click "Import"

3. **Configure Project**
   - **Framework:** Other (since it's vanilla HTML/CSS/JS)
   - **Root Directory:** ./
   - **Build Command:** (leave empty)

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment
   - You'll get URL like: `https://konnectroom.vercel.app`

---

## Step 5: Verify Everything Works

1. **Open your Vercel URL** in a browser
2. **Create a room**
3. **Get the room code**
4. **Open in incognito/private window** (or different browser)
5. **Join the room**
6. **Send messages**
7. **Should see in real-time** ✅

---

## If You Get Errors

### Error: "Failed to fetch" or "Network Error"

**Cause:** Frontend can't reach backend

**Fix:**
```javascript
// In index.html, manually set the server URL:
window.APP_CONFIG = {
  SERVER_URL: 'https://your-render-url.onrender.com'
};
```

### Error: "Room not found" immediately

**Cause:** Redis connection issue

**Fix:**
1. Check Render logs: Dashboard → chatroom service → Logs
2. Verify `REDIS_URL` is set correctly
3. Make sure URL is copied completely

### Error: Render app went to sleep

**Cause:** Free tier auto-suspends after 15 minutes inactivity

**Fix:**
- Upgrade to paid plan for always-on
- Or redeploy when you need it

---

## Local Testing (Before Deployment)

Test locally first to make sure everything works:

```bash
cd chatroom
npm install
node server.js
```

Then open: `http://localhost:3000`

---

## Summary

✅ Backend ready on GitHub  
✅ Database ready with Upstash Redis  
✅ Frontend auto-detects local vs deployed  
✅ Can deploy independently  

**Next Steps:**
1. Fix GitHub authentication (if needed)
2. Deploy backend on Render
3. Update frontend URL
4. Deploy frontend on Vercel
5. Test everything!

---

**Questions?** Check the browser console (F12) for errors or check the logs on Render/Vercel dashboards.
