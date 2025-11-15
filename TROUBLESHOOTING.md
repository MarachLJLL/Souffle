# Troubleshooting Guide

If the product page shows "Loading..." or errors and works on one device but not others, follow these steps:

## Quick Fixes

### 1. Clear Browser Cache
- **Windows/Linux:** Press `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** Press `Cmd + Shift + R`
- Or clear cache manually: Settings → Privacy → Clear browsing data

### 2. Check Browser Console
1. Open the product page
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Look for errors (they'll be in red)
5. Share the error messages with the team

### 3. Verify Server Setup
Make sure you're using a web server, not opening files directly:

**Option A: Use the provided server script**
```bash
python serve.py
```
Then open: `http://localhost:8000/product.html?id=1`

**Option B: Use Python's built-in server**
```bash
cd frontend
python -m http.server 8000
```
Then open: `http://localhost:8000/product.html?id=1`

**Option C: Use Node.js http-server**
```bash
cd frontend
npx http-server -p 8000
```

### 4. Verify File Structure
Make sure your directory structure looks like this:
```
project-root/
  ├── database/
  │   ├── products.json
  │   ├── images/
  │   └── glbs/
  └── frontend/
      ├── product.html
      ├── product.js
      ├── index.html
      └── script.js
```

### 5. Check File Permissions
Make sure all files are readable and `products.json` exists:
```bash
# Windows PowerShell
Test-Path database/products.json

# Mac/Linux
ls -la database/products.json
```

### 6. Check Network Tab
1. Open Developer Tools (`F12`)
2. Go to **Network** tab
3. Refresh the page
4. Look for `products.json` - check if it:
   - Shows status 200 (success) or 404 (not found)
   - Shows the correct path it's trying to load

## Common Issues

### Issue: "CORS Error" or "file:// protocol"
**Solution:** You're opening the HTML file directly. Use a web server (see step 3 above).

### Issue: 404 Error for products.json
**Solution:** 
- Check that `database/products.json` exists
- Verify you're running the server from the correct directory
- Check the console for the exact path it's trying to load

### Issue: Page shows "Loading..." forever
**Solution:**
- Check browser console for errors
- Verify `products.json` is valid JSON
- Check that the product ID in the URL exists in `products.json`

### Issue: Works on one device but not another
**Solution:**
- Clear browser cache on the affected device
- Check if both are using the same server setup
- Verify both have the latest code (pull latest changes)
- Check browser console for different errors

## Getting Help

When asking for help, please provide:
1. Browser and version (Chrome, Firefox, Safari, etc.)
2. Error messages from the console (F12 → Console tab)
3. Network requests (F12 → Network tab → look for products.json)
4. How you're serving the files (which server method)
5. Screenshot of the error (if visible on page)

